import { reducer, endedViaForEvent, SessionState, SessionEvent } from '../../src/state/sessionMachine';

describe('sessionMachine', () => {
  describe('reducer', () => {
    it('START idle->active', () => {
      const state: SessionState = { state: 'idle' };
      const event: SessionEvent = { type: 'START' };
      expect(reducer(state, event)).toEqual({ state: 'active' });
    });

    it('rejects START when already active', () => {
      const state: SessionState = { state: 'active' };
      const event: SessionEvent = { type: 'START' };
      expect(() => reducer(state, event)).toThrow('already active');
    });

    it('END_NFC active->idle', () => {
      const state: SessionState = { state: 'active' };
      const event: SessionEvent = { type: 'END_NFC' };
      expect(reducer(state, event)).toEqual({ state: 'idle' });
    });

    it('END_OVERRIDE active->idle', () => {
      const state: SessionState = { state: 'active' };
      const event: SessionEvent = { type: 'END_OVERRIDE' };
      expect(reducer(state, event)).toEqual({ state: 'idle' });
    });

    it('END_NFC idle->idle no-op', () => {
      const state: SessionState = { state: 'idle' };
      const event: SessionEvent = { type: 'END_NFC' };
      expect(reducer(state, event)).toEqual({ state: 'idle' });
    });

    it('FORCE_KILL_RECOVER active->active', () => {
      const state: SessionState = { state: 'active' };
      const event: SessionEvent = { type: 'FORCE_KILL_RECOVER' };
      expect(reducer(state, event)).toEqual({ state: 'active' });
    });

    it('SERVICE_KILL_RECOVER active->active', () => {
      const state: SessionState = { state: 'active' };
      const event: SessionEvent = { type: 'SERVICE_KILL_RECOVER' };
      expect(reducer(state, event)).toEqual({ state: 'active' });
    });

    it('BOOT_RECOVER active->active', () => {
      const state: SessionState = { state: 'active' };
      const event: SessionEvent = { type: 'BOOT_RECOVER' };
      expect(reducer(state, event)).toEqual({ state: 'active' });
    });

    it('recover events idle->idle', () => {
      const state: SessionState = { state: 'idle' };
      expect(reducer(state, { type: 'FORCE_KILL_RECOVER' })).toEqual({ state: 'idle' });
      expect(reducer(state, { type: 'SERVICE_KILL_RECOVER' })).toEqual({ state: 'idle' });
      expect(reducer(state, { type: 'BOOT_RECOVER' })).toEqual({ state: 'idle' });
    });
  });

  describe('endedViaForEvent', () => {
    it('mapping incl null for START/recover', () => {
      expect(endedViaForEvent({ type: 'END_NFC' })).toBe('nfc');
      expect(endedViaForEvent({ type: 'END_TIMER' })).toBe('timer');
      expect(endedViaForEvent({ type: 'END_OVERRIDE' })).toBe('override');
      expect(endedViaForEvent({ type: 'FORCE_KILL_RECOVER' })).toBe('force_kill');
      expect(endedViaForEvent({ type: 'SERVICE_KILL_RECOVER' })).toBe('service_kill');
      expect(endedViaForEvent({ type: 'START' })).toBe(null);
      expect(endedViaForEvent({ type: 'BOOT_RECOVER' })).toBe(null);
    });
  });
});
