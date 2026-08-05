import { db } from '../../db';
import { Session } from '../../db/types';
import { reducer, SessionState } from '../../state/sessionMachine';
import { BlockingModule, addAttemptListener } from '../../native/BlockingModule';

const MAX_SESSION_SEC = 24 * 60 * 60;

export function clampDurationSec(sec: number): number {
  return Math.max(0, Math.min(sec, MAX_SESSION_SEC));
}

async function startFocusSession(params: { tagId: string; apps: string[] }): Promise<{ sessionId: number; state: 'active' }> {
  const activeSession = await db.sessions.getActiveSession();
  const state: SessionState = activeSession ? { state: 'active' } : { state: 'idle' };
  
  const newState = reducer(state, { type: 'START' });
  if (newState.state !== 'active') {
    throw new Error('Invalid state transition');
  }

  const startedAt = Math.floor(Date.now() / 1000);
  const sessionId = await db.sessions.startSession({
    tagId: params.tagId,
    startTime: startedAt,
    strict: 1,
    apps: params.apps,
  });

  await BlockingModule.startBlocking({
    sessionId,
    blockedPackages: params.apps,
    strict: true,
    startedAt,
  });

  return { sessionId, state: 'active' };
}

async function endFocusSession(via: 'nfc' | 'override'): Promise<SessionState> {
  const activeSession = await db.sessions.getActiveSession();
  if (!activeSession) {
    return { state: 'idle' };
  }

  const newState = reducer({ state: 'active' }, { type: via === 'nfc' ? 'END_NFC' : 'END_OVERRIDE' });
  
  const now = Math.floor(Date.now() / 1000);
  const durationSec = clampDurationSec(now - activeSession.startTime);
  
  await db.sessions.endSession(activeSession.id, {
    endedVia: via,
    durationSec,
  });

  await BlockingModule.stopBlocking();

  return newState;
}

async function recoverActiveSession(): Promise<{ state: SessionState; activeSession: Session | undefined }> {
  let nativeActive = null;
  try {
    nativeActive = await BlockingModule.getActiveBlocking();
  } catch {
    // Treat any native failure as "native inactive"
  }
  
  const activeSession = await db.sessions.getActiveSession();

  if (nativeActive && !activeSession) {
    const id = await db.sessions.startSession({
      tagId: 'recovered',
      startTime: nativeActive.startedAt,
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
      activeSession: await db.sessions.getActiveSession()
    };
  } else if (activeSession && !nativeActive) {
    try {
      await BlockingModule.startBlocking({
        sessionId: activeSession.id,
        blockedPackages: activeSession.apps,
        strict: activeSession.strict === 1,
        startedAt: activeSession.startTime,
      });
    } catch {
      // ignore
    }
  } else if (activeSession && nativeActive) {
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
    activeSession: await db.sessions.getActiveSession()
  };
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
};
