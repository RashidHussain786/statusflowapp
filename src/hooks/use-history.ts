import { useState, useEffect, useMemo } from 'react';
import { db, DailyPayload } from '@/lib/indexeddb';
import { splitMultiStatusPayloads } from '@/lib/encoding';
import { renderTagsInHtml } from '@/lib/tags';
import { AppStatus } from '@/lib/types';

export interface StatusGroup {
    id: string; // name-date-type
    name: string;
    date: string;
    entries: DailyPayload[];
}

export function useHistory() {
    const [entries, setEntries] = useState<DailyPayload[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Unified History Filters
    const [selectedType, setSelectedType] = useState<DailyPayload['type'] | 'all'>('all');
    const [selectedPerson, setSelectedPerson] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Weekly Batch State
    const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
    const [weeklyStartDate, setWeeklyStartDate] = useState('');
    const [weeklyEndDate, setWeeklyEndDate] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

    // Timeline State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [taskTimeline, setTaskTimeline] = useState<{ date: string, content: string, status: string }[]>([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(10);
    const PAGE_SIZE = 10;

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

    // Unique Names for filter
    const uniqueNames = useMemo(() => {
        const names = new Set<string>();
        entries.forEach((e: DailyPayload) => {
            if (e.name && e.name.trim()) {
                names.add(e.name.trim());
            }
        });
        return Array.from(names).sort();
    }, [entries]);

    // Filtered entries (everything that matches search/filters)
    const filteredEntries = useMemo(() => {
        return entries.filter((e: DailyPayload) => {
            const matchesSearch = !searchQuery.trim() ||
                e.payload.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.payload.apps.some((app: AppStatus) => app.content.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesType = selectedType === 'all' || e.type === selectedType;
            const matchesPerson = selectedPerson === 'all' || e.name === selectedPerson;

            // Date range filtering
            const matchesDateRange = (() => {
                if (!startDate && !endDate) return true;
                const entryDate = e.date;
                if (startDate && entryDate < startDate) return false;
                if (endDate && entryDate > endDate) return false;
                return true;
            })();

            return matchesSearch && matchesType && matchesPerson && matchesDateRange;
        });
    }, [entries, searchQuery, selectedType, selectedPerson, startDate, endDate]);

    // Grouping
    const groupedEntries = useMemo(() => {
        const groups = new Map<string, StatusGroup>();
        filteredEntries.forEach((entry: DailyPayload) => {
            const id = `${entry.payload.name}-${entry.date}-${entry.type}`;
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
    }, [filteredEntries]);

    // Paged groups for the list view
    const pagedGroups = useMemo(() => {
        return groupedEntries.slice(0, visibleCount);
    }, [groupedEntries, visibleCount]);

    const hasMore = visibleCount < groupedEntries.length;

    const loadMore = () => {
        setVisibleCount((prev: number) => prev + PAGE_SIZE);
    };

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

        entries.forEach((entry: DailyPayload) => {
            // Only calculate insights for individual status reports
            if (entry.type !== 'individual') return;

            entry.payload.apps.forEach((app: AppStatus) => {
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
            const rangeEntries = entries.filter((e: DailyPayload) => {
                const matchesPerson = selectedPerson === 'all' || e.name === selectedPerson;
                return e.type === 'individual' &&
                    e.date >= weeklyStartDate &&
                    e.date <= weeklyEndDate &&
                    matchesPerson;
            });
            if (rangeEntries.length === 0) {
                alert('No statuses found in this date range.');
                return;
            }
            const payloads = rangeEntries.map(e => e.payload);
            const fragments = splitMultiStatusPayloads(payloads);
            const namesInRanges = new Set(rangeEntries.map(e => e.name));
            let personNameForLabel: string;

            if (namesInRanges.size === 1) {
                personNameForLabel = Array.from(namesInRanges)[0];
            } else {
                personNameForLabel = 'Team';
            }

            const baseLabel = `${personNameForLabel} Weekly Status (${weeklyStartDate} to ${weeklyEndDate})`;

            let html = '';
            let text = '';

            fragments.forEach((fragment, i) => {
                const fullUrl = `${window.location.origin}/create-weekly${fragment}`;
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
                .filter((e: DailyPayload) => e.payload.apps.some((app: AppStatus) => app.content.includes(`data-id="${taskId}"`)))
                .map((e: DailyPayload) => {
                    const app = e.payload.apps.find((a: AppStatus) => a.content.includes(`data-id="${taskId}"`))!;
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

    const toggleGroup = (id: string) => {
        setExpandedGroups((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return {
        entries,
        uniqueNames,
        filteredEntries,
        groupedEntries,
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
    };
}
