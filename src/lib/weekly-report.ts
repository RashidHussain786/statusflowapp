import { StatusPayload, AppStatus } from './types';

export interface WeeklyItem {
    id: string;
    content: string; // The HTML content
    lastSeenDate: string;
}

export interface CategoryConfig {
    name: string;
    tags: string[];
}

export interface CategorizedReport {
    category: string;
    items: WeeklyItem[];
}

/**
 * Extract all unique application names from a list of payloads
 * Grouping is case-insensitive
 */
export function extractAppNames(payloads: StatusPayload[]): string[] {
    const apps = new Set<string>();
    payloads.forEach(p => {
        p.apps.forEach(a => {
            if (a.app.trim()) apps.add(a.app.trim());
        });
    });
    return Array.from(apps).sort();
}

/**
 * Extract all unique tags (e.g. [TAG]) for a specific application from payloads
 */
export function extractAvailableTags(payloads: StatusPayload[], selectedApp: string): string[] {
    const tags = new Set<string>();
    // Updated regex to support more characters and mixed case
    const tagRegex = /\[[A-Za-z0-9\s\-_\.]+\]/g;

    const relevantApps = payloads.flatMap(p =>
        p.apps.filter(a => a.app.trim().toLowerCase() === selectedApp.trim().toLowerCase())
    );

    relevantApps.forEach(app => {
        const matches = app.content.match(tagRegex);
        if (matches) {
            matches.forEach(tag => tags.add(tag.toUpperCase()));
        }
    });

    return Array.from(tags).sort();
}

/**
 * Generate a Weekly Report for a specific application with custom categorization
 * Respects strict ordering and supports non-exclusive tag matching.
 */
export function generateWeeklyReport(
    payloads: StatusPayload[],
    selectedApp: string,
    configs?: CategoryConfig[]
): CategorizedReport[] {
    // 1. Filter payloads to only those containing the selected app
    const relevantPayloads = payloads.filter(p =>
        p.apps.some(a => a.app.trim().toLowerCase() === selectedApp.trim().toLowerCase())
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (relevantPayloads.length === 0) {
        return [];
    }

    const lastPayload = relevantPayloads[relevantPayloads.length - 1];
    const latestIds = new Set<string>();

    const parseItems = (html: string): { id: string | null; content: string }[] => {
        if (typeof window === 'undefined') return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const items: { id: string | null; content: string }[] = [];

        const listItems = doc.querySelectorAll('li');
        listItems.forEach(li => {
            const id = li.getAttribute('data-id');
            items.push({ id, content: li.innerHTML });
        });
        return items;
    };

    const allItems = new Map<string, WeeklyItem>();

    relevantPayloads.forEach(payload => {
        const appEntry = payload.apps.find(a => a.app.trim().toLowerCase() === selectedApp.trim().toLowerCase());
        if (!appEntry) return;

        const parsed = parseItems(appEntry.content);
        parsed.forEach(item => {
            if (item.id) {
                allItems.set(item.id, {
                    id: item.id,
                    content: item.content,
                    lastSeenDate: payload.date
                });
                if (payload.date === lastPayload.date) {
                    latestIds.add(item.id);
                }
            }
        });
    });

    // 2. Identify the pools
    // "Deployed" is exclusive priority
    const deployedCategory = configs?.find(c =>
        c.name.toLowerCase().includes('deployed') || c.name.toLowerCase().includes('completed')
    );

    const poolDeployed: WeeklyItem[] = [];
    const poolActive: WeeklyItem[] = [];

    Array.from(allItems.values()).forEach(item => {
        const isHistoricallyDeployed = !latestIds.has(item.id);

        let matchesDeployedTag = false;
        if (deployedCategory) {
            const patterns = deployedCategory.tags.map(t => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
            matchesDeployedTag = patterns.some(p => p.test(item.content));
        }

        if (isHistoricallyDeployed || matchesDeployedTag) {
            poolDeployed.push(item);
        } else {
            poolActive.push(item);
        }
    });

    // 3. Build report in STRICT ORDER with Non-Exclusive mapping for active items
    const result: CategorizedReport[] = [];
    const matchedActiveIds = new Set<string>();
    let usedDeployed = false;

    if (configs && configs.length > 0) {
        configs.forEach(config => {
            // Is this the deployed category? (Always exclusive)
            if (config === deployedCategory) {
                if (poolDeployed.length > 0) {
                    result.push({ category: config.name, items: poolDeployed });
                }
                usedDeployed = true;
                return;
            }

            // Normal Category (Non-Exclusive mapping)
            const matched: WeeklyItem[] = [];
            const patterns = config.tags.map(t => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

            if (patterns.length > 0) {
                poolActive.forEach(item => {
                    if (patterns.some(p => p.test(item.content))) {
                        matched.push(item);
                        matchedActiveIds.add(item.id);
                    }
                });
            }

            if (matched.length > 0) {
                result.push({ category: config.name, items: matched });
            }
        });
    }

    // 4. Handle Leftovers (Active items that didn't match any config)
    const leftovers = poolActive.filter(item => !matchedActiveIds.has(item.id));
    if (leftovers.length > 0) {
        result.push({ category: 'Other / Uncategorized', items: leftovers });
    }

    // Finally, if Deployed wasn't in the config but we have items, add it at the bottom
    if (!usedDeployed && poolDeployed.length > 0) {
        result.push({ category: 'Deployed / Completed', items: poolDeployed });
    }

    return result;
}
