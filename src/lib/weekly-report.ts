import { StatusPayload, AppStatus } from './types';

export interface WeeklyItem {
    id: string;
    content: string; // The HTML content
    lastSeenDate: string;
}

export interface WeeklyReportOutput {
    inProgress: WeeklyItem[];
    deployed: WeeklyItem[];
}

/**
 * Extract all unique application names from a list of payloads
 * Grouping is case-insensitive
 */
export function extractAppNames(payloads: StatusPayload[]): string[] {
    const apps = new Set<string>();
    payloads.forEach(p => {
        p.apps.forEach(a => {
            // Normalize name? Users usually want to see the exact name they typed first,
            // but for filtering we should be loose.
            // Let's store the "Display Name" (first encounter) but key by lowercase.
            // For simplicity here, just collecting all raw names.
            // The UI can handle deduplication/selection.
            if (a.app.trim()) apps.add(a.app.trim());
        });
    });
    return Array.from(apps).sort();
}

/**
 * Generate a Weekly Report for a specific application
 */
export function generateWeeklyReport(payloads: StatusPayload[], selectedApp: string): WeeklyReportOutput {
    // 1. Filter payloads to only those containing the selected app
    // Use case-insensitive matching for app name
    const relevantPayloads = payloads.filter(p =>
        p.apps.some(a => a.app.trim().toLowerCase() === selectedApp.trim().toLowerCase())
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by Date ASC

    if (relevantPayloads.length === 0) {
        return { inProgress: [], deployed: [] };
    }

    // 2. Identify the "Latest Date" (The reference for "In Progress")
    const lastPayload = relevantPayloads[relevantPayloads.length - 1];
    const lastPayloadDate = lastPayload.date;

    // We need to know exactly which IDs are present on the Final Day
    const latestIds = new Set<string>();
    // Also track the content from the latest day specifically
    const latestContentMap = new Map<string, string>();


    // Helper to parse items from an HTML string
    const parseItems = (html: string): { id: string | null; content: string }[] => {
        if (typeof window === 'undefined') return []; // Server-side guard
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const items: { id: string | null; content: string }[] = [];

        // We only care about explicit list items <li>
        const listItems = doc.querySelectorAll('li');
        listItems.forEach(li => {
            const id = li.getAttribute('data-id');
            // We preserve the innerHTML (content) or outerHTML? 
            // User wants "preserve html". 
            // Usually, in a report, we want the content *of* the bullet point.
            // But if there are nested lists, outerHTML might correspond to the nesting?
            // Let's stick to innerHTML for the "Text" but if we want to render it as a list later,
            // we'll need to wrap it.
            // Actually, for "Merging", we usually take the inner content.
            items.push({ id, content: li.innerHTML });
        });
        return items;
    };

    // 3. Build a map of ALL items seen across the week
    // Key: ID, Value: Latest version of that item
    const allItems = new Map<string, WeeklyItem>();

    relevantPayloads.forEach(payload => {
        const appEntry = payload.apps.find(a => a.app.trim().toLowerCase() === selectedApp.trim().toLowerCase());
        if (!appEntry) return;

        const parsed = parseItems(appEntry.content);

        parsed.forEach(item => {
            // If no ID, we can't track it effectively. 
            // Decision: Ignore items without IDs for the "Weekly Report" logic?
            // Or treat them as ephemeral?
            // For now, only track items with IDs.
            if (item.id) {
                allItems.set(item.id, {
                    id: item.id,
                    content: item.content, // Always update to latest content (e.g. text fixes)
                    lastSeenDate: payload.date
                });

                if (payload.date === lastPayloadDate) {
                    latestIds.add(item.id);
                }
            }
        });
    });

    // 4. Categorize
    const inProgress: WeeklyItem[] = [];
    const deployed: WeeklyItem[] = [];

    allItems.forEach(item => {
        if (latestIds.has(item.id)) {
            inProgress.push(item);
        } else {
            deployed.push(item);
        }
    });

    return { inProgress, deployed };
}
