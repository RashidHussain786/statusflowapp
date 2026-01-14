'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { encodeStatus, validateAndSplitPayload, decodeStatus, URL_PREFIX, extractStatusUrls } from '@/lib/encoding';
import { StatusPayload, AppStatus } from '@/lib/types';
import { loadCustomTags } from '@/lib/tags';

export function IndividualStatusForm() {
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [apps, setApps] = useState<AppStatus[]>([{ app: '', content: '<ul><li></li></ul>' }]);
  const [expandedApps, setExpandedApps] = useState<Set<number>>(new Set([0]));
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [currentUrlLength, setCurrentUrlLength] = useState<number>(0);
  const [statusLink, setStatusLink] = useState('');

  useEffect(() => {
    const hasValidApps = apps.some(app => app.app.trim() && app.content.trim());

    if (name.trim() && hasValidApps) {
      const validApps = apps.filter(app => app.app.trim() && app.content.trim());

      if (validApps.length === 0) {
        setGeneratedUrls([]);
        return;
      }

      const payload: StatusPayload = {
        v: 2,
        name: name.trim(),
        date,
        apps: validApps,
        // Don't include customTags in URL to keep it smaller
        // Tags will be resolved from localStorage when merging
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

  const addApp = () => {
    const newIndex = apps.length;
    setApps([...apps, { app: '', content: '<ul><li></li></ul>' }]);
    setExpandedApps(new Set([newIndex]));
  };

  const removeApp = (index: number) => {
    if (apps.length > 1) {
      setApps(apps.filter((_, i) => i !== index));
      const newExpanded = new Set(expandedApps);
      newExpanded.delete(index);
      const updatedExpanded = new Set<number>();
      newExpanded.forEach(i => {
        if (i > index) {
          updatedExpanded.add(i - 1);
        } else if (i < index) {
          updatedExpanded.add(i);
        }
      });
      setExpandedApps(updatedExpanded);
    }
  };

  const toggleAppExpansion = (index: number) => {
    const newExpanded = new Set(expandedApps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.clear();
      newExpanded.add(index);
    }
    setExpandedApps(newExpanded);
  };

  const updateApp = (index: number, field: keyof AppStatus, value: string) => {
    const newApps = [...apps];
    newApps[index] = { ...newApps[index], [field]: value };
    setApps(newApps);
  };

  const copyToClipboard = async () => {
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
  };

  const isValid = name.trim() && apps.some(app => app.app.trim() && app.content.trim()) && !error;

  return (
    <div className="max-w-none">
      <div className="mb-6 2xl:mb-8">
        <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight text-foreground mb-2">
          Create Your Status Link
        </h1>
        <p className="text-muted-foreground text-base 2xl:text-lg">
          Generate a shareable link containing your daily status updates. No account required.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="status-link-input" className="block text-sm font-medium text-muted-foreground mb-2">
          Or paste a status link to edit
        </label>
        <textarea
          id="status-link-input"
          value={statusLink}
          onChange={(e) => setStatusLink(e.target.value)}
          placeholder="Paste a previously generated status link here..."
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
          rows={2}
        />
      </div>


      <div className="bg-card border border-border rounded-lg p-4 2xl:p-6 shadow-sm mb-6 2xl:mb-8">
        <div className="flex items-center justify-between mb-3 2xl:mb-4">
          <h2 className="text-base 2xl:text-lg font-semibold text-card-foreground">Applications</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                id="name-inline"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name *"
                className={`px-3 py-1.5 text-sm border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${!name.trim()
                  ? 'border-destructive focus:ring-destructive/20'
                  : 'border-input focus:ring-ring'
                  }`}
                required
              />
              {!name.trim() && (
                <span className="absolute -top-1 -right-1 text-xs text-destructive font-medium">*</span>
              )}
            </div>
            <input
              id="date-inline"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            />
            <button
              onClick={copyToClipboard}
              disabled={generatedUrls.length === 0 || !name.trim()}
              title={!name.trim() ? 'Please enter your name first' : generatedUrls.length > 0 ? `Copy ${generatedUrls.length > 1 ? 'all shareable links' : 'shareable link'}` : 'Complete the form to generate link'}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${generatedUrls.length === 0 || !name.trim()
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : generatedUrls.length > 1 ? `Copy All Links (${generatedUrls.length})` : 'Copy Link'}
            </button>
            <button
              type="button"
              onClick={addApp}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Application
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {apps.map((app, index) => {
            const isExpanded = expandedApps.has(index);
            return (
              <div key={index} className="border border-border rounded-lg bg-muted/30 overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleAppExpansion(index)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title={isExpanded ? "Collapse application" : "Expand application"}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <input
                      type="text"
                      value={app.app}
                      onChange={(e) => updateApp(index, 'app', e.target.value)}
                      placeholder="Application name (e.g., Payments, Auth, Dashboard)"
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                    />
                  </div>
                  {apps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeApp(index)}
                      className="ml-3 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Remove application"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <RichTextEditor
                      value={app.content}
                      onChange={(value) => updateApp(index, 'content', value)}
                      placeholder="Describe your updates for this application..."
                      currentUrlLength={currentUrlLength}
                      urlCount={generatedUrls.length}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      <div className="bg-linear-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="text-lg">🔒</span>
          Privacy & Security
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>No backend storage required</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>No account or login needed</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>No analytics or tracking</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Works completely offline</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Data stays in URLs only</span>
          </li>
        </ul>
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Pro tip:</strong> Open DevTools → Network tab → you'll see zero requests. Your data never leaves your browser.
          </p>
        </div>
      </div>
    </div>
  );
}