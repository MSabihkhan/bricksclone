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
}
