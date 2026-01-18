'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { extractStatusUrls, decodeStatus } from '@/lib/encoding';
import { extractAppNames, generateWeeklyReport, extractAvailableTags, CategoryConfig } from '@/lib/weekly-report';
import { StatusPayload } from '@/lib/types';
import { Copy, Check, ChevronDown, Settings2, Plus, Trash2, X, GripVertical } from 'lucide-react';
import { RichTextEditor, EditorRef } from './rich-text-editor';

const DEFAULT_CONFIGS: CategoryConfig[] = [
    { name: 'In Progress', tags: ['[IN PROGRESS]', '[WORKING]', '[PLANNED]'] },
    { name: 'Deployed / Completed', tags: ['[DONE]', '[DEPLOYED]', '[COMPLETED]'] }
];

export function WeeklyReportForm() {
    const [inputText, setInputText] = useState('');
    const [payloads, setPayloads] = useState<StatusPayload[]>([]);
    const [selectedApp, setSelectedApp] = useState<string>('');
    const [editableContent, setEditableContent] = useState('');
    const [copied, setCopied] = useState(false);
    const [showTags, setShowTags] = useState(true);
    const [showAppSelector, setShowAppSelector] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [openTagPickerIndex, setOpenTagPickerIndex] = useState<number | null>(null);

    // Load config from localStorage
    const [configs, setConfigs] = useState<CategoryConfig[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_CONFIGS;
        const saved = localStorage.getItem('weekly_report_configs');
        return saved ? JSON.parse(saved) : DEFAULT_CONFIGS;
    });

    const editorRef = useRef<EditorRef>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const appSelectorRef = useRef<HTMLDivElement>(null);
    const tagPickerRef = useRef<HTMLDivElement>(null);

    // Persist config
    useEffect(() => {
        localStorage.setItem('weekly_report_configs', JSON.stringify(configs));
    }, [configs]);

    // Click outside listener for custom dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (appSelectorRef.current && !appSelectorRef.current.contains(event.target as Node)) {
                setShowAppSelector(false);
            }
            if (tagPickerRef.current && !tagPickerRef.current.contains(event.target as Node)) {
                setOpenTagPickerIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    // Get all unique tags available for the selected app
    const availableTagsForApp = useMemo(() =>
        selectedApp ? extractAvailableTags(payloads, selectedApp) : []
        , [payloads, selectedApp]);

    // Generate report (Effect)
    useEffect(() => {
        if (!selectedApp) {
            setEditableContent('');
            return;
        }

        const categorizedReport = generateWeeklyReport(payloads, selectedApp, configs);

        // Build HTML for the editor
        let html = '';

        categorizedReport.forEach((section, index) => {
            if (index > 0) html += '<p></p>';
            html += `<h3>${section.category}</h3><ul>${section.items.map(i => `<li>${i.content}</li>`).join('')}</ul>`;
        });

        if (categorizedReport.length === 0) {
            html = '<p>No items found for this application with traceable IDs.</p>';
        }

        // Strip tags if showTags is false
        if (!showTags) {
            html = html.replace(/\[[A-Z\s]+\]/g, '').replace(/\s+/g, ' ');
        }

        setEditableContent(html);
    }, [selectedApp, payloads, showTags, configs]);

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

    const addCategory = () => {
        setConfigs([...configs, { name: 'New Category', tags: [] }]);
    };

    const removeCategory = (index: number) => {
        setConfigs(configs.filter((_, i) => i !== index));
    };

    const updateCategory = (index: number, field: keyof CategoryConfig, value: any) => {
        const newConfigs = [...configs];
        newConfigs[index] = { ...newConfigs[index], [field]: value };
        setConfigs(newConfigs);
    };

    const addTagToCategory = (catIndex: number, tag: string) => {
        const currentTags = configs[catIndex].tags;
        if (!currentTags.includes(tag)) {
            updateCategory(catIndex, 'tags', [...currentTags, tag]);
        }
    };

    const removeTagFromCategory = (catIndex: number, tagToRemove: string) => {
        updateCategory(catIndex, 'tags', configs[catIndex].tags.filter(t => t !== tagToRemove));
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newConfigs = [...configs];
        const itemToMove = newConfigs.splice(draggedIndex, 1)[0];
        newConfigs.splice(index, 0, itemToMove);
        setConfigs(newConfigs);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                            <h2 className="text-base 2xl:text-lg font-semibold text-card-foreground whitespace-nowrap">2. Weekly Report:</h2>

                            <div className="relative w-full sm:w-64" ref={appSelectorRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowAppSelector(!showAppSelector)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground hover:bg-accent transition-colors"
                                >
                                    <span>{selectedApp}</span>
                                    <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                                </button>

                                {showAppSelector && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                        {availableApps.map(app => (
                                            <button
                                                key={app}
                                                onClick={() => {
                                                    handleGenerate(app);
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

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => setShowFormatModal(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors shadow-sm flex-1 sm:flex-none justify-center"
                            >
                                <Settings2 className="h-4 w-4" />
                                Format Rules
                            </button>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm flex-1 sm:flex-none justify-center"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'Copied!' : 'Copy Report'}
                            </button>
                        </div>
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
            {/* Format Rules Modal */}
            {showFormatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-primary" />
                                Weekly Report Categories
                            </h3>
                            <button
                                onClick={() => setShowFormatModal(false)}
                                className="p-1 hover:bg-accent rounded-md transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <p className="text-sm text-muted-foreground">
                                Define how your status items are grouped. Items matching tags will be placed under the corresponding header.
                            </p>

                            <div className="space-y-4">
                                {configs.map((config, index) => (
                                    <div
                                        key={index}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`p-4 border border-border rounded-lg space-y-4 bg-muted/30 transition-all duration-200 group relative ${draggedIndex === index ? 'opacity-50 scale-[0.98] border-primary' : 'hover:border-primary/30'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-primary transition-colors">
                                                <GripVertical className="h-5 w-5" />
                                            </div>
                                            <input
                                                type="text"
                                                value={config.name}
                                                onChange={(e) => updateCategory(index, 'name', e.target.value)}
                                                placeholder="Category Name (e.g. Enhancement)"
                                                className="flex-1 px-3 py-1.5 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                            <button
                                                onClick={() => removeCategory(index)}
                                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-8">Mapped Tags</label>

                                            <div className="flex flex-wrap gap-2 p-3 bg-background border border-input rounded-md min-h-[42px] ml-8">
                                                {config.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md border border-primary/20 animate-in zoom-in-95 duration-200"
                                                    >
                                                        {tag}
                                                        <button
                                                            onClick={() => removeTagFromCategory(index, tag)}
                                                            className="p-0.5 hover:bg-primary/20 rounded-sm transition-colors"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ))}

                                                {/* Premium Tag Selection Popover */}
                                                <div className="relative" ref={openTagPickerIndex === index ? tagPickerRef : null}>
                                                    <button
                                                        onClick={() => setOpenTagPickerIndex(openTagPickerIndex === index ? null : index)}
                                                        className="h-6 w-6 flex items-center justify-center rounded-md border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                                                    >
                                                        <Plus className={`h-3 w-3 transition-transform duration-200 ${openTagPickerIndex === index ? 'rotate-45' : ''}`} />
                                                    </button>

                                                    {openTagPickerIndex === index && (
                                                        <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-xl z-[60] py-1 animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                                                                Available Tags
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto">
                                                                {availableTagsForApp
                                                                    .filter(tag => !config.tags.includes(tag))
                                                                    .map(tag => (
                                                                        <button
                                                                            key={tag}
                                                                            onClick={() => {
                                                                                addTagToCategory(index, tag);
                                                                                setOpenTagPickerIndex(null);
                                                                            }}
                                                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                                                                        >
                                                                            {tag}
                                                                        </button>
                                                                    ))
                                                                }
                                                                {availableTagsForApp.filter(tag => !config.tags.includes(tag)).length === 0 && (
                                                                    <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                                                        No new tags available
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {availableTagsForApp.length === 0 && (
                                                <p className="text-[10px] text-amber-500 font-medium italic pl-8">
                                                    No tags found in the analyzed status links for this application.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addCategory}
                                className="w-full py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add New Category
                            </button>
                        </div>

                        <div className="p-4 border-t border-border flex justify-end">
                            <button
                                onClick={() => setShowFormatModal(false)}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
