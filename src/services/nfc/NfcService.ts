import { Linking } from 'react-native';
import { NfcDriver, NfcTag } from './types';
import { normalizeTagId } from './tagUtils';

export type TagHandler = (tag: NfcTag | null) => void;
export type ScanResult = 'tag' | 'cancelled';

/** Id of the fake key that debug builds can tap without NFC hardware. */
export const DEV_TEST_KEY_ID = 'DEADBEEF';

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
  private scanQueue: Promise<unknown> = Promise.resolve();
  private scanEpoch = 0;

  constructor(private driver: NfcDriver) {}

  /** True on iOS, where a tap needs `scan()` because nothing listens in the background. */
  get requiresActiveScan(): boolean {
    return !!this.driver.requiresActiveScan;
  }

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

  /** Opens the system scan sheet and hands the tag to every subscriber, as a background tap would. */
  scan(prompt: string): Promise<ScanResult> {
    const epoch = this.scanEpoch;
    const run = this.scanQueue.then(() => this.runScan(prompt, epoch));
    this.scanQueue = run.catch(() => {});
    return run;
  }

  /** Debug builds only: delivers a fake tap so every flow can be tested without a card or the NFC entitlement. */
  simulateTap(id: string = DEV_TEST_KEY_ID): void {
    const tag = { id: normalizeTagId(id), techTypes: [] };
    Array.from(this.handlers).forEach(h => h(tag));
  }

  async cancelScan(): Promise<void> {
    this.scanEpoch += 1;
    await this.driver.cancelScan?.();
  }

  private async runScan(prompt: string, epoch: number): Promise<ScanResult> {
    // A scan queued by a sheet that has since closed must not open the system UI.
    if (!this.driver.scanOnce || epoch !== this.scanEpoch) return 'cancelled';
    const raw = await this.driver.scanOnce(prompt);
    if (!raw) return 'cancelled';
    const tag = { ...raw, id: normalizeTagId(raw.id) };
    Array.from(this.handlers).forEach(h => h(tag));
    return 'tag';
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
