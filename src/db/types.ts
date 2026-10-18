export interface Tag {
  id: string;
  name: string;
  location: string | null;
  mode: string;
  categories: Record<string, boolean>;
  duration: string;
  strict: number;
  createdAt: number;
  /** Apps this key blocks. null/undefined = the main blocked-apps list. */
  apps?: string[] | null;
}

export interface BlockedApp {
  packageName: string;
  label: string;
  addedAt: number;
}

export interface Session {
  id: number;
  tagId: string | null;
  startTime: number;
  endTime: number | null;
  durationSec: number | null;
  plannedEndTime?: number | null;
  endedVia: string | null;
  strict: number;
  apps: string[];
  routineType: string;
  intention: string | null;
  outcome: 'done' | 'partial' | 'not_done' | null;
  nextStep: string | null;
  laterNote: string | null;
}

export interface BlockedAttempt {
  id: number;
  sessionId: number;
  packageName: string;
  label: string;
  createdAt: number;
}
