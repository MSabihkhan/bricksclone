import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { BlockingModule } from '../native/BlockingModule';
import { InfoSheet } from './InfoSheet';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { showToast } from '../ui/kit';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called after silencing was switched on or off, so the caller can refresh. */
  onChanged?: (silenced: boolean) => void;
}

/**
 * "Silence blocked apps": the in-app disclosure before Android's Notification access screen,
 * and the on/off switch once access is granted. Google Play's User Data policy wants users told
 * what is read, why, and what is kept, ending in an explicit choice. Keep this accurate to
 * NotificationBlockerService.
 */
const POINTS = [
  { t: 'What it does', d: 'Notifications from blocked apps are removed as they arrive, so they can’t pull you back in.' },
  { t: 'What still gets through', d: 'Calls and alarms — even from a blocked app — plus music, navigation, and anything from apps you haven’t blocked.' },
  { t: 'What it reads', d: 'Which app sent a notification and what kind it is. Never what it says.' },
  { t: 'What is kept', d: 'A count per app for your end-of-session summary. Messages aren’t lost.' },
  { t: 'What is shared', d: 'Nothing. It all stays on this phone.' },
];

export function NotificationAccessSheet({ visible, onClose, onChanged }: Props) {
  const pal = usePalette();
  const [access, setAccess] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!visible) return;
    BlockingModule.hasNotificationAccess().then(setAccess).catch(() => {});
    BlockingModule.getSilenceEnabled().then(setEnabled).catch(() => {});
  }, [visible]);

  const silenced = access && enabled;
  const onCta = () => {
    if (silenced) {
      BlockingModule.setSilenceEnabled(false).catch(() => {});
      showToast('Notifications back on');
      onChanged?.(false);
    } else {
      BlockingModule.setSilenceEnabled(true).catch(() => {});
      // Android's own switch is the real consent; this opens straight to fasla's toggle.
      if (!access) BlockingModule.requestNotificationAccess().catch(() => {});
      else showToast('Blocked apps silenced');
      onChanged?.(true);
    }
    onClose();
  };

  return (
    <InfoSheet
      visible={visible}
      title="Silence blocked apps"
      points={POINTS}
      note={
        <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: pal.c9A9AA0 }}>
          Switch greyed out? Android restricts this for apps installed from a file. Open App info, tap ⋮, choose “Allow restricted settings”.{' '}
          <Text style={{ color: pal.cFF5A5F }} onPress={() => BlockingModule.openAppInfo().catch(() => {})} accessibilityRole="link">Open App info</Text>
        </Text>
      }
      cta={silenced ? 'Turn off silencing' : 'Agree and turn on'}
      onCta={onCta}
      onClose={onClose}
    />
  );
}
