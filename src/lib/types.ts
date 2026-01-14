export type AppStatus = {
  id?: string | number;
  app: string;
  content: string;
};

export type StatusPayload = {
  v: 1 | 2; // schema version
  name: string;
  date: string;
  apps: AppStatus[];
  customTags?: import('./tags').StatusTag[];
};

export type NormalizedEntry = {
  name: string;
  app: string;
  content: string;
};

export type MergeMode = 'app-wise' | 'person-wise';