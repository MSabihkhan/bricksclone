import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
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

  async isSupported(): Promise<boolean> {
    try {
      return await NfcManager.isSupported();
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
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
  }

  async getLaunchTag(): Promise<NfcTag | null> {
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
