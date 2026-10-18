import { create } from 'zustand';

/**
 * Screen-level state around a running session, shared by Home and the tab bar: whether the
 * focus screen has been minimised to Home (the session keeps running either way).
 */
interface FocusUi {
  minimized: boolean;
  setMinimized: (v: boolean) => void;
  /** A "pair a new key" scan is open: taps go to it, not to tap-to-start. */
  pairing: boolean;
  setPairing: (v: boolean) => void;
  /** "Start focusing now" on Key ready: Home brings this key to the top and asks the intention. */
  startWith: string | null;
  setStartWith: (tagId: string | null) => void;
}

export const useFocusUi = create<FocusUi>(set => ({
  minimized: false,
  setMinimized: minimized => set({ minimized }),
  pairing: false,
  setPairing: pairing => set({ pairing }),
  startWith: null,
  setStartWith: startWith => set({ startWith }),
}));
