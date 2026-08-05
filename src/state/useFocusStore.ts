import { create, type StoreApi } from 'zustand';
import { db } from '../db';
import type { Session } from '../db/types';
import { blockingEngine } from '../services/blocking/blockingEngine';

export interface FocusState {
  machine: 'idle' | 'active';
  activeSession: Session | null;
  todayFocusSec: number;
  blockedToday: number;
  streakDays: number;
  liveBlocked: number;
  timerTick: number;
  hydrate: () => Promise<void>;
  startSession: (tagId: string) => Promise<void>;
  endSession: (via: 'nfc' | 'override') => Promise<void>;
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let detachAttemptListener: (() => void) | null = null;

function attachListener(activeSessionId: number, set: StoreApi<FocusState>['setState']) {
  if (detachAttemptListener) return;
  detachAttemptListener = blockingEngine.attachBlockedAttemptListener((attempt) => {
    db.blockedAttempts.recordAttempt({
      sessionId: activeSessionId,
      packageName: attempt.packageName,
      label: attempt.label,
      createdAt: attempt.createdAt
    }).catch(() => {});
    set((s: FocusState) => ({ liveBlocked: s.liveBlocked + 1 }));
  });
}

export const useFocusStore = create<FocusState>((set, _get) => ({
  machine: 'idle',
  activeSession: null,
  todayFocusSec: 0,
  blockedToday: 0,
  streakDays: 0,
  liveBlocked: 0,
  timerTick: 0,

  hydrate: async () => {
    const { state, activeSession } = await blockingEngine.recoverActiveSession();
    set({ machine: state.state, activeSession: activeSession || null });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const startUnix = Math.floor(startOfDay.getTime() / 1000);
    const endUnix = Math.floor(endOfDay.getTime() / 1000);
    
    const sessions = await db.sessions.sessionsBetween(startUnix, endUnix);
    
    const now = Math.floor(Date.now() / 1000);
    const todayFocusSec = sessions.reduce((acc, s) => {
      const dur = s.endTime ? (s.durationSec || 0) : (now - s.startTime);
      return acc + dur;
    }, 0);
    
    const streakDays = sessions.length > 0 ? 1 : 0;
    
    set({ todayFocusSec, streakDays });

    if (state.state === 'active') {
      if (activeSession) {
        attachListener(activeSession.id, set);
      }
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        set((s) => ({ timerTick: s.timerTick + 1, todayFocusSec: s.todayFocusSec + 1 }));
      }, 1000);
    }
  },

  startSession: async (tagId: string) => {
    const apps = await db.blockedApps.listBlockedApps();
    const appIds = apps.map((a) => a.packageName);
    await blockingEngine.startFocusSession({ tagId, apps: appIds });
    
    const session = await db.sessions.getActiveSession();
    
    if (session) {
      attachListener(session.id, set);
    }
    
    set({ machine: 'active', activeSession: session || null, liveBlocked: 0 });
    
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      set((s) => ({ timerTick: s.timerTick + 1, todayFocusSec: s.todayFocusSec + 1 }));
    }, 1000);
  },

  endSession: async (via: 'nfc' | 'override') => {
    if (detachAttemptListener) {
      detachAttemptListener();
      detachAttemptListener = null;
    }
    await blockingEngine.endFocusSession(via);
    set({ machine: 'idle', activeSession: null });
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
}));
