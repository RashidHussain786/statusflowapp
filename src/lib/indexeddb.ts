import Dexie, { type Table } from 'dexie';
import type { StatusPayload } from './types';

export type HistoryRecordType = 'individual' | 'team' | 'weekly';

export interface DailyPayload {
    id?: number;
    date: string;
    name: string; // The person's name this belongs to
    type: HistoryRecordType;
    sourceIdentifier: string;
    payload: StatusPayload;
    createdAt: number;
}

class StatusGeneratorDB extends Dexie {
    dailyPayloads!: Table<DailyPayload>;

    constructor() {
        super('statusGeneratorDB');
        this.version(1).stores({
            dailyPayloads: '++id, [date+name+type], date, name, type, createdAt'
        });
    }
}

export const db = new StatusGeneratorDB();

export async function saveDailyStatus(
    payload: StatusPayload,
    type: HistoryRecordType = 'individual',
    sourceIdentifier: string = 'manual-save'
) {
    const record: Omit<DailyPayload, 'id'> = {
        date: payload.date,
        name: payload.name.trim(),
        type,
        sourceIdentifier,
        payload,
        createdAt: Date.now()
    };

    const existing = await db.dailyPayloads
        .where({ date: payload.date, name: payload.name.trim(), type })
        .first();

    if (existing) {
        await db.dailyPayloads.update(existing.id!, record);
    } else {
        await db.dailyPayloads.add(record as DailyPayload);
    }
}

export async function getLastStatus(name: string, beforeDate: string): Promise<StatusPayload | null> {
    const records = await db.dailyPayloads
        .where('type')
        .equals('individual')
        .and(item => item.date < beforeDate)
        .reverse()
        .sortBy('date');

    // Find the latest record that contains this app
    for (const record of records) {
        const appData = record.payload.apps.find(a => a.app.toLowerCase() === name.toLowerCase());
        if (appData) {
            return {
                ...record.payload,
                apps: [appData]
            };
        }
    }

    return null;
}

export async function getStatusForDate(
    name: string,
    date: string,
    type: HistoryRecordType = 'individual'
): Promise<StatusPayload | null> {
    const record = await db.dailyPayloads
        .where({ date, name, type })
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
        .and(item => item.type === 'individual')
        .toArray();
    return records.map(r => r.payload);
}
