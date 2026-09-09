import { Linking } from 'react-native';
import { NfcDriver, NfcTag } from './types';
import { normalizeTagId } from './tagUtils';

export type TagHandler = (tag: NfcTag | null) => void;

/**
 * Fans a single hardware NFC listener out to any number of subscribers.
 *
 * The driver only supports one tag callback, so before this every screen that called
 * `beginListening` silently stole the callback from the Home screen, and its cleanup
 * tore down foreground dispatch for everyone.
 */
export class NfcService {
  private handlers = new Set<TagHandler>();
  private armed = false;
  private arming: Promise<void> | null = null;

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

  /** Adds a subscriber and arms the reader. Returns an unsubscribe function. */
  subscribe(onTag: TagHandler): () => void {
    this.handlers.add(onTag);
    this.arm().catch(() => {});
    return () => {
      this.handlers.delete(onTag);
      if (this.handlers.size === 0) {
        this.disarm().catch(() => {});
      }
    };
  }

  /** Replaces every subscriber with this one. Kept for single-owner call sites. */
  async beginListening(onTag: TagHandler): Promise<void> {
    this.handlers.clear();
    this.handlers.add(onTag);
    await this.arm();
  }

  async stopListening(): Promise<void> {
    this.handlers.clear();
    await this.disarm();
  }

  async getLaunchTag(): Promise<NfcTag | null> {
    return this.driver.getLaunchTag();
  }

  private async arm(): Promise<void> {
    if (this.armed) return;
    if (this.arming) return this.arming;

    this.arming = (async () => {
      const [supported, enabled] = await Promise.all([
        this.driver.isSupported(),
        this.driver.isEnabled(),
      ]);
      if (!supported || !enabled) return;
      await this.driver.start();
      await this.driver.setTagListener(tag => {
        const normalized = tag ? { ...tag, id: normalizeTagId(tag.id) } : null;
        // Copy first: a handler may unsubscribe itself while we are iterating.
        Array.from(this.handlers).forEach(h => h(normalized));
      });
      this.armed = true;
    })();

    try {
      await this.arming;
    } finally {
      this.arming = null;
    }
  }

  private async disarm(): Promise<void> {
    try {
      await this.driver.clearTagListener();
      await this.driver.stop();
    } catch {
      // ignore
    }
    this.armed = false;
  }
}
