import { Linking } from 'react-native';
import { NfcDriver, NfcTag } from './types';
import { normalizeTagId } from './tagUtils';

export class NfcService {
  constructor(private driver: NfcDriver) {}

  async isSupported(): Promise<boolean> {
    return this.driver.isSupported();
  }

  async isEnabled(): Promise<boolean> {
    return this.driver.isEnabled();
  }

  async openSettings(): Promise<void> {
    try {
      await this.driver.openNfcSettings();
    } catch {
      await Linking.openSettings();
    }
  }

  async beginListening(onTag: (tag: NfcTag | null) => void): Promise<void> {
    const [supported, enabled] = await Promise.all([this.driver.isSupported(), this.driver.isEnabled()]);
    if (!supported || !enabled) return;
    await this.driver.start();
    await this.driver.setTagListener(tag => {
      onTag(tag ? { ...tag, id: normalizeTagId(tag.id) } : null);
    });
  }

  async stopListening(): Promise<void> {
    try {
      await this.driver.clearTagListener();
      await this.driver.stop();
    } catch {
      // ignore
    }
  }

  async getLaunchTag(): Promise<NfcTag | null> {
    return this.driver.getLaunchTag();
  }
}
