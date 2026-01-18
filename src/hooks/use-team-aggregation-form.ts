import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { extractStatusUrls, decodeMultipleStatuses, URL_PREFIX } from '../lib/encoding';
import { MergeMode, NormalizedEntry } from '../lib/types';
import { EditorRef } from '../components/rich-text-editor';

export function useTeamAggregationForm() {
  const [urlsText, setUrlsText] = useState('');
  const [mergeMode, setMergeMode] = useState<MergeMode>('app-wise');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [showTagsInMerge, setShowTagsInMerge] = useState(false);
  const editorRef = useRef<EditorRef>(null);

  const processedData = useMemo(() => {
    const fragments = extractStatusUrls(urlsText);
    const entries = decodeMultipleStatuses(fragments);
    const invalidLines = urlsText.split('\n').filter(line => line.trim() && !line.includes(URL_PREFIX));

    const appMap = new Map<string, string>();
    entries.forEach(entry => {
      const lower = entry.app.toLowerCase().trim();
      if (!appMap.has(lower)) {
        appMap.set(lower, entry.app);
      }
    });
    const uniqueApps = Array.from(appMap.values()).sort((a, b) => a.localeCompare(b));

    return { fragments, entries, invalidLines, uniqueApps };
  }, [urlsText]);

  const cleanContentHtml = useCallback((html: string, showTags: boolean = true): string => {
    if (!html) return '';

    let cleaned = html
      .replace(/<\/?p[^>]*>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .trim();

    if (!showTags) {
      // Remove tag labels completely when not showing tags
      cleaned = cleaned.replace(/[[A-Z\s]+]/g, '');
    }
    // When showTags is true, keep the [TAG] patterns as-is
    // The VisualTagsExtension will style them in the editor

    if (!cleaned.trim()) return '';

    if (!cleaned.includes('<') && !cleaned.includes('>')) {
      cleaned = `<span>${cleaned}</span>`;
    }

    return cleaned;
  }, []);

  const generateOutput = useMemo(() => {
    const { entries } = processedData;

    if (entries.length === 0) return '';

    const filteredEntries = selectedApp === 'all'
      ? entries
      : entries.filter(entry => entry.app.toLowerCase().trim() === selectedApp.toLowerCase().trim());

    if (filteredEntries.length === 0) return '';

    if (mergeMode === 'app-wise') {
      const appGroups = filteredEntries.reduce((acc, entry) => {
        const appKey = entry.app.trim();
        const canonicalKey = Object.keys(acc).find(
          key => key.toLowerCase() === appKey.toLowerCase()
        ) || appKey;

        if (!acc[canonicalKey]) acc[canonicalKey] = [];
        acc[canonicalKey].push(entry);
        return acc;
      }, {} as Record<string, NormalizedEntry[]>);

      return Object.entries(appGroups)
        .map(([app, appEntries]) => {
          const personUpdates = appEntries
            .map(entry => `<li><strong>${entry.name}:</strong> ${cleanContentHtml(entry.content, showTagsInMerge)}</li>`)
            .join('');

          return `<h3>${app} Application:</h3><ul>${personUpdates}</ul>`;
        })
        .join('');
    } else {
      const personGroups = filteredEntries.reduce((acc, entry) => {
        if (!acc[entry.name]) acc[entry.name] = [];
        acc[entry.name].push(entry);
        return acc;
      }, {} as Record<string, NormalizedEntry[]>);

      return Object.entries(personGroups)
        .map(([person, personEntries]) => {
          const appUpdates = personEntries
            .map(entry => `<li><strong>${entry.app}:</strong> ${cleanContentHtml(entry.content, showTagsInMerge)}</li>`)
            .join('');

          return `<h3>${person}:</h3><ul>${appUpdates}</ul>`;
        })
        .join('');
    }
  }, [processedData, mergeMode, selectedApp, showTagsInMerge, cleanContentHtml]);

  useEffect(() => {
    if (generateOutput) {
      setEditableContent(generateOutput);
    }
  }, [generateOutput]);

  const getPlainText = useCallback((html: string): string => {
    if (typeof document === 'undefined') return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const convertToText = (element: Element, indent = ''): string => {
      let result = '';

      for (const child of element.children) {
        if (child.tagName === 'H3') {
          const text = child.textContent?.trim();
          if (text) {
            result += `\n${indent}${text}:\n`;
          }
        } else if (child.tagName === 'UL') {
          for (const li of child.children) {
            if (li.tagName === 'LI') {
              result += convertToText(li, indent);
            }
          }
        } else if (child.tagName === 'LI') {
          const hasNestedList = child.querySelector('ul, ol');
          if (hasNestedList) {
            let personName = '';
            let statusList = '';

            for (const liChild of child.children) {
              if (liChild.tagName === 'STRONG') {
                personName = liChild.textContent?.trim() || '';
              } else if (liChild.tagName === 'UL' || liChild.tagName === 'OL') {
                statusList = convertToText(liChild, indent);
              } else {
                const text = liChild.textContent?.trim();
                if (text) {
                  personName += (personName ? ' ' : '') + text;
                }
              }
            }

            if (personName) {
              result += `${indent}${personName}:\n${statusList}`;
            } else {
              result += statusList;
            }
          } else {
            const itemText = convertToText(child, '').trim();
            if (itemText) {
              result += `${indent}${itemText}\n`;
            }
          }
        } else if (child.tagName === 'P') {
          const text = child.textContent?.trim();
          if (text) {
            result += `${indent}${text}\n\n`;
          }
        } else if (child.tagName === 'STRONG' || child.tagName === 'B') {
          const text = child.textContent?.trim();
          if (text) {
            result += `**${text}** `;
          }
        } else if (child.tagName === 'EM' || child.tagName === 'I') {
          const text = child.textContent?.trim();
          if (text) {
            result += `*${text}* `;
          }
        } else {
          const text = child.textContent?.trim();
          if (text) {
            result += `${indent}${text} `;
          }
        }
      }

      return result;
    };

    return convertToText(tempDiv)
      .trim()
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');
  }, []);

  const removeStatusTags = useCallback((text: string): string => {
    return text.replace(/[[A-Z\s]+]/g, '');
  }, []);

  const copyToClipboard = useCallback(async () => {
    try {
      const editorElement = document.querySelector('.ProseMirror') as HTMLElement | null;
      if (editorElement) {
        let elementToCopy: HTMLElement = editorElement;
        let tempContainer: HTMLElement | null = null;
        if (!showTagsInMerge) {
          tempContainer = document.createElement('div');
          tempContainer.style.position = 'fixed';
          tempContainer.style.left = '-999999px';
          tempContainer.style.top = '-999999px';

          const cloned = editorElement.cloneNode(true) as HTMLElement;
          cloned.querySelectorAll('.visual-tag').forEach(el => el.remove());

          tempContainer.appendChild(cloned);
          document.body.appendChild(tempContainer);
          elementToCopy = cloned;
        }

        const range = document.createRange();
        range.selectNodeContents(elementToCopy);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        const successful = document.execCommand('copy');
        selection?.removeAllRanges();

        if (tempContainer) {
          document.body.removeChild(tempContainer);
        }

        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return;
        }
      }

      let textToCopy = editorRef.current ? editorRef.current.getText() : getPlainText(editableContent);
      if (!showTagsInMerge) {
        textToCopy = removeStatusTags(textToCopy);
      }
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Copy error:', err);
      try {
        let textToCopy = editorRef.current ? editorRef.current.getText() : getPlainText(editableContent);
        if (!showTagsInMerge) {
          textToCopy = removeStatusTags(textToCopy);
        }
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (clipboardErr) {
        console.error('Failed to copy text:', clipboardErr);
      }
    }
  }, [editableContent, getPlainText, removeStatusTags, showTagsInMerge]);


  const hasValidUrls = processedData.fragments.length > 0;
  const hasOutput = generateOutput.trim().length > 0;

  return {
    urlsText, setUrlsText,
    mergeMode, setMergeMode,
    selectedApp, setSelectedApp,
    copied, setCopied,
    editableContent, setEditableContent,
    showTagsInMerge, setShowTagsInMerge,
    editorRef,
    processedData,
    generateOutput,
    cleanContentHtml,
    getPlainText,
    removeStatusTags,
    copyToClipboard,
    hasValidUrls,
    hasOutput,
  };
}
