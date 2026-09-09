import { useFocusStore } from '../../src/state/useFocusStore';
import { db } from '../../src/db';
import { blockingEngine } from '../../src/services/blocking/blockingEngine';

jest.mock('../../src/db', () => ({
  db: {
    sessions: {
      sessionsBetween: jest.fn().mockResolvedValue([]),
      getActiveSession: jest.fn().mockResolvedValue(null),
      listSessions: jest.fn().mockResolvedValue([]),
    },
    blockedApps: {
      listBlockedApps: jest.fn().mockResolvedValue([{ packageName: 'com.test.app' }]),
    },
    blockedAttempts: {
      recordAttempt: jest.fn().mockResolvedValue(null),
    },
  },
}));

jest.mock('../../src/services/blocking/blockingEngine', () => ({
  blockingEngine: {
    recoverActiveSession: jest.fn().mockResolvedValue({
      state: { state: 'idle' },
      activeSession: null,
    }),
    startFocusSession: jest.fn().mockResolvedValue({}),
    endFocusSession: jest.fn().mockResolvedValue({}),
    attachBlockedAttemptListener: jest.fn(),
  },
}));

describe('useFocusStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useFocusStore.setState({
      machine: 'idle',
      activeSession: null,
      todayFocusSec: 0,
      blockedToday: 0,
      streakDays: 0,
      liveBlocked: 0,
      timerTick: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hydrate sets machine from recoverActiveSession result', async () => {
    (blockingEngine.recoverActiveSession as jest.Mock).mockResolvedValueOnce({
      state: { state: 'active' },
      activeSession: { id: 1, tagId: 't1' },
    });

    await useFocusStore.getState().hydrate();

    expect(useFocusStore.getState().machine).toBe('active');
    expect(useFocusStore.getState().activeSession).toEqual({ id: 1, tagId: 't1' });
  });

  it('startSession calls startFocusSession with apps and flips machine to active', async () => {
    await useFocusStore.getState().startSession('tag-1');

    expect(db.blockedApps.listBlockedApps).toHaveBeenCalled();
    expect(blockingEngine.startFocusSession).toHaveBeenCalledWith({
      tagId: 'tag-1',
      apps: ['com.test.app'],
    });
    expect(useFocusStore.getState().machine).toBe('active');
  });

  it('endSession calls endFocusSession and flips to idle', async () => {
    useFocusStore.setState({ machine: 'active', activeSession: { id: 1 } as any });

    await useFocusStore.getState().endSession('nfc');

    expect(blockingEngine.endFocusSession).toHaveBeenCalledWith('nfc');
    expect(useFocusStore.getState().machine).toBe('idle');
    expect(useFocusStore.getState().activeSession).toBeNull();
  });

  it('startSession attaches listener and records live attempts, endSession detaches', async () => {
    let capturedHandler: any;
    const unsub = jest.fn();
    (blockingEngine.attachBlockedAttemptListener as jest.Mock).mockImplementation((handler) => {
      capturedHandler = handler;
      return unsub;
    });
    (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({ id: 7 });

    await useFocusStore.getState().startSession('tag-1');

    expect(blockingEngine.attachBlockedAttemptListener).toHaveBeenCalled();
    expect(useFocusStore.getState().liveBlocked).toBe(0);

    // Invoke the captured handler
    capturedHandler({ packageName: 'com.distract', label: 'Distract', createdAt: 1234 });

    expect(db.blockedAttempts.recordAttempt).toHaveBeenCalledWith({
      sessionId: 7,
      packageName: 'com.distract',
      label: 'Distract',
      createdAt: 1234
    });
    expect(useFocusStore.getState().liveBlocked).toBe(1);

    await useFocusStore.getState().endSession('nfc');
    expect(unsub).toHaveBeenCalled();
  });
});
