import Dexie, { type Table } from 'dexie';
import type { StatusPayload } from './types';

export interface DailyPayload {
    id?: number;
    date: string;
    appName: string;
    sourceIdentifier: string; // generated from hash or simply 'manual-save'
    payload: StatusPayload;
    createdAt: number;
}

class StatusGeneratorDB extends Dexie {
    dailyPayloads!: Table<DailyPayload>;

    constructor() {
        super('statusGeneratorDB');
        this.version(1).stores({
            dailyPayloads: '++id, [date+appName], date, appName, createdAt'
        });
    }
}

export const db = new StatusGeneratorDB();

export async function saveDailyStatus(payload: StatusPayload, sourceIdentifier: string = 'manual-save') {
    // We save each app status individually to allow granular retrieval
    const promises = payload.apps.map(async (app) => {
        const existing = await db.dailyPayloads
            .where({ date: payload.date, appName: app.app })
            .first();

        const record: Omit<DailyPayload, 'id'> = {
            date: payload.date,
            appName: app.app,
            sourceIdentifier,
            payload: {
                ...payload,
                apps: [app] // Store only this app's data in the snapshot
            },
            createdAt: Date.now()
        };

        if (existing) {
            await db.dailyPayloads.update(existing.id!, record);
        } else {
            await db.dailyPayloads.add(record as DailyPayload);
        }
    });

    await Promise.all(promises);
}

export async function getLastStatus(appName: string, beforeDate: string): Promise<StatusPayload | null> {
    const record = await db.dailyPayloads
        .where('appName')
        .equals(appName)
        .and(item => item.date < beforeDate)
        .reverse()
        .sortBy('date') // Sort by date descending
        .then(items => items[0]); // Get the first one (latest date before today)

    return record ? record.payload : null;
}

export async function getStatusForDate(appName: string, date: string): Promise<StatusPayload | null> {
    const record = await db.dailyPayloads
        .where({ date: date, appName: appName })
        .first();

    return record ? record.payload : null;
}

export async function getLatestStatusDate(): Promise<string | null> {
    const record = await db.dailyPayloads
        .orderBy('date')
        .reverse()
        .first();
    return record ? record.date : null;
}

export async function getAppsForDate(date: string): Promise<StatusPayload[]> {
    const records = await db.dailyPayloads
        .where('date')
        .equals(date)
        .toArray();
    return records.map(r => r.payload);
}
