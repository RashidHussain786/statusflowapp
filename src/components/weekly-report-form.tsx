'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { extractStatusUrls, decodeStatus } from '@/lib/encoding';
import { extractAppNames, generateWeeklyReport } from '@/lib/weekly-report';
import { StatusPayload } from '@/lib/types';
import { Copy, Check } from 'lucide-react';
import { RichTextEditor, EditorRef } from './rich-text-editor';

export function WeeklyReportForm() {
    const [inputText, setInputText] = useState('');
    const [payloads, setPayloads] = useState<StatusPayload[]>([]);
    const [selectedApp, setSelectedApp] = useState<string>('');
    const [editableContent, setEditableContent] = useState('');
    const [copied, setCopied] = useState(false);
    const [showTags, setShowTags] = useState(true);
    const editorRef = useRef<EditorRef>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    // Extract valid payloads from input
    const handleAnalyze = () => {
        const urls = extractStatusUrls(inputText);
        const decoded = urls
            .map(url => decodeStatus(url))
            .filter((p): p is StatusPayload => p !== null);

        setPayloads(decoded);
        setEditableContent('');

        // Auto-select first app if available
        const apps = extractAppNames(decoded);
        if (apps.length > 0) {
            setSelectedApp(apps[0]);
        } else {
            setSelectedApp('');
        }
    };

    // Get unique app names
    const availableApps = useMemo(() => extractAppNames(payloads), [payloads]);

    // Generate report (Effect)
    useEffect(() => {
        if (!selectedApp) {
            setEditableContent('');
            return;
        }

        const result = generateWeeklyReport(payloads, selectedApp);

        // Build HTML for the editor
        let html = '';

        if (result.inProgress.length > 0) {
            html += `<h3>In Progress</h3><ul>${result.inProgress.map(i => `<li>${i.content}</li>`).join('')}</ul>`;
        }

        if (result.deployed.length > 0) {
            // Add spacing if we have both sections
            if (result.inProgress.length > 0) html += '<p></p>';
            html += `<h3>Deployed / Completed</h3><ul>${result.deployed.map(i => `<li>${i.content}</li>`).join('')}</ul>`;
        }

        if (result.inProgress.length === 0 && result.deployed.length === 0) {
            html = '<p>No items found for this application with traceable IDs.</p>';
        }

        // Strip tags if showTags is false
        if (!showTags) {
            // Regex to match [TAG IN CAPS] structure (e.g. [IN PROGRESS], [PENDING])
            html = html.replace(/\[[A-Z\s]+\]/g, '').replace(/\s+/g, ' ');
        }

        setEditableContent(html);
    }, [selectedApp, payloads, showTags]);

    // Handle initial app selection
    const handleGenerate = (app: string) => {
        setSelectedApp(app);
    };

    const handleCopy = async () => {
        if (!editorRef.current) return;

        try {
            // Attempt to copy from the DOM to capture decorations (styles)
            let htmlToCopy = editableContent;

            if (editorContainerRef.current) {
                const domEditor = editorContainerRef.current.querySelector('.ProseMirror');
                if (domEditor) {
                    htmlToCopy = domEditor.innerHTML;
                }
            }

            const text = editorRef.current.getText();

            const blobHtml = new Blob([htmlToCopy], { type: 'text/html' });
            const blobText = new Blob([text], { type: 'text/plain' });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText,
                })
            ]);

            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-4 2xl:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3 2xl:mb-4">
                    <h2 className="text-base 2xl:text-lg font-semibold text-card-foreground">1. Paste Daily Links</h2>
                    <button
                        onClick={handleAnalyze}
                        disabled={!inputText.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        Analyze Links
                    </button>
                </div>
                <div className="space-y-3">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your Monday, Tuesday, Wednesday... links here (one per line)"
                        className="w-full h-32 px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                    />
                </div>
            </div>

            {payloads.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4 2xl:p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-base 2xl:text-lg font-semibold text-card-foreground">2. Weekly Report:</h2>
                            <select
                                value={selectedApp}
                                onChange={(e) => handleGenerate(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-w-[200px]"
                            >
                                {availableApps.map(app => (
                                    <option key={app} value={app}>{app}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleCopy}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm w-full sm:w-auto justify-center"
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Copied!' : 'Copy Report'}
                        </button>
                    </div>

                    <div className="min-h-[400px] border border-input rounded-md bg-background" ref={editorContainerRef}>
                        <RichTextEditor
                            ref={editorRef}
                            value={editableContent}
                            onChange={setEditableContent}
                            placeholder="Generated report will appear here..."
                            enableTextStyling={true}
                            showTagsToggle={true}
                            showTags={showTags}
                            onShowTagsChange={setShowTags}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
