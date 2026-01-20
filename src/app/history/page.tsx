'use client';

import { useState, useEffect, useMemo } from 'react';
import { MainNav } from '@/components/main-nav';
import { Footer } from '@/components/footer';
import { db, DailyPayload } from '@/lib/indexeddb';
import { Search, Download, Upload, Calendar, ArrowRight, History as HistoryIcon, X as XIcon, BarChart3, PieChart, TrendingUp, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, User, Link2, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { encodeStatus, encodeMultiStatus, splitMultiStatusPayloads } from '@/lib/encoding';
import { useRouter } from 'next/navigation';
import { renderTagsInHtml } from '@/lib/tags';

interface StatusGroup {
    id: string; // name-date
    name: string;
    date: string;
    entries: DailyPayload[];
}

export default function HistoryPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<DailyPayload[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Weekly Batch State
    const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
    const [weeklyStartDate, setWeeklyStartDate] = useState('');
    const [weeklyEndDate, setWeeklyEndDate] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

    // Timeline State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [taskTimeline, setTaskTimeline] = useState<{ date: string, content: string, status: string }[]>([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);

    useEffect(() => {
        loadEntries();
    }, []);

    async function loadEntries() {
        setIsLoading(true);
        try {
            const allEntries = await db.dailyPayloads.orderBy('date').reverse().toArray();
            setEntries(allEntries);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setIsLoading(false);
        }
    }

    // Filtered and Grouped entries
    const groupedEntries = useMemo(() => {
        let filtered = entries;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = entries.filter(e =>
                e.payload.name.toLowerCase().includes(q) ||
                e.appName.toLowerCase().includes(q) ||
                e.payload.apps.some(app => app.content.toLowerCase().includes(q))
            );
        }

        const groups = new Map<string, StatusGroup>();
        filtered.forEach(entry => {
            const id = `${entry.payload.name}-${entry.date}`;
            if (!groups.has(id)) {
                groups.set(id, {
                    id,
                    name: entry.payload.name,
                    date: entry.date,
                    entries: []
                });
            }
            groups.get(id)!.entries.push(entry);
        });

        return Array.from(groups.values());
    }, [entries, searchQuery]);

    // Productivity Metrics Calculation
    const stats = useMemo(() => {
        const counts = {
            done: 0,
            inProgress: 0,
            blocked: 0,
            total: 0,
            velocity: [] as { date: string, count: number }[],
        };

        const dateMap = new Map<string, number>();

        entries.forEach(entry => {
            entry.payload.apps.forEach(app => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(app.content, 'text/html');
                const items = doc.querySelectorAll('li');

                items.forEach(li => {
                    const text = li.textContent?.toUpperCase() || '';
                    if (['[DONE]', '[DEPLOYED]', '[COMPLETED]'].some(tag => text.includes(tag))) {
                        counts.done++;
                        dateMap.set(entry.date, (dateMap.get(entry.date) || 0) + 1);
                    } else if (['[BLOCKED]', '[ON HOLD]'].some(tag => text.includes(tag))) {
                        counts.blocked++;
                    } else if (['[IN PROGRESS]', '[WORKING]', '[PLANNED]'].some(tag => text.includes(tag))) {
                        counts.inProgress++;
                    }
                    counts.total++;
                });
            });
        });

        counts.velocity = Array.from(dateMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-7);

        return counts;
    }, [entries]);

    async function handleCopyWeeklyRange() {
        if (!weeklyStartDate || !weeklyEndDate) {
            alert('Please select a date range.');
            return;
        }

        try {
            // Find all payloads within range
            const rangeEntries = entries.filter(e => e.date >= weeklyStartDate && e.date <= weeklyEndDate);
            if (rangeEntries.length === 0) {
                alert('No statuses found in this date range.');
                return;
            }

            // Group by date to avoid duplicate apps if they were split, 
            // but actually encodeMultiStatus handles a list of payloads.
            const payloads = rangeEntries.map(e => e.payload);
            const fragments = splitMultiStatusPayloads(payloads);
            const userName = payloads[0]?.name || 'User';
            const baseLabel = `${userName} - Weekly Status (${weeklyStartDate} to ${weeklyEndDate})`;

            let html = '';
            let text = '';

            fragments.forEach((fragment, i) => {
                const fullUrl = `${window.location.origin}/create-weekly${fragment}`;
                // Use the full label as the hyperlink text, with a number if split
                const label = fragments.length > 1 ? `${baseLabel} (${i + 1})` : baseLabel;
                html += `<a href="${fullUrl}">${label}</a><br/>`;
                text += `${label}: ${fullUrl}\n`;
            });

            const blobHtml = new Blob([html], { type: 'text/html' });
            const blobText = new Blob([text], { type: 'text/plain' });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText,
                })
            ]);

            setCopyStatus('copied');
            setTimeout(() => {
                setCopyStatus('idle');
                setIsWeeklyModalOpen(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy weekly batch:', err);
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 2000);
        }
    }

    async function showTimeline(taskId: string) {
        setSelectedTaskId(taskId);
        setIsTimelineLoading(true);
        try {
            const all = await db.dailyPayloads.orderBy('date').toArray();
            const timeline = all
                .filter(e => e.payload.apps.some(app => app.content.includes(`data-id="${taskId}"`)))
                .map(e => {
                    const app = e.payload.apps.find(a => a.content.includes(`data-id="${taskId}"`))!;
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(app.content, 'text/html');
                    const li = doc.querySelector(`li[data-id="${taskId}"]`);
                    const text = li?.textContent || '';
                    const tagMatch = text.match(/\[([^\]]+)\]/);
                    const status = tagMatch ? tagMatch[1] : 'Unknown';

                    return {
                        date: e.date,
                        content: li?.innerHTML || '',
                        status
                    };
                });
            setTaskTimeline(timeline);
        } catch (err) {
            console.error('Failed to load timeline:', err);
        } finally {
            setIsTimelineLoading(false);
        }
    }

    async function exportHistory() {
        try {
            const data = await db.dailyPayloads.toArray();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `status-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export history.');
        }
    }

    async function importHistory(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (!Array.isArray(data)) throw new Error('Invalid format');

                await db.transaction('rw', db.dailyPayloads, async () => {
                    for (const item of data) {
                        const { id, ...rest } = item;
                        await db.dailyPayloads.add(rest as DailyPayload);
                    }
                });

                alert('Import successful!');
                loadEntries();
            } catch (err) {
                console.error('Import failed:', err);
                alert('Failed to import.');
            }
        };
        reader.readAsText(file);
    }

    function getTasks(html: string): { id: string, content: string, status: string }[] {
        if (typeof window === 'undefined') return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return Array.from(doc.querySelectorAll('li[data-id]')).map(li => {
            const text = li.textContent || '';
            const tagMatch = text.match(/\[([^\]]+)\]/);
            return {
                id: li.getAttribute('data-id') || '',
                content: li.innerHTML,
                status: tagMatch ? tagMatch[1] : ''
            };
        });
    }

    function injectTraceTriggers(html: string): string {
        if (typeof window === 'undefined') return html;
        const processedHtml = renderTagsInHtml(html);
        const parser = new DOMParser();
        const doc = parser.parseFromString(processedHtml, 'text/html');

        doc.querySelectorAll('li[data-id]').forEach(li => {
            const taskId = li.getAttribute('data-id');
            if (taskId) {
                const triggerHtml = `
                    <button 
                        class="trace-trigger mr-2 inline-flex items-center justify-center p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all group/trace" 
                        data-task-id="${taskId}"
                        title="Trace Task History"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-history"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="m12 7v5l4 2"/></svg>
                    </button>
                `;

                // Always prepend to the li or its first paragraph to keep it at the front
                const firstP = li.querySelector('p');
                if (firstP) {
                    firstP.insertAdjacentHTML('afterbegin', triggerHtml);
                } else {
                    li.insertAdjacentHTML('afterbegin', triggerHtml);
                }
            }
        });

        return doc.body.innerHTML;
    }

    // Handle clicks on injected trace buttons using event delegation
    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const trigger = target.closest('.trace-trigger');
        if (trigger) {
            const taskId = trigger.getAttribute('data-task-id');
            if (taskId) {
                e.preventDefault();
                e.stopPropagation();
                showTimeline(taskId);
            }
        }
    };

    function toggleGroup(id: string) {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <MainNav />
            <main className="flex-1 container mx-auto px-4 2xl:px-6 py-8 max-w-5xl 2xl:max-w-7xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Status Dashboard</h1>
                        <p className="text-muted-foreground mt-1 text-sm font-medium">Insights and archive of your daily productivity.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsWeeklyModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20"
                        >
                            <Link2 className="h-4 w-4" />
                            Copy Weekly Link
                        </button>
                        <button
                            onClick={exportHistory}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <Download className="h-4 w-4" />
                            Backup
                        </button>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={importHistory}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <button className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background rounded-lg hover:bg-accent transition-all text-xs font-bold uppercase tracking-wider">
                                <Upload className="h-4 w-4" />
                                Restore
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1 p-1 bg-muted/30 rounded-xl mb-8 w-fit border border-border">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-background text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Archive
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-background text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Insights
                    </button>
                </div>

                {activeTab === 'stats' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs border-l-4 border-l-green-500">
                                <div className="flex items-center justify-between mb-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Completed</span>
                                </div>
                                <div className="text-3xl font-black">{stats.done}</div>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Total items marked as done</p>
                            </div>

                            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs border-l-4 border-l-primary">
                                <div className="flex items-center justify-between mb-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">In Progress</span>
                                </div>
                                <div className="text-3xl font-black">{stats.inProgress}</div>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Active tasks being worked on</p>
                            </div>

                            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs border-l-4 border-l-red-500">
                                <div className="flex items-center justify-between mb-2">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Blocked</span>
                                </div>
                                <div className="text-3xl font-black">{stats.blocked}</div>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Items currently stuck</p>
                            </div>

                            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs border-l-4 border-l-muted-foreground">
                                <div className="flex items-center justify-between mb-2">
                                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Velocity</span>
                                </div>
                                <div className="text-3xl font-black">{stats.velocity.length > 0 ? (stats.done / entries.length).toFixed(1) : 0}</div>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Avg tasks completed per status</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-card border border-border rounded-3xl p-8 shadow-xs">
                                <h3 className="font-black text-lg mb-6 uppercase tracking-tight flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                    Recent Throughput
                                </h3>
                                <div className="h-48 flex items-end justify-between gap-2">
                                    {stats.velocity.map((v, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div
                                                className="w-full bg-primary/20 hover:bg-primary/40 transition-all rounded-t-lg relative"
                                                style={{ height: `${(v.count / Math.max(...stats.velocity.map(d => d.count), 1)) * 100}%` }}
                                            >
                                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {v.count}
                                                </span>
                                            </div>
                                            <span className="text-[8px] font-bold text-muted-foreground rotate-45 origin-left truncate max-w-[40px]">
                                                {v.date.split('-').slice(1).join('/')}
                                            </span>
                                        </div>
                                    ))}
                                    {stats.velocity.length === 0 && <div className="w-full flex items-center justify-center text-muted-foreground text-sm font-medium italic">Not enough data yet</div>}
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-3xl p-8 shadow-xs flex flex-col items-center">
                                <h3 className="font-black text-lg mb-6 uppercase tracking-tight self-start flex items-center gap-2">
                                    <PieChart className="h-5 w-5 text-primary" />
                                    Task Distribution
                                </h3>
                                <div className="relative w-48 h-48 mb-6">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                                        {stats.total > 0 && (
                                            <>
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#22c55e" strokeWidth="3"
                                                    strokeDasharray={`${(stats.done / stats.total) * 100} ${100 - ((stats.done / stats.total) * 100)}`}
                                                />
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3"
                                                    strokeDasharray={`${(stats.inProgress / stats.total) * 100} ${100 - ((stats.inProgress / stats.total) * 100)}`}
                                                    strokeDashoffset={-((stats.done / stats.total) * 100)}
                                                />
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3"
                                                    strokeDasharray={`${(stats.blocked / stats.total) * 100} ${100 - ((stats.blocked / stats.total) * 100)}`}
                                                    strokeDashoffset={-(((stats.done + stats.inProgress) / stats.total) * 100)}
                                                />
                                            </>
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-2xl font-black">{stats.total}</span>
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Tasks</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 w-full text-[10px] font-black uppercase tracking-widest text-center">
                                    <div className="text-green-500">Done {(stats.total ? (stats.done / stats.total * 100) : 0).toFixed(0)}%</div>
                                    <div className="text-primary">Active {(stats.total ? (stats.inProgress / stats.total * 100) : 0).toFixed(0)}%</div>
                                    <div className="text-red-500">Stuck {(stats.total ? (stats.blocked / stats.total * 100) : 0).toFixed(0)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative mb-8">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name, application, or status content..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-input rounded-xl bg-muted/20 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {isLoading ? (
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p className="mt-2 text-muted-foreground animate-pulse font-medium">Loading history...</p>
                            </div>
                        ) : groupedEntries.length === 0 ? (
                            <div className="text-center py-20 bg-card border border-border rounded-2xl border-dashed">
                                <div className="text-5xl mb-4">📂</div>
                                <h3 className="text-xl font-bold">No entries found</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                                    {searchQuery ? "No snapshots match your search." : "You haven't saved any statuses yet."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {groupedEntries.map((group) => (
                                    <div key={group.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all border-l-4 border-l-primary/30">
                                        <button
                                            onClick={() => toggleGroup(group.id)}
                                            className="w-full text-left bg-muted/30 px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-black text-foreground text-lg tracking-tight uppercase">{group.name}</div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase tracking-tighter">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {group.date}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded uppercase tracking-widest">
                                                    {group.entries.length} {group.entries.length === 1 ? 'App' : 'Apps'}
                                                </span>
                                                {expandedGroups.has(group.id) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                            </div>
                                        </button>

                                        {expandedGroups.has(group.id) && (
                                            <div className="p-6 space-y-8 animate-in slide-in-from-top-2 duration-200">
                                                {group.entries.map((entry, idx) => (
                                                    <div key={idx} className="space-y-4 border-b border-border last:border-0 pb-6 last:pb-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="px-3 py-1 bg-primary text-primary-foreground text-[10px] uppercase font-black rounded-lg tracking-widest shadow-xs">
                                                                {entry.appName}
                                                            </span>
                                                        </div>

                                                        <div
                                                            className="prose prose-sm dark:prose-invert max-w-none ml-1"
                                                            onClick={handleContentClick}
                                                        >
                                                            <div dangerouslySetInnerHTML={{ __html: injectTraceTriggers(entry.payload.apps[0].content) }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Timeline Modal */}
                {selectedTaskId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/10 shadow-primary/10">
                            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                                <div>
                                    <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tight">
                                        <HistoryIcon className="h-6 w-6 text-primary" />
                                        Task Timeline
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground font-bold tracking-widest border border-border">ID: {selectedTaskId}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTaskId(null)}
                                    className="p-2 hover:bg-accent rounded-full transition-colors"
                                >
                                    <XIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 bg-card">
                                {isTimelineLoading ? (
                                    <div className="flex flex-col items-center justify-center h-60 gap-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-lg shadow-primary/20"></div>
                                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Deep Scanning History...</p>
                                    </div>
                                ) : (
                                    <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-1 before:bg-linear-to-b before:from-primary/40 before:via-primary/20 before:to-transparent">
                                        {taskTimeline.map((step, i) => (
                                            <div key={i} className="relative flex items-start gap-8 group">
                                                <div className="absolute left-0 mt-2 w-10 flex justify-center">
                                                    <div className={`h-4.5 w-4.5 rounded-full border-4 border-card ring-2 transition-all ${['DONE', 'DEPLOYED', 'COMPLETED'].includes(step.status.toUpperCase())
                                                        ? 'bg-green-500 ring-green-500/20'
                                                        : ['BLOCKED', 'ERROR', 'STOPPED'].includes(step.status.toUpperCase())
                                                            ? 'bg-red-500 ring-red-500/20'
                                                            : 'bg-primary ring-primary/20'
                                                        }`}></div>
                                                </div>
                                                <div className="flex-1 bg-muted/20 p-6 rounded-2xl border border-border group-hover:bg-muted/40 transition-colors shadow-xs">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                                        <span className="text-xs font-black text-foreground/70 flex items-center gap-1.5 uppercase tracking-widest">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {step.date}
                                                        </span>
                                                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg border tracking-widest uppercase shadow-sm ${['DONE', 'DEPLOYED', 'COMPLETED'].includes(step.status.toUpperCase())
                                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                            : 'bg-primary/10 text-primary border-primary/20'
                                                            }`}>
                                                            {step.status}
                                                        </span>
                                                    </div>
                                                    <div className="prose prose-sm dark:prose-invert max-w-none font-medium leading-relaxed">
                                                        <div dangerouslySetInnerHTML={{ __html: renderTagsInHtml(step.content) }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {taskTimeline.length === 0 && <div className="text-center py-10 font-bold text-muted-foreground uppercase tracking-widest">No trace found.</div>}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-border bg-muted/30 flex justify-end">
                                <button
                                    onClick={() => setSelectedTaskId(null)}
                                    className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                                >
                                    Close Record
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Weekly Batch Modal */}
                {isWeeklyModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                                <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tight">
                                    <Link2 className="h-6 w-6 text-primary" />
                                    Copy Weekly Link
                                </h3>
                                <button
                                    onClick={() => setIsWeeklyModalOpen(false)}
                                    className="p-2 hover:bg-accent rounded-full transition-colors"
                                >
                                    <XIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <p className="text-sm text-muted-foreground font-medium">
                                    Select a date range to generate a single consolidated hyperlink for your Weekly Report.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">From Date</label>
                                        <input
                                            type="date"
                                            value={weeklyStartDate}
                                            onChange={(e) => setWeeklyStartDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-muted/50 border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">To Date</label>
                                        <input
                                            type="date"
                                            value={weeklyEndDate}
                                            onChange={(e) => setWeeklyEndDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-muted/50 border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-border bg-muted/30 flex gap-3">
                                <button
                                    onClick={() => setIsWeeklyModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-input rounded-xl hover:bg-accent transition-all text-xs font-black uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCopyWeeklyRange}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg ${copyStatus === 'copied'
                                        ? 'bg-green-500 text-white shadow-green-500/20'
                                        : copyStatus === 'error'
                                            ? 'bg-red-500 text-white shadow-red-500/20'
                                            : 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90'
                                        }`}
                                >
                                    {copyStatus === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy Hyperlink'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
