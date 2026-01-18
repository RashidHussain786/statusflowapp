'use client';

import { Copy, Check, ChevronDown } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { useTeamAggregationForm } from '../hooks/use-team-aggregation-form';
import { MergeMode } from '../lib/types';

export function TeamAggregationForm() {
  const {
    urlsText, setUrlsText,
    mergeMode, setMergeMode,
    selectedApp, setSelectedApp,
    copied,
    editableContent, setEditableContent,
    showTagsInMerge, setShowTagsInMerge,
    editorRef,
    processedData,
    generateOutput,
    copyToClipboard,
    hasValidUrls,
    hasOutput,
  } = useTeamAggregationForm();

  const [showAppSelector, setShowAppSelector] = useState(false);
  const appSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (appSelectorRef.current && !appSelectorRef.current.contains(event.target as Node)) {
        setShowAppSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 mb-3 2xl:mb-4">
          <h2 className="text-base 2xl:text-lg font-semibold text-card-foreground">Team Status Report</h2>
          {hasOutput && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="flex flex-row items-center gap-3 w-full md:w-auto relative" ref={appSelectorRef}>
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">View:</label>

                  <div className="relative flex-1 md:flex-none w-full md:w-auto min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => setShowAppSelector(!showAppSelector)}
                      className="w-full md:w-auto flex items-center justify-between px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground hover:bg-accent transition-colors"
                    >
                      <span>{selectedApp === 'all' ? 'All Applications' : selectedApp}</span>
                      <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                    </button>

                    {showAppSelector && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        <button
                          key="all"
                          onClick={() => {
                            setSelectedApp('all');
                            setShowAppSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${selectedApp === 'all' ? 'bg-accent font-medium' : ''}`}
                        >
                          All Applications
                        </button>
                        {processedData.uniqueApps.map(app => (
                          <button
                            key={app}
                            onClick={() => {
                              setSelectedApp(app);
                              setShowAppSelector(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${selectedApp === app ? 'bg-accent font-medium' : ''}`}
                          >
                            {app}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-center md:justify-start bg-muted/30 md:bg-transparent p-2 md:p-0 rounded-md">
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
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Report'}
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