export interface SelectionState {
  [packageName: string]: boolean;
}

export function toggleSelection(state: SelectionState, packageName: string): SelectionState {
  const nextState = { ...state };
  if (nextState[packageName]) {
    delete nextState[packageName];
  } else {
    nextState[packageName] = true;
  }
  return nextState;
}

export function selectedCount(state: SelectionState): number {
  return Object.keys(state).filter(key => state[key]).length;
}
