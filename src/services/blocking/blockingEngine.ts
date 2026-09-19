import { db } from '../../db';
import { Session } from '../../db/types';
import { reducer, SessionState } from '../../state/sessionMachine';
import { BlockingModule, addAttemptListener } from '../../native/BlockingModule';

const MAX_SESSION_SEC = 24 * 60 * 60;
export type SessionEndReason = 'nfc' | 'timer' | 'override';
export type EnforcementHealth = 'active' | 'degraded' | 'inactive';

export function clampDurationSec(sec: number): number {
  return Math.max(0, Math.min(sec, MAX_SESSION_SEC));
}

async function startFocusSession(params: { tagId: string; apps: string[] }): Promise<{ sessionId: number; state: 'active' }> {
  const activeSession = await db.sessions.getActiveSession();
  if (activeSession) {
    throw new Error('A focus session is already active');
  }
  const state: SessionState = activeSession ? { state: 'active' } : { state: 'idle' };
  
  const newState = reducer(state, { type: 'START' });
  if (newState.state !== 'active') {
    throw new Error('Invalid state transition');
  }

  // Strict comes from the Brick that started the session, falling back to the global
  // setting, so a "Wind Down" Brick is not locked down as hard as "Deep Work".
  let strict = 1;
  const tag = params.tagId ? await db.tags.getTagById(params.tagId) : undefined;
  if (tag) {
    strict = tag.strict;
  } else {
    const globalStrict = await db.settings.get('strict_mode');
    strict = globalStrict === '0' ? 0 : 1;
  }

  const startedAt = Math.floor(Date.now() / 1000);
  // A missing value intentionally defaults to Brick-only. This prevents upgrades from
  // silently ending a focus session at the Brick's legacy 50-minute duration.
  const sessionEndMode = await db.settings.get('session_end_mode');
  const durationMinutes = tag && tag.duration !== 'inf' ? Number(tag.duration) : NaN;
  const plannedEndTime = sessionEndMode === 'timer' && Number.isFinite(durationMinutes) && durationMinutes > 0
    ? startedAt + durationMinutes * 60
    : null;
  const sessionId = await db.sessions.startSession({
    tagId: params.tagId,
    startTime: startedAt,
    plannedEndTime,
    strict,
    apps: params.apps,
  });

  try {
    await BlockingModule.startBlocking({
      sessionId,
      tagId: params.tagId,
      blockedPackages: params.apps,
      strict: strict === 1,
      startedAt,
      plannedEndTime,
    });
  } catch (error) {
    await db.sessions.endSession(sessionId, {
      endedVia: 'start_failed',
      durationSec: 0,
      endTime: startedAt,
    });
    try { await BlockingModule.stopBlocking(); } catch { /* best-effort cleanup */ }
    throw error;
  }

  return { sessionId, state: 'active' };
}

async function endFocusSession(via: SessionEndReason): Promise<SessionState> {
  const activeSession = await db.sessions.getActiveSession();
  if (!activeSession) {
    return { state: 'idle' };
  }

  const event = via === 'nfc' ? 'END_NFC' : via === 'timer' ? 'END_TIMER' : 'END_OVERRIDE';
  const newState = reducer({ state: 'active' }, { type: event });
  
  const now = Math.floor(Date.now() / 1000);
  await BlockingModule.stopBlocking();

  const effectiveEnd = via === 'timer' && activeSession.plannedEndTime
    ? Math.min(now, activeSession.plannedEndTime)
    : now;
  await db.sessions.endSession(activeSession.id, {
    endedVia: via,
    durationSec: clampDurationSec(effectiveEnd - activeSession.startTime),
    endTime: effectiveEnd,
  });

  return newState;
}

async function recoverActiveSession(): Promise<{ state: SessionState; activeSession: Session | undefined; enforcementHealth: EnforcementHealth }> {
  try {
    const pendingCompletion = await BlockingModule.getPendingSessionCompletion();
    if (pendingCompletion) {
      const pendingSession = await db.sessions.getActiveSession();
      if (pendingSession?.id === pendingCompletion.sessionId) {
        await db.sessions.endSession(pendingSession.id, {
          endedVia: pendingCompletion.endedVia,
          durationSec: clampDurationSec(pendingCompletion.durationSec),
          endTime: pendingCompletion.endTime,
        });
      }
      try {
        const attempts = await BlockingModule.getPendingBlockedAttempts();
        for (const attempt of attempts) {
          await db.blockedAttempts.recordAttempt({
            sessionId: pendingCompletion.sessionId,
            packageName: attempt.packageName,
            label: attempt.label,
            createdAt: attempt.createdAt,
          });
        }
      } finally {
        await BlockingModule.clearPendingSessionCompletion();
      }
    }
  } catch {
    // Leave the marker intact when reconciliation fails so a later launch can retry.
  }

  let nativeActive = null;
  try {
    nativeActive = await BlockingModule.getActiveBlocking();
  } catch {
    // Treat any native failure as "native inactive"
  }
  
  const activeSession = await db.sessions.getActiveSession();
  const now = Math.floor(Date.now() / 1000);

  if (nativeActive?.plannedEndTime && nativeActive.plannedEndTime <= now && !activeSession) {
    try { await BlockingModule.stopBlocking(); } catch { /* the service may already be stopping */ }
    return { state: { state: 'idle' }, activeSession: undefined, enforcementHealth: 'inactive' };
  }

  if (activeSession?.plannedEndTime && activeSession.plannedEndTime <= now) {
    try { await BlockingModule.stopBlocking(); } catch { /* native may already be stopped */ }
    await db.sessions.endSession(activeSession.id, {
      endedVia: 'timer',
      durationSec: clampDurationSec(activeSession.plannedEndTime - activeSession.startTime),
      endTime: activeSession.plannedEndTime,
    });
    return { state: { state: 'idle' }, activeSession: undefined, enforcementHealth: 'inactive' };
  }

  if (nativeActive && !activeSession) {
    const id = await db.sessions.startSession({
      tagId: nativeActive.tagId || 'recovered',
      startTime: nativeActive.startedAt,
      plannedEndTime: nativeActive.plannedEndTime ?? null,
      strict: nativeActive.strict ? 1 : 0,
      apps: nativeActive.blockedPackages,
    });
    
    try {
      const attempts = await BlockingModule.getPendingBlockedAttempts();
      for (const attempt of attempts) {
        await db.blockedAttempts.recordAttempt({
          sessionId: id,
          packageName: attempt.packageName,
          label: attempt.label,
          createdAt: attempt.createdAt
        });
      }
    } catch {
      // ignore
    }
    
    return {
      state: { state: 'active' },
      activeSession: await db.sessions.getActiveSession(),
      enforcementHealth: 'active',
    };
  } else if (activeSession && !nativeActive) {
    let restarted = false;
    try {
      await BlockingModule.startBlocking({
        sessionId: activeSession.id,
        tagId: activeSession.tagId,
        blockedPackages: activeSession.apps,
        strict: activeSession.strict === 1,
        startedAt: activeSession.startTime,
        plannedEndTime: activeSession.plannedEndTime ?? null,
      });
      restarted = true;
    } catch {
      restarted = false;
    }
    return {
      state: { state: 'active' },
      activeSession,
      enforcementHealth: restarted ? 'active' : 'degraded',
    };
  } else if (activeSession && nativeActive) {
    if (nativeActive.sessionId !== activeSession.id) {
      try {
        await BlockingModule.stopBlocking();
        await BlockingModule.startBlocking({
          sessionId: activeSession.id,
          tagId: activeSession.tagId,
          blockedPackages: activeSession.apps,
          strict: activeSession.strict === 1,
          startedAt: activeSession.startTime,
          plannedEndTime: activeSession.plannedEndTime ?? null,
        });
      } catch {
        return { state: { state: 'active' }, activeSession, enforcementHealth: 'degraded' };
      }
    }
    try {
      const attempts = await BlockingModule.getPendingBlockedAttempts();
      for (const attempt of attempts) {
        await db.blockedAttempts.recordAttempt({
          sessionId: activeSession.id,
          packageName: attempt.packageName,
          label: attempt.label,
          createdAt: attempt.createdAt
        });
      }
    } catch {
      // ignore
    }
  }

  const currentState = (activeSession || nativeActive) ? { state: 'active' as const } : { state: 'idle' as const };
  
  return {
    state: currentState,
    activeSession: await db.sessions.getActiveSession(),
    enforcementHealth: currentState.state === 'active' ? 'active' : 'inactive',
  };
}

async function checkEnforcementHealth(): Promise<EnforcementHealth> {
  try {
    const [nativeActive, usage, accessibility] = await Promise.all([
      BlockingModule.isBlockingActive(),
      BlockingModule.hasUsageAccess(),
      BlockingModule.isAccessibilityEnabled(),
    ]);
    return nativeActive && (usage || accessibility) ? 'active' : 'degraded';
  } catch {
    return 'degraded';
  }
}

function attachBlockedAttemptListener(handler: (attempt: { packageName: string; label: string; createdAt: number }) => void): () => void {
  return addAttemptListener((attempt) => {
    handler(attempt);
  });
}

export const blockingEngine = {
  startFocusSession,
  endFocusSession,
  recoverActiveSession,
  attachBlockedAttemptListener,
  clampDurationSec,
  checkEnforcementHealth,
};
