import { blockingEngine } from '../../src/services/blocking/blockingEngine';
import { db } from '../../src/db';
import { BlockingModule, addAttemptListener } from '../../src/native/BlockingModule';

jest.mock('../../src/db', () => ({
  db: {
    sessions: {
      getActiveSession: jest.fn(),
      startSession: jest.fn(),
      endSession: jest.fn(),
    },
    blockedAttempts: {
      recordAttempt: jest.fn(),
    }
  }
}));

jest.mock('../../src/native/BlockingModule', () => ({
  BlockingModule: {
    startBlocking: jest.fn(),
    stopBlocking: jest.fn(),
    getActiveBlocking: jest.fn(),
    getPendingBlockedAttempts: jest.fn(),
  },
  addAttemptListener: jest.fn(),
}));

describe('blockingEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startFocusSession', () => {
    it('creates DB row + calls native with correct sessionId/packages', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue(null);
      (db.sessions.startSession as jest.Mock).mockResolvedValue(123);

      const res = await blockingEngine.startFocusSession({ tagId: 'tag1', apps: ['pkg1'] });

      expect(res).toEqual({ sessionId: 123, state: 'active' });
      expect(db.sessions.startSession).toHaveBeenCalledWith(expect.objectContaining({
        tagId: 'tag1',
        strict: 1,
        apps: ['pkg1']
      }));
      expect(BlockingModule.startBlocking).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 123,
        blockedPackages: ['pkg1'],
        strict: true
      }));
    });
  });

  describe('endFocusSession', () => {
    it('writes endedVia nfc + duration + calls stopBlocking', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({ id: 123, startTime: Math.floor(Date.now() / 1000) - 100 });

      const res = await blockingEngine.endFocusSession('nfc');

      expect(res).toEqual({ state: 'idle' });
      expect(db.sessions.endSession).toHaveBeenCalledWith(123, expect.objectContaining({
        endedVia: 'nfc',
        durationSec: expect.any(Number)
      }));
      expect(BlockingModule.stopBlocking).toHaveBeenCalled();
    });

    it('writes override', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({ id: 123, startTime: Math.floor(Date.now() / 1000) - 100 });

      const res = await blockingEngine.endFocusSession('override');

      expect(res).toEqual({ state: 'idle' });
      expect(db.sessions.endSession).toHaveBeenCalledWith(123, expect.objectContaining({
        endedVia: 'override'
      }));
    });

    it('writes endedVia with clamped negative duration', async () => {
      const now = Math.floor(Date.now() / 1000);
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({ id: 123, startTime: now + 500 });
      await blockingEngine.endFocusSession('nfc');
      expect(db.sessions.endSession).toHaveBeenCalledWith(123, expect.objectContaining({
        durationSec: 0
      }));
    });
  });

  describe('clampDurationSec', () => {
    it('clamps negative to 0', () => {
      expect(blockingEngine.clampDurationSec(-10)).toBe(0);
    });
    it('clamps huge to MAX_SESSION_SEC', () => {
      expect(blockingEngine.clampDurationSec(99999999)).toBe(24 * 60 * 60);
    });
    it('keeps normal as is', () => {
      expect(blockingEngine.clampDurationSec(3600)).toBe(3600);
    });
  });

  describe('recoverActiveSession', () => {
    it('native-only case restores DB row', async () => {
      (BlockingModule.getActiveBlocking as jest.Mock).mockResolvedValue({
        sessionId: 999,
        blockedPackages: ['pkg2'],
        strict: true,
        startedAt: 12345
      });
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 999 });
      (db.sessions.startSession as jest.Mock).mockResolvedValue(999);
      (BlockingModule.getPendingBlockedAttempts as jest.Mock).mockResolvedValue([]);

      const res = await blockingEngine.recoverActiveSession();

      expect(db.sessions.startSession).toHaveBeenCalledWith({
        tagId: 'recovered',
        startTime: 12345,
        strict: 1,
        apps: ['pkg2']
      });
      expect(res.state).toEqual({ state: 'active' });
    });

    it('db-only case re-enforces native', async () => {
      (BlockingModule.getActiveBlocking as jest.Mock).mockResolvedValue(null);
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({
        id: 111,
        apps: ['pkg3'],
        strict: 1,
        startTime: 54321
      });

      const res = await blockingEngine.recoverActiveSession();

      expect(BlockingModule.startBlocking).toHaveBeenCalledWith({
        sessionId: 111,
        blockedPackages: ['pkg3'],
        strict: true,
        startedAt: 54321
      });
      expect(res.state).toEqual({ state: 'active' });
    });

    it('attempts flushed into db', async () => {
      (BlockingModule.getActiveBlocking as jest.Mock).mockResolvedValue({ startedAt: 0 });
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({ id: 222 });
      (BlockingModule.getPendingBlockedAttempts as jest.Mock).mockResolvedValue([
        { packageName: 'pkg', label: 'App', createdAt: 100 }
      ]);

      await blockingEngine.recoverActiveSession();

      expect(db.blockedAttempts.recordAttempt).toHaveBeenCalledWith({
        sessionId: 222,
        packageName: 'pkg',
        label: 'App',
        createdAt: 100
      });
    });
  });

  describe('attachBlockedAttemptListener', () => {
    it('listener attach returns unsubscribe', () => {
      const unsub = jest.fn();
      (addAttemptListener as jest.Mock).mockReturnValue(unsub);
      
      const res = blockingEngine.attachBlockedAttemptListener(jest.fn());
      
      expect(addAttemptListener).toHaveBeenCalled();
      expect(res).toBe(unsub);
    });
  });
});
