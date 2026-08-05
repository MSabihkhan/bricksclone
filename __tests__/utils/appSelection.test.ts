import { toggleSelection, selectedCount, SelectionState } from '../../src/utils/appSelection';

describe('appSelection utils', () => {
  it('toggle add/remove idempotent', () => {
    let state: SelectionState = {};
    
    state = toggleSelection(state, 'com.test.app');
    expect(state['com.test.app']).toBe(true);
    
    state = toggleSelection(state, 'com.test.app');
    expect(state['com.test.app']).toBeUndefined();
    
    state = toggleSelection(state, 'com.test.app');
    expect(state['com.test.app']).toBe(true);
  });

  it('selectedCount', () => {
    const state: SelectionState = {
      'app1': true,
      'app2': false,
      'app3': true,
    };
    expect(selectedCount(state)).toBe(2);
  });
});
