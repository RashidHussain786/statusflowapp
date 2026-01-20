'use client';

import { MainNav } from '@/components/main-nav';
import { Footer } from '@/components/footer';
import { db, DailyPayload } from '@/lib/indexeddb';
import { Search, Download, Upload, Calendar, ArrowRight, History as HistoryIcon, X as XIcon, BarChart3, PieChart, TrendingUp, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, User, Link2, Copy, Check, MousePointer2 } from 'lucide-react';
import { renderTagsInHtml } from '@/lib/tags';
import { useHistory, StatusGroup } from '@/hooks/use-history';
import { AppStatus } from '@/lib/types';

export default function HistoryPage() {
    const {
        uniqueNames,
        filteredEntries,
        pagedGroups,
        isLoading,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        selectedType,
        setSelectedType,
        selectedPerson,
        setSelectedPerson,
        expandedGroups,
        toggleGroup,
        stats,
        isWeeklyModalOpen,
        setIsWeeklyModalOpen,
        weeklyStartDate,
        setWeeklyStartDate,
        weeklyEndDate,
        setWeeklyEndDate,
        handleCopyWeeklyRange,
        copyStatus,
        selectedTaskId,
        setSelectedTaskId,
        taskTimeline,
        isTimelineLoading,
        showTimeline,
        hasMore,
        loadMore,
        loadEntries,
        startDate,
        setStartDate,
        endDate,
        setEndDate
    } = useHistory();

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

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <MainNav />
            <main className="flex-1 container mx-auto px-4 2xl:px-6 py-6 2xl:py-8 max-w-5xl 2xl:max-w-7xl">
                <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center justify-between mb-6 2xl:mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-black tracking-tight text-foreground uppercase flex items-center gap-2 md:gap-3">
                            <HistoryIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                            History Archive
                        </h1>
                        <p className="text-muted-foreground mt-1 text-xs md:text-sm font-bold uppercase tracking-widest">
                            Manage and trace your status evolution
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setIsWeeklyModalOpen(true)}
                            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xs"
                        >
                            <Link2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span className="hidden md:inline">Weekly Range URL</span>
                            <span className="md:hidden">Weekly</span>
                        </button>
                        <button
                            onClick={exportHistory}
                            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span className="hidden md:inline">Backup</span>
                            <span className="md:hidden">Export</span>
                        </button>
                        <label className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xs cursor-pointer">
                            <Upload className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span className="hidden md:inline">Restore</span>
                            <span className="md:hidden">Import</span>
                            <input type="file" accept=".json" onChange={importHistory} className="hidden" />
                        </label>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 2xl:mb-8">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, application, or status content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value as any)}
                            className="flex-1 md:flex-none px-3 md:px-4 py-2.5 md:py-3 bg-secondary/50 border border-border rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer min-w-[120px]"
                        >
                            <option value="all">All Types</option>
                            <option value="individual">Individual</option>
                            <option value="team">Team Merge</option>
                            <option value="weekly">Weekly</option>
                        </select>

                        <select
                            value={selectedPerson}
                            onChange={(e) => setSelectedPerson(e.target.value)}
                            className="flex-1 md:flex-none px-3 md:px-4 py-2.5 md:py-3 bg-secondary/50 border border-border rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer min-w-[120px]"
                        >
                            <option value="all">All People</option>
                            {uniqueNames.map((name: string) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>

                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder="From"
                                className="w-full md:w-auto pl-9 pr-3 py-2.5 md:py-3 bg-secondary/50 border border-border rounded-xl text-[10px] md:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[140px]"
                            />
                        </div>

                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder="To"
                                className="w-full md:w-auto pl-9 pr-3 py-2.5 md:py-3 bg-secondary/50 border border-border rounded-xl text-[10px] md:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[140px]"
                            />
                        </div>

                        {(startDate || endDate || selectedType !== 'all' || selectedPerson !== 'all' || searchQuery) && (
                            <button
                                onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                    setSelectedType('all');
                                    setSelectedPerson('all');
                                    setSearchQuery('');
                                }}
                                className="px-3 md:px-4 py-2.5 md:py-3 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl transition-all font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-1.5"
                                title="Clear all filters"
                            >
                                <XIcon className="h-3.5 w-3.5" />
                                <span className="">Clear</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-1 p-1 bg-muted/30 rounded-xl mb-6 2xl:mb-8 w-full sm:w-fit border border-border">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-background text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Archive
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-background text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Insights
                    </button>
                </div>

                {activeTab === 'stats' ? (
                    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 2xl:gap-6">
                            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 2xl:p-8 shadow-xs border-l-4 border-l-green-500">
                                <div className="flex items-center justify-between mb-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Completed</span>
                                </div>
                                <div className="text-3xl font-black">{stats.done}</div>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Total items marked as done</p>
                            </div>

                            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 2xl:p-8 shadow-xs border-l-4 border-l-primary">
                                <div className="flex items-center justify-between mb-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">In Progress</span>
                                </div>
                                <div className="text-3xl font-black">{stats.inProgress}</div>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Active tasks being worked on</p>
                            </div>

                            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 2xl:p-8 shadow-xs border-l-4 border-l-red-500">
                                <div className="flex items-center justify-between mb-2">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Blocked</span>
                                </div>
                                <div className="text-3xl font-black">{stats.blocked}</div>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Items currently stuck</p>
                            </div>

                            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 2xl:p-8 shadow-xs border-l-4 border-l-muted-foreground">
                                <div className="flex items-center justify-between mb-2">
                                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Velocity</span>
                                </div>
                                <div className="text-2xl md:text-3xl font-black">{stats.velocity.length > 0 ? (stats.done / filteredEntries.length).toFixed(1) : 0}</div>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Avg tasks completed per status</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 2xl:gap-8">
                            <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-6 2xl:p-8 shadow-xs">
                                <h3 className="font-black text-base md:text-lg 2xl:text-xl mb-4 md:mb-6 uppercase tracking-tight flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                    Recent Throughput
                                </h3>
                                <div className="h-40 md:h-48 2xl:h-56 flex items-end justify-between gap-1 md:gap-2 px-1 md:px-2 border-b border-border/50">
                                    {stats.velocity.map((v: { date: string, count: number }, i: number) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group max-w-[40px]">
                                            <div
                                                className="w-full bg-primary/40 group-hover:bg-primary transition-all rounded-t-lg relative flex items-end justify-center"
                                                style={{ height: `${(v.count / Math.max(...stats.velocity.map((d: { date: string, count: number }) => d.count), 1)) * 100}%` }}
                                                title={`${v.count} tasks completed`}
                                            >
                                                <div className="absolute -top-8 bg-popover border border-border px-2 py-1 rounded shadow-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1 pointer-events-none whitespace-nowrap z-10">
                                                    {v.count} Done
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground rotate-45 origin-left mt-2 whitespace-nowrap">
                                                {v.date.split('-').slice(1).join('/')}
                                            </span>
                                        </div>
                                    ))}
                                    {stats.velocity.length === 0 && <div className="w-full flex items-center justify-center text-muted-foreground text-sm font-medium italic">Not enough data yet</div>}
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-6 2xl:p-8 shadow-xs flex flex-col items-center">
                                <h3 className="font-black text-base md:text-lg 2xl:text-xl mb-4 md:mb-6 uppercase tracking-tight self-start flex items-center gap-2">
                                    <PieChart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                    Task Distribution
                                </h3>
                                <div className="relative w-36 h-36 md:w-48 md:h-48 2xl:w-56 2xl:h-56 mb-4 md:mb-6">
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
                    <div className="space-y-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                <HistoryIcon className="h-12 w-12 text-muted animate-spin mb-4" />
                                <div className="h-4 w-32 bg-muted rounded"></div>
                            </div>
                        ) : filteredEntries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border border-dashed rounded-3xl">
                                <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                                    <Search className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-foreground">No records found</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                                    {searchQuery ? "No snapshots match your search." : "You haven't saved any statuses yet."}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 gap-4">
                                    {pagedGroups.map((group: StatusGroup) => (
                                        <div key={group.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all border-l-4 border-l-primary/30">
                                            <button
                                                onClick={() => toggleGroup(group.id)}
                                                className="w-full text-left bg-muted/30 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                                    <div className="h-8 w-8 md:h-10 md:w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                                        <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-black text-foreground text-base md:text-lg tracking-tight uppercase truncate">{group.name}</div>
                                                        <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-tighter">
                                                            <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                                            {group.date}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                                    <span className="text-[9px] md:text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded uppercase tracking-widest">
                                                        {group.entries.length} {group.entries.length === 1 ? 'App' : 'Apps'}
                                                    </span>
                                                    {expandedGroups.has(group.id) ? <ChevronDown className="h-4 w-4 md:h-5 md:w-5" /> : <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />}
                                                </div>
                                            </button>

                                            {expandedGroups.has(group.id) && (
                                                <div className="p-4 md:p-6 2xl:p-8 space-y-6 md:space-y-8 animate-in slide-in-from-top-2 duration-200">
                                                    {group.entries.map((entry: DailyPayload) => (
                                                        <div key={entry.id || `${entry.date}-${entry.type}`} className="space-y-6">
                                                            {entry.payload.apps.map((app: AppStatus) => (
                                                                <div key={app.app} className="space-y-4 border-b border-border last:border-0 pb-6 last:pb-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="px-3 py-1 bg-primary text-primary-foreground text-[10px] uppercase font-black rounded-lg tracking-widest shadow-xs">
                                                                                {app.app}
                                                                            </span>
                                                                            {entry.type !== 'individual' && (
                                                                                <span className={`px-2 py-1 text-[8px] font-black rounded uppercase tracking-tighter ${entry.type === 'team' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                                                                                    {entry.type}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div
                                                                        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground marker:text-primary list-disc list-inside selection:bg-primary/30"
                                                                        onClick={handleContentClick}
                                                                        dangerouslySetInnerHTML={{ __html: injectTraceTriggers(app.content) }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {hasMore && (
                                    <div className="flex justify-center pt-6 md:pt-8 pb-8 md:pb-12">
                                        <button
                                            onClick={loadMore}
                                            className="group relative inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-card border-2 border-primary/20 hover:border-primary text-foreground rounded-xl md:rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg overflow-hidden font-black uppercase text-xs md:text-sm tracking-widest"
                                        >
                                            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                                            <MousePointer2 className="h-4 w-4 md:h-5 md:w-5 text-primary group-hover:animate-bounce" />
                                            Load More
                                            <div className="ml-1 md:ml-2 h-5 w-5 md:h-6 md:w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-primary">
                                                +
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <Footer />

            {/* Weekly Batch Modal */}
            {isWeeklyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-t-4 md:border-t-8 border-t-primary">
                        <div className="p-5 md:p-8 space-y-6 md:space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <Link2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                                    Generate Batch
                                </h3>
                                <button onClick={() => setIsWeeklyModalOpen(false)} className="p-1.5 md:p-2 hover:bg-muted rounded-full transition-colors">
                                    <XIcon className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                                </button>
                            </div>

                            <p className="text-xs md:text-sm text-muted-foreground font-medium">Select a date range to generate shareable links for your daily statuses.</p>

                            <div className="space-y-4 md:space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">From</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={weeklyStartDate}
                                            onChange={(e) => setWeeklyStartDate(e.target.value)}
                                            className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">To</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={weeklyEndDate}
                                            onChange={(e) => setWeeklyEndDate(e.target.value)}
                                            className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCopyWeeklyRange}
                                className="w-full py-3 md:py-4 bg-primary text-primary-foreground rounded-xl md:rounded-2xl hover:bg-primary/90 transition-all font-black uppercase text-xs md:text-sm tracking-widest shadow-lg flex items-center justify-center gap-2 md:gap-3 active:scale-95"
                            >
                                {copyStatus === 'copied' ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : <Copy className="h-4 w-4 md:h-5 md:w-5" />}
                                {copyStatus === 'copied' ? 'Links Copied!' : 'Copy Batch Links'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline Modal */}
            {selectedTaskId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border-t-4 md:border-t-8 border-t-primary">
                        <div className="p-4 md:p-6 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
                            <div>
                                <h3 className="font-black text-lg md:text-xl uppercase tracking-tight flex items-center gap-2">
                                    <HistoryIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                                    Task Evolution
                                </h3>
                                <div className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Tracing ID: {selectedTaskId}</div>
                            </div>
                            <button onClick={() => setSelectedTaskId(null)} className="p-1.5 md:p-2 hover:bg-muted rounded-full transition-colors">
                                <XIcon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 2xl:p-8 space-y-6 md:space-y-8 scrollbar-thin scrollbar-thumb-primary/20">
                            {isTimelineLoading ? (
                                <div className="h-60 flex items-center justify-center">
                                    <HistoryIcon className="h-10 w-10 text-primary animate-spin" />
                                </div>
                            ) : taskTimeline.length === 0 ? (
                                <div className="h-60 flex flex-col items-center justify-center text-center">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                                    <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">No previous history found for this task.</p>
                                </div>
                            ) : (
                                <div className="relative space-y-12 before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-linear-to-b before:from-primary/50 before:via-primary/20 before:to-transparent">
                                    {taskTimeline.map((item: { date: string, content: string, status: string }, i: number) => {
                                        // Determine status badge color based on status type
                                        const getStatusColor = (status: string) => {
                                            const upperStatus = status.toUpperCase();

                                            // Green for completed/deployed states
                                            if (upperStatus.includes('DONE') || upperStatus.includes('DEPLOYED') || upperStatus.includes('COMPLETED') || upperStatus.includes('FIXED') || upperStatus.includes('RESOLVED')) {
                                                return 'bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20';
                                            }

                                            // Blue for in-progress states
                                            if (upperStatus.includes('PROGRESS') || upperStatus.includes('WORKING') || upperStatus.includes('WIP') || upperStatus.includes('ONGOING')) {
                                                return 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20';
                                            }

                                            // Red for blocked/error states
                                            if (upperStatus.includes('BLOCKED') || upperStatus.includes('ERROR') || upperStatus.includes('FAILED') || upperStatus.includes('ISSUE')) {
                                                return 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20';
                                            }

                                            // Yellow for review/pending states
                                            if (upperStatus.includes('REVIEW') || upperStatus.includes('PENDING') || upperStatus.includes('WAITING')) {
                                                return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20';
                                            }

                                            // Purple for testing states
                                            if (upperStatus.includes('TEST') || upperStatus.includes('QA')) {
                                                return 'bg-purple-500/10 text-purple-600 dark:text-purple-500 border-purple-500/20';
                                            }

                                            // Orange for enhancement/feature states
                                            if (upperStatus.includes('ENH') || upperStatus.includes('FEATURE') || upperStatus.includes('IMPROVEMENT')) {
                                                return 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20';
                                            }

                                            // Default primary color for unknown states
                                            return 'bg-primary/10 text-primary border-primary/20';
                                        };

                                        return (
                                            <div key={i} className="relative pl-12 group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                                <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-background border-4 border-primary shadow-sm z-10 transition-transform group-hover:scale-125" />
                                                <div className="bg-muted/30 border border-border p-5 rounded-2xl group-hover:border-primary/30 transition-all group-hover:bg-muted/50">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2 text-primary">
                                                            <Calendar className="h-4 w-4" />
                                                            <span className="text-sm font-black uppercase tracking-widest">{item.date}</span>
                                                        </div>
                                                        <span className={`px-3 py-1 text-[10px] font-black rounded uppercase tracking-widest border shadow-xs ${getStatusColor(item.status)}`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground font-medium" dangerouslySetInnerHTML={{ __html: renderTagsInHtml(item.content) }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
