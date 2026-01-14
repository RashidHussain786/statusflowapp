'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import { extractStatusUrls, decodeMultipleStatuses, decodeStatus, URL_PREFIX } from '@/lib/encoding';
import { MergeMode, NormalizedEntry } from '@/lib/types';
import { RichTextEditor, EditorRef } from './rich-text-editor';

export function TeamAggregationForm() {
  const [urlsText, setUrlsText] = useState('');
  const [mergeMode, setMergeMode] = useState<MergeMode>('app-wise');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [showTagsInMerge, setShowTagsInMerge] = useState(false);
  const editorRef = useRef<EditorRef>(null);

  const previewRef = useRef<HTMLDivElement>(null);

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

  const cleanContentHtml = (html: string, showTags: boolean = true): string => {
    if (!html) return '';

    let cleaned = html
      .replace(/<\/?p[^>]*>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .trim();

    if (!showTags) {
      // Remove tag labels completely when not showing tags
      cleaned = cleaned.replace(/\[[A-Z\s]+\]\s*/g, '');
    }
    // When showTags is true, keep the [TAG] patterns as-is
    // The VisualTagsExtension will style them in the editor

    if (!cleaned.trim()) return '';

    if (!cleaned.includes('<') && !cleaned.includes('>')) {
      cleaned = `<span>${cleaned}</span>`;
    }

    return cleaned;
  };

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
            .map(entry => `<li><strong>${entry.name}:</strong> ${cleanContentHtml(entry.content, true)}</li>`)
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
            .map(entry => `<li><strong>${entry.app}:</strong> ${cleanContentHtml(entry.content, true)}</li>`)
            .join('');

          return `<h3>${person}:</h3><ul>${appUpdates}</ul>`;
        })
        .join('');
    }
  }, [processedData, mergeMode, selectedApp]);

  useEffect(() => {
    if (generateOutput) {
      setEditableContent(generateOutput);
    }
  }, [generateOutput]);

  const getPlainText = (html: string): string => {
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
  };

  const copyToClipboard = async () => {
    try {
      const editorElement = document.querySelector('[data-radix-editor-content]') as HTMLElement;
      if (editorElement) {
        const range = document.createRange();
        range.selectNodeContents(editorElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        const successful = document.execCommand('copy');
        selection?.removeAllRanges();

        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return;
        }
      }

      const textToCopy = editorRef.current ? editorRef.current.getText() : getPlainText(editableContent);
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
        const textToCopy = editorRef.current ? editorRef.current.getText() : getPlainText(editableContent);
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (clipboardErr) {
        console.error('Failed to copy text:', clipboardErr);
      }
    }
  };

  const downloadAsFile = () => {
    const blob = new Blob([generateOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-status-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasValidUrls = processedData.fragments.length > 0;
  const hasOutput = generateOutput.trim().length > 0;

  return (
    <div className="max-w-none">
      <div className="mb-6 2xl:mb-8">
        <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight text-foreground mb-2">
          Generate Team Status Report
        </h1>
        <p className="text-muted-foreground text-base 2xl:text-lg">
          Combine multiple individual status links into a unified team report. Choose how to organize the information.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 2xl:p-6 shadow-sm mb-6 2xl:mb-8">
        <h2 className="text-base 2xl:text-lg font-semibold mb-3 2xl:mb-4 text-card-foreground">Status Links</h2>
        <div className="space-y-3">
          <textarea
            id="urls"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder="Paste individual status links here, one per line...&#10;&#10;Example:&#10;https://StatusFlowApp.app/#s=AbCxyz123...&#10;https://StatusFlowApp.app/#s=XyZ789..."
            className="w-full min-h-[105px] max-h-[126px] px-4 py-3 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none overflow-y-auto transition-colors"
          />
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">
                {processedData.fragments.length} valid link{processedData.fragments.length !== 1 ? 's' : ''} detected
              </p>
              {processedData.invalidLines.length > 0 && (
                <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span>⚠️</span>
                  {processedData.invalidLines.length} invalid line{processedData.invalidLines.length !== 1 ? 's' : ''} skipped
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 2xl:p-6 shadow-sm mb-6 2xl:mb-8">
        <div className="flex items-center justify-between mb-3 2xl:mb-4">
          <h2 className="text-base 2xl:text-lg font-semibold text-card-foreground">Team Status Report</h2>
          {hasOutput && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground">View:</label>
                  <select
                    value={selectedApp}
                    onChange={(e) => setSelectedApp(e.target.value)}
                    className="px-2 py-1 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="all">All Applications</option>
                    {processedData.uniqueApps.map(app => (
                      <option key={app} value={app}>{app}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mergeMode"
                      value="app-wise"
                      checked={mergeMode === 'app-wise'}
                      onChange={(e) => setMergeMode(e.target.value as MergeMode)}
                      className="text-primary focus:ring-primary border-input"
                    />
                    <span className="text-sm text-foreground">By App</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mergeMode"
                      value="person-wise"
                      checked={mergeMode === 'person-wise'}
                      onChange={(e) => setMergeMode(e.target.value as MergeMode)}
                      className="text-primary focus:ring-primary border-input"
                    />
                    <span className="text-sm text-foreground">By Person</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Report'}
                </button>
                <button
                  onClick={downloadAsFile}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="min-h-[500px] p-4 border border-input rounded-md bg-background">
          {hasOutput ? (
            <RichTextEditor
              ref={editorRef}
              value={editableContent}
              onChange={setEditableContent}
              placeholder="Edit your team report here..."
              showTagsToggle={true}
              showTags={showTagsInMerge}
              onShowTagsChange={setShowTagsInMerge}
              enableTextStyling={true}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-2xl mb-2">📄</div>
                <p>
                  {hasValidUrls ? 'Generating your team report...' : 'Paste status links to generate a team report'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasOutput && (
        <div className="bg-linear-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">💡</span>
            Report Format & Usage
          </h3>
          <div className="text-sm text-muted-foreground space-y-3">
            <div>
              <p className="font-medium text-foreground mb-1">📋 Copy Options:</p>
              <ul className="space-y-1 ml-4">
                <li><strong>"Copy Report":</strong> Ready-to-use formatted text perfect for emails and documents</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">📧 Email Formatting:</p>
              <p>The <strong>Copy Report</strong> button provides perfectly formatted text ready for email:</p>
              <ul className="space-y-1 ml-4">
                <li>• Paste directly into any email client - formatting is preserved</li>
                <li>• Works in Gmail, Outlook, and all major email services</li>
                <li>• No HTML rendering issues - pure, readable text</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">📊 Report Structure:</p>
              {mergeMode === 'app-wise' ? (
                <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
                  <strong>Payments Application:</strong><br />
                  &nbsp;&nbsp;• John: Fixed payment processing bug<br />
                  &nbsp;&nbsp;• Sarah: Updated refund logic<br />
                  <br />
                  <strong>Auth Service:</strong><br />
                  &nbsp;&nbsp;• Mike: Added OAuth integration
                </div>
              ) : (
                <div className="bg-muted/50 p-3 rounded-md font-mono text-xs">
                  <strong>John:</strong><br />
                  &nbsp;&nbsp;• Payments: Fixed payment processing bug<br />
                  &nbsp;&nbsp;• API: Updated error handling<br />
                  <br />
                  <strong>Sarah:</strong><br />
                  &nbsp;&nbsp;• Payments: Updated refund logic
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}