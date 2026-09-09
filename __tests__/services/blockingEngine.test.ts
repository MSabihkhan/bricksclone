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
    },
    tags: {
      getTagById: jest.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: jest.fn().mockResolvedValue(undefined),
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

    it('rejects a second start before creating another row', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({ id: 42 });

      await expect(blockingEngine.startFocusSession({ tagId: 'tag1', apps: ['pkg1'] }))
        .rejects.toThrow('already active');

      expect(db.sessions.startSession).not.toHaveBeenCalled();
      expect(BlockingModule.startBlocking).not.toHaveBeenCalled();
    });

    it('closes the database session when native startup fails', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue(null);
      (db.sessions.startSession as jest.Mock).mockResolvedValue(124);
      (BlockingModule.startBlocking as jest.Mock).mockRejectedValueOnce(new Error('native failed'));

      await expect(blockingEngine.startFocusSession({ tagId: 'tag1', apps: ['pkg1'] }))
        .rejects.toThrow('native failed');

      expect(db.sessions.endSession).toHaveBeenCalledWith(124, {
        endedVia: 'start_failed',
        durationSec: 0,
        endTime: expect.any(Number),
      });
      expect(BlockingModule.stopBlocking).toHaveBeenCalled();
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

    it('does not close the database row when native shutdown fails', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({ id: 123, startTime: 1 });
      (BlockingModule.stopBlocking as jest.Mock).mockRejectedValueOnce(new Error('stop failed'));

      await expect(blockingEngine.endFocusSession('nfc')).rejects.toThrow('stop failed');

      expect(db.sessions.endSession).not.toHaveBeenCalled();
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
        plannedEndTime: null,
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
        startedAt: 54321,
        plannedEndTime: null
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

    it('auto-completes an elapsed timed database session during recovery', async () => {
      const startTime = Math.floor(Date.now() / 1000) - 120;
      (BlockingModule.getActiveBlocking as jest.Mock).mockResolvedValue(null);
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({
        id: 333,
        startTime,
        plannedEndTime: startTime + 60,
      });

      const res = await blockingEngine.recoverActiveSession();

      expect(db.sessions.endSession).toHaveBeenCalledWith(333, {
        endedVia: 'timer',
        durationSec: 60,
        endTime: startTime + 60,
      });
      expect(res.state).toEqual({ state: 'idle' });
      expect(res.enforcementHealth).toBe('inactive');
    });

    it('reconciles mismatched native and database session IDs', async () => {
      (BlockingModule.getActiveBlocking as jest.Mock).mockResolvedValue({
        sessionId: 99,
        blockedPackages: ['old'],
        strict: true,
        startedAt: 10,
      });
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue({
        id: 100,
        apps: ['current'],
        strict: 0,
        startTime: 20,
        plannedEndTime: null,
      });
      (BlockingModule.getPendingBlockedAttempts as jest.Mock).mockResolvedValue([]);

      const res = await blockingEngine.recoverActiveSession();

      expect(BlockingModule.stopBlocking).toHaveBeenCalled();
      expect(BlockingModule.startBlocking).toHaveBeenCalledWith({
        sessionId: 100,
        blockedPackages: ['current'],
        strict: false,
        startedAt: 20,
        plannedEndTime: null,
      });
      expect(res.enforcementHealth).toBe('active');
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

  describe('strict resolution', () => {
    it('takes strict from the Brick that started the session', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue(null);
      (db.sessions.startSession as jest.Mock).mockResolvedValue(7);
      (db.tags.getTagById as jest.Mock).mockResolvedValue({ id: 'TAG1', strict: 0 });

      await blockingEngine.startFocusSession({ tagId: 'TAG1', apps: ['com.x'] });

      expect((db.sessions.startSession as jest.Mock).mock.calls[0][0].strict).toBe(0);
      expect((BlockingModule.startBlocking as jest.Mock).mock.calls[0][0].strict).toBe(false);
    });

    it('falls back to the global setting when the tag is unknown', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue(null);
      (db.sessions.startSession as jest.Mock).mockResolvedValue(8);
      (db.tags.getTagById as jest.Mock).mockResolvedValue(undefined);
      (db.settings.get as jest.Mock).mockResolvedValue('0');

      await blockingEngine.startFocusSession({ tagId: 'GHOST', apps: ['com.x'] });

      expect((db.sessions.startSession as jest.Mock).mock.calls[0][0].strict).toBe(0);
    });

    it('defaults to strict when nothing is configured', async () => {
      (db.sessions.getActiveSession as jest.Mock).mockResolvedValue(null);
      (db.sessions.startSession as jest.Mock).mockResolvedValue(9);
      (db.tags.getTagById as jest.Mock).mockResolvedValue(undefined);
      (db.settings.get as jest.Mock).mockResolvedValue(undefined);

      await blockingEngine.startFocusSession({ tagId: 'GHOST', apps: ['com.x'] });

      expect((db.sessions.startSession as jest.Mock).mock.calls[0][0].strict).toBe(1);
    });
  });
});
