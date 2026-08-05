import NfcManager from 'react-native-nfc-manager';
import { NfcDriver, NfcTag } from './types';
import { normalizeTagId } from './tagUtils';

export class ReactNativeNfcDriver implements NfcDriver {
  async isSupported(): Promise<boolean> {
    return NfcManager.isSupported();
  }

  async isEnabled(): Promise<boolean> {
    return NfcManager.isEnabled();
  }

  async start(): Promise<void> {
    await NfcManager.start();
  }

  async stop(): Promise<void> {
    // @ts-ignore
    await NfcManager.stop();
  }

  async setTagListener(listener: (tag: NfcTag | null) => void): Promise<void> {
    // @ts-ignore - bypassing specific NfcManager type definitions
    NfcManager.setEventListener(NfcManager.NfcModules.TagEventType.DiscoverTag, (tag: { id?: string; techTypes?: string[] } | null) => {
      listener(tag ? { id: normalizeTagId(tag.id ?? ''), techTypes: tag.techTypes ?? [] } : null);
    });
  }

  async clearTagListener(): Promise<void> {
    // @ts-ignore
    NfcManager.setEventListener(NfcManager.NfcModules.TagEventType.DiscoverTag, null);
  }

  async getLaunchTag(): Promise<NfcTag | null> {
    const t = await NfcManager.getLaunchTagEvent();
    return t ? { id: normalizeTagId(t.id ?? ''), techTypes: t.techTypes ?? [] } : null;
  }

  async openNfcSettings(): Promise<void> {
    await NfcManager.goToNfcSetting();
  }
}
