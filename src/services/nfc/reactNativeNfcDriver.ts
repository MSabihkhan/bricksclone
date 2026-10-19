import { Platform } from 'react-native';
import NfcManager, { NfcEvents, NfcTech } from 'react-native-nfc-manager';
import { NfcDriver, NfcTag } from './types';
import { normalizeTagId } from './tagUtils';

interface RawTag {
  id?: string;
  techTypes?: string[];
}

function toTag(raw: RawTag | null | undefined): NfcTag | null {
  if (!raw) return null;
  const id = normalizeTagId(raw.id ?? '');
  if (!id) return null;
  return { id, techTypes: raw.techTypes ?? [] };
}

export class ReactNativeNfcDriver implements NfcDriver {
  private started = false;
  private registered = false;
  readonly requiresActiveScan = Platform.OS === 'ios';

  async isSupported(): Promise<boolean> {
    try {
      // Plain isSupported() only reports NDEF; the tag session is what reads the UID.
      // The typings omit the `tech` argument the library accepts.
      const isSupported = NfcManager.isSupported as (tech?: string) => Promise<boolean>;
      return await (this.requiresActiveScan ? isSupported.call(NfcManager, NfcTech.MifareIOS) : isSupported.call(NfcManager));
    } catch {
      return false;
    }
  }

  async isEnabled(): Promise<boolean> {
    try {
      return await NfcManager.isEnabled();
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    if (this.started) return;
    await NfcManager.start();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.registered) return;
    // There is no `stop()` in this library; foreground dispatch is torn down by
    // unregistering the tag event.
    await NfcManager.unregisterTagEvent();
    this.registered = false;
  }

  async setTagListener(listener: (tag: NfcTag | null) => void): Promise<void> {
    // On iOS registerTagEvent would pop the system scan sheet immediately; scans go through scanOnce.
    if (this.requiresActiveScan) return;
    NfcManager.setEventListener(NfcEvents.DiscoverTag, (raw: RawTag | null) => {
      listener(toTag(raw));
    });
    // Without registerTagEvent the DiscoverTag event is never delivered on Android.
    if (!this.registered) {
      await NfcManager.registerTagEvent();
      this.registered = true;
    }
  }

  async clearTagListener(): Promise<void> {
    if (this.requiresActiveScan) return;
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
  }

  async scanOnce(prompt: string): Promise<NfcTag | null> {
    try {
      await this.start();
      // MIFARE covers NTAG and Ultralight cards; both return the same UID Android reads.
      await NfcManager.requestTechnology([NfcTech.MifareIOS, NfcTech.Iso15693IOS], { alertMessage: prompt });
      return toTag((await NfcManager.getTag()) as RawTag | null);
    } catch {
      return null;
    } finally {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }

  async cancelScan(): Promise<void> {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }

  async getLaunchTag(): Promise<NfcTag | null> {
    if (this.requiresActiveScan) return null;
    try {
      const raw = (await NfcManager.getLaunchTagEvent()) as RawTag | null;
      return toTag(raw);
    } catch {
      return null;
    }
  }

  async openNfcSettings(): Promise<void> {
    await NfcManager.goToNfcSetting();
  }
}
