export interface SessionState {
  state: 'idle' | 'active';
}

export type SessionEvent =
  | { type: 'START' }
  | { type: 'END_NFC' }
  | { type: 'END_TIMER' }
  | { type: 'END_OVERRIDE' }
  | { type: 'FORCE_KILL_RECOVER' }
  | { type: 'SERVICE_KILL_RECOVER' }
  | { type: 'BOOT_RECOVER' };

export function reducer(state: SessionState, event: SessionEvent): SessionState {
  if (state.state === 'idle') {
    if (event.type === 'START') {
      return { state: 'active' };
    }
    return state;
  }

  if (state.state === 'active') {
    if (event.type === 'START') {
      throw new Error('A focus session is already active');
    }
    if (event.type === 'END_NFC' || event.type === 'END_TIMER' || event.type === 'END_OVERRIDE') {
      return { state: 'idle' };
    }
    // RECOVER events map active -> active, so return unchanged
    return state;
  }

  return state;
}

export function endedViaForEvent(event: SessionEvent): 'nfc' | 'timer' | 'override' | 'force_kill' | 'service_kill' | null {
  switch (event.type) {
    case 'END_NFC':
      return 'nfc';
    case 'END_TIMER':
      return 'timer';
    case 'END_OVERRIDE':
      return 'override';
    case 'FORCE_KILL_RECOVER':
      return 'force_kill';
    case 'SERVICE_KILL_RECOVER':
      return 'service_kill';
    default:
      return null;
  }
}
