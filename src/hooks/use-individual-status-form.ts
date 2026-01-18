import { useState, useEffect, useCallback } from 'react';
import { validateAndSplitPayload, decodeStatus, extractStatusUrls } from '../lib/encoding';
import { StatusPayload, AppStatus } from '../lib/types';
import { getAllTags, addCustomTag, isTagLabelTaken } from '../lib/tags';
import { saveDailyStatus, getLatestStatusDate, getAppsForDate } from '../lib/indexeddb';

export function useIndividualStatusForm() {
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [apps, setApps] = useState<AppStatus[]>([{ app: '', content: '<ul><li></li></ul>' }]);
  const [expandedApps, setExpandedApps] = useState<Set<number>>(new Set([0]));
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [currentUrlLength, setCurrentUrlLength] = useState<number>(0);
  const [statusLink, setStatusLink] = useState('');
  const [tagError, setTagError] = useState('');

  const validateTags = useCallback((currentApps: AppStatus[]) => {
    if (typeof window === 'undefined') return { valid: true };
    const parser = new DOMParser();

    for (const app of currentApps) {
      if (!app.content.trim() || app.content === '<ul><li></li></ul>') continue;

      const doc = parser.parseFromString(app.content, 'text/html');

      // 1. Check for any text content NOT inside a list item (ul/ol)
      const nonListItems = Array.from(doc.body.children).filter(el =>
        el.tagName !== 'UL' && el.tagName !== 'OL' && (el.textContent?.trim() || '') !== ''
      );

      if (nonListItems.length > 0) {
        return { valid: false, message: 'All status points must be in a Bullet Point or Numbered List.' };
      }

      // 2. Check for missing tags in actual list items
      const listItems = doc.querySelectorAll('li');
      if (listItems.length === 0 && app.content.trim().length > 0) {
        return { valid: false, message: 'All status points must be in a Bullet Point or Numbered List.' };
      }

      for (const li of Array.from(listItems)) {
        const text = li.textContent?.trim() || '';
        if (!text) continue;

        if (!/\[[A-Z\s]+\]/.test(text)) {
          return { valid: false, message: 'Every point must have a tag in brackets (e.g. [DONE], [IN PROGRESS]).' };
        }
      }
    }
    return { valid: true };
  }, []);

  useEffect(() => {
    const hasValidApps = apps.some(app => app.app.trim() && app.content.trim());

    if (name.trim() && hasValidApps) {
      const validation = validateTags(apps);
      if (!validation.valid) {
        setTagError(validation.message || 'Invalid format');
        setGeneratedUrls([]);
        setCurrentUrlLength(0);
        return;
      }
      setTagError('');

      const validApps = apps.filter(app => app.app.trim() && app.content.trim());
      // ... rest of logic

      if (validApps.length === 0) {
        setGeneratedUrls([]);
        return;
      }

      const payload: StatusPayload = {
        v: 2,
        name: name.trim(),
        date,
        apps: validApps,
        customTags: getAllTags().filter(t => t.isCustom)
      };

      const result = validateAndSplitPayload(payload);
      if (result.error) {
        setError(result.error);
        setGeneratedUrls([]);
        setCurrentUrlLength(0);
        return;
      }

      setError('');
      const fullUrls = result.urls.map(fragment =>
        `${window.location.origin}${window.location.pathname}${fragment}`
      );

      // Calculate total length across all URLs
      const totalLength = fullUrls.reduce((sum, url) => sum + url.length, 0);
      setCurrentUrlLength(totalLength);

      setGeneratedUrls(fullUrls);
    } else {
      setGeneratedUrls([]);
      setCurrentUrlLength(0);
    }
  }, [name, date, apps]);

  // When the user pastes a previously generated status link (or multiple),
  // decode it and populate the form so they can edit their earlier status.
  useEffect(() => {
    const raw = statusLink.trim();
    if (!raw) return;

    try {
      // Try to extract one or more status fragments from the pasted text
      const fragmentsFromHelper = extractStatusUrls(raw);

      let fragments = fragmentsFromHelper;

      // If helper didn't find anything, fall back to simple regex on the raw text
      if (!fragments || fragments.length === 0) {
        const regexMatches = raw.match(/#s=[^\s]+/g);
        if (regexMatches) {
          fragments = regexMatches;
        }
      }

      if (!fragments || fragments.length === 0) return;

      const payloads = fragments
        .map(fragment => decodeStatus(fragment))
        .filter((p): p is StatusPayload => !!p);

      if (payloads.length === 0) return;

      // Ensure all payloads are for the same person (case-insensitive name match)
      const uniqueNames = Array.from(
        new Set(
          payloads
            .map(p => (p.name || '').trim().toLowerCase())
            .filter(n => n.length > 0)
        )
      );

      if (uniqueNames.length > 1) {
        setError('These status links belong to different people. Please paste links for the same person only.');
        return;
      }

      setError('');
      const first = payloads[0];
      setName(first.name ?? '');
      const today = new Date().toISOString().split('T')[0];
      setDate(today);

      // Load Custom Tags from Payload if present (handling persistence across shares)
      payloads.forEach(p => {
        if (p.customTags && Array.isArray(p.customTags)) {
          p.customTags.forEach(tag => {
            if (tag && tag.label && tag.color) {
              // Only add if not exists
              if (!isTagLabelTaken(tag.label)) {
                addCustomTag(tag.label, tag.color);
              }
            }
          });
        }
      });

      // Merge applications from all payloads for this person.
      // This handles cases where the original status was split into
      // multiple URLs either by applications or by content parts.
      type MergedApp = { app: string; contents: string[] };
      const appMap = new Map<string, MergedApp>(); // key: normalized base app name
      const order: string[] = []; // preserve insertion order

      for (const payload of payloads) {
        for (const app of payload.apps || []) {
          const baseAppName = app.app.replace(/ \[Part \d+\]$/, ''); // strip " [Part N]"
          const key = baseAppName.toLowerCase().trim();

          if (!appMap.has(key)) {
            appMap.set(key, { app: baseAppName, contents: [] });
            order.push(key);
          }

          if (app.content && app.content.trim()) {
            appMap.get(key)!.contents.push(app.content);
          }
        }
      }

      const mergedApps: AppStatus[] = order.map(key => {
        const entry = appMap.get(key)!;
        return {
          app: entry.app,
          content: entry.contents.join('\n\n') || '<ul><li></li></ul>',
        };
      });

      const finalApps =
        mergedApps.length > 0
          ? mergedApps
          : [{ app: '', content: '<ul><li></li></ul>' }];

      setApps(finalApps);

      // Expand the first app by default
      const newExpanded = new Set<number>();
      if (finalApps.length > 0) {
        newExpanded.add(0);
      }
      setExpandedApps(newExpanded);
    } catch (err) {
      console.warn('Failed to process pasted status link(s):', err);
      setError('Something went wrong while reading that link. Please check the URL and try again.');
    }
  }, [statusLink]);

  const addApp = useCallback(() => {
    const newIndex = apps.length;
    setApps(prevApps => [...prevApps, { app: '', content: '<ul><li></li></ul>' }]);
    setExpandedApps(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      newExpanded.clear();
      newExpanded.add(newIndex);
      return newExpanded;
    });
  }, [apps.length]);

  const removeApp = useCallback((index: number) => {
    if (apps.length > 1) {
      setApps(prevApps => prevApps.filter((_, i) => i !== index));
      setExpandedApps(prevExpanded => {
        const newExpanded = new Set(prevExpanded);
        newExpanded.delete(index);
        const updatedExpanded = new Set<number>();
        newExpanded.forEach(i => {
          if (i > index) {
            updatedExpanded.add(i - 1);
          } else if (i < index) {
            updatedExpanded.add(i);
          }
        });
        // Ensure at least one app is expanded if it's not empty
        if (updatedExpanded.size === 0 && apps.length > 1) {
          updatedExpanded.add(0);
        }
        return updatedExpanded;
      });
    }
  }, [apps.length]);

  const toggleAppExpansion = useCallback((index: number) => {
    setExpandedApps(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.clear();
        newExpanded.add(index);
      }
      return newExpanded;
    });
  }, []);

  const updateApp = useCallback((index: number, field: keyof AppStatus, value: string) => {
    setApps(prevApps => {
      const newApps = [...prevApps];
      newApps[index] = { ...newApps[index], [field]: value };
      return newApps;
    });
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (generatedUrls.length === 0) return;

    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const baseLabel = name.trim()
      ? `${name.trim()} – ${date} ${timeLabel}`
      : `Status for ${date} ${timeLabel}`;

    // Plain-text version with labels so it's readable in non-rich editors
    const textContent = generatedUrls
      .map((url, index) =>
        generatedUrls.length > 1
          ? `${baseLabel} (Link ${index + 1}): ${url}`
          : `${baseLabel}: ${url}`
      )
      .join('\n\n');

    // Rich-text version for tools that support pasting HTML
    const htmlContent = generatedUrls
      .map((url, index) => {
        const label =
          generatedUrls.length > 1
            ? `${baseLabel} (Link ${index + 1})`
            : baseLabel;
        return `<a href="${url}">${label}</a>`;
      })
      .join('<br>');

    try {
      // Modern browsers with Clipboard API
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([item]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Save snapshot to IndexedDB
      const payload: StatusPayload = {
        v: 2,
        name: name.trim(),
        date,
        apps: apps.filter(app => app.app.trim() && app.content.trim()),
      };
      saveDailyStatus(payload).catch(err => console.error('Failed to save snapshot:', err));

    } catch (err) {
      // Fallback for older browsers or if Clipboard API fails
      console.warn("Rich text copy failed, falling back to plain text copy.", err);
      const textArea = document.createElement('textarea');
      textArea.value = textContent;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (copyErr) {
        console.error('Fallback plain text copy failed.', copyErr);
      }

      document.body.removeChild(textArea);
    }
  }, [generatedUrls, name, date, apps]);

  const loadYesterdayStatus = useCallback(async () => {
    try {
      const latestDate = await getLatestStatusDate();
      if (!latestDate) {
        alert('No previous status found.');
        return;
      }

      const payloads = await getAppsForDate(latestDate);
      if (payloads.length === 0) return;

      // Assuming all payloads on this date probably belong to the same user "session"
      // We take the name from the first one
      setName(payloads[0].name);

      // We set the date to TODAY, because we are "loading yesterday's status" to write TODAY's report
      // Wait, "Continue yesterday" usually means "Load what I wrote yesterday so I can edit it" or "Load yesterday's structure"?
      // Use requests "load yesterday". Usually means "Load the content from yesterday".
      // But if I load yesterday's content, the date should probably be today (for the new report) or yesterday?
      // If I'm "continuing", I usually want today's date but yesterday's *items* (maybe to mark them as done).
      // Let's default to TODAY's date, but populate with YESTERDAY's content.
      // That seems most useful for a "daily standup" workflow where you copy-paste-modify.
      setDate(new Date().toISOString().split('T')[0]);

      const newApps: AppStatus[] = payloads.flatMap(p => p.apps);
      setApps(newApps);

      // Expand all
      setExpandedApps(new Set(newApps.map((_, i) => i)));

    } catch (err) {
      console.error('Failed to load yesterday status:', err);
      alert('Failed to load status.');
    }
  }, []);

  const isValid = name.trim() && apps.some(app => app.app.trim() && app.content.trim()) && !error && !tagError;

  return {
    name, setName,
    date, setDate,
    apps, setApps,
    expandedApps, setExpandedApps,
    generatedUrls, setGeneratedUrls,
    copied, setCopied,
    error, setError,
    tagError,
    currentUrlLength, setCurrentUrlLength,
    statusLink, setStatusLink,
    addApp, removeApp, toggleAppExpansion, updateApp, copyToClipboard,
    isValid,
    loadYesterdayStatus,
  };
}
