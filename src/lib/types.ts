export type AppStatus = {
  app: string;
  content: string; // HTML content from TipTap editor
};

export type StatusPayload = {
  v: 1; // schema version
  name: string;
  date: string; // ISO date string
  apps: AppStatus[];
};

export type NormalizedEntry = {
  name: string;
  app: string;
  content: string; // HTML content
};

export type MergeMode = 'app-wise' | 'person-wise';