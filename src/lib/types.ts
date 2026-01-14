export type AppStatus = {
  app: string;
  content: string; // HTML content from TipTap editor with tag data attributes
};

export type StatusPayload = {
  v: 1 | 2; // schema version
  name: string;
  date: string; // ISO date string
  apps: AppStatus[];
  customTags?: import('./tags').StatusTag[]; // Optional for backward compatibility
};

export type NormalizedEntry = {
  name: string;
  app: string;
  content: string; // HTML content
};

export type MergeMode = 'app-wise' | 'person-wise';