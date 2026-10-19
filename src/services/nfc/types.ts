export interface NfcTag {
  id: string;
  techTypes: string[];
}

export interface NfcDriver {
  isSupported(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
  setTagListener(listener: (tag: NfcTag | null) => void): Promise<void>;
  clearTagListener(): Promise<void>;
  getLaunchTag(): Promise<NfcTag | null>;
  openNfcSettings(): Promise<void>;
  /** iOS cannot listen passively: every read opens the system scan sheet via `scanOnce`. */
  readonly requiresActiveScan?: boolean;
  /** Resolves with the tag, or null when the scan was cancelled or failed. */
  scanOnce?(prompt: string): Promise<NfcTag | null>;
  cancelScan?(): Promise<void>;
}
