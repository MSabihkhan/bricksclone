import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BlockingModule, InstalledApp } from '../native/BlockingModule';
import { db } from '../db';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Eyebrow, Frame, PillButton, RoundButton, Title } from '../ui/kit';

export interface AppPickerProps {
  eyebrow: string;
  onBack: () => void;
  /** Called once the main list is saved. */
  onDone: () => void;
  /** Onboarding offers "Choose later". */
  onLater?: () => void;
}

/** Stand-ins for a free-account debug build, where Screen Time cannot be authorised. */
const SAMPLE_APPS: InstalledApp[] = [
  { packageName: 'ios.sample.instagram', label: 'Instagram' },
  { packageName: 'ios.sample.tiktok', label: 'TikTok' },
  { packageName: 'ios.sample.youtube', label: 'YouTube' },
];

/**
 * Choose apps on iOS. Apple's picker returns opaque tokens, so the picked items are saved to the
 * same blocked-apps list as Android's package names: an id and a best-effort label.
 */
export function IosAppPicker({ eyebrow, onBack, onDone, onLater }: AppPickerProps) {
  const pal = usePalette();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db.blockedApps.listBlockedApps().then(list => setCount(list.length)).catch(() => {});
  }, []);

  const save = async (list: InstalledApp[]) => {
    const now = Math.floor(Date.now() / 1000);
    await db.blockedApps.replaceAll(list.map(a => ({ packageName: a.packageName, label: a.label, addedAt: now })));
    setCount(list.length);
    onDone();
  };

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError('Could not open the app picker. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const choose = () => run(async () => {
    const granted = (await BlockingModule.hasScreenTimeAccess()) || (await BlockingModule.requestScreenTimeAccess());
    if (!granted) {
      setError('Screen Time access is needed to block apps. Allow it when iOS asks.');
      return;
    }
    const picked = await BlockingModule.pickBlockedApps();
    if (!picked) return; // cancelled
    if (picked.length === 0) setError('Pick at least one app.');
    else await save(picked);
  });

  return (
    <Frame>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundButton icon="back" label="Back" onPress={onBack} />
        <Eyebrow size={12}>{eyebrow}</Eyebrow>
      </View>
      <Title style={{ marginTop: 18 }}>What should fasla block?</Title>
      <Text style={{ marginTop: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0 }}>
        Apple’s picker lets you choose apps, categories and websites. iOS keeps your choices private, so fasla never sees which apps you pick.
      </Text>
      <View style={{ marginTop: 24, padding: 18, borderRadius: 18, backgroundColor: pal.c141417 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5, color: pal.c85858C }}>CHOSEN</Text>
        <Text style={{ marginTop: 6, fontFamily: fonts.bodyMedium, fontSize: 20, color: pal.cF5F5F2 }}>
          {count ? `${count} ${count === 1 ? 'item' : 'items'}` : 'Nothing yet'}
        </Text>
      </View>
      {error ? <Text style={{ marginTop: 14, fontFamily: fonts.body, fontSize: 14, color: pal.cFF5A5F }} accessibilityLiveRegion="polite">{error}</Text> : null}
      <View style={{ flex: 1 }} />
      <View style={{ paddingTop: 14, paddingBottom: onLater ? 8 : 18, gap: 6 }}>
        <PillButton label={count ? 'Change apps' : 'Choose apps'} disabled={busy} onPress={() => { choose().catch(() => {}); }} />
        {__DEV__ ? (
          <PillButton label="Use sample apps (debug)" kind="outline" height={48} disabled={busy} onPress={() => { run(() => save(SAMPLE_APPS)).catch(() => {}); }} />
        ) : null}
        {onLater ? <PillButton label="Choose later" kind="ghost" height={40} onPress={onLater} textStyle={{ fontSize: 14 }} /> : null}
      </View>
    </Frame>
  );
}
