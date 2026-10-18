import React from 'react';
import { Text } from 'react-native';
import { InfoSheet } from './InfoSheet';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';

interface Props {
  visible: boolean;
  onAgree: () => void;
  onClose: () => void;
}

/**
 * Google Play's prominent-disclosure requirement for apps using the AccessibilityService
 * API without being an accessibility tool: in-app, says what is accessed and how it is used
 * or shared, and ends in an explicit choice. Keep this accurate to BlockingAccessibilityService.
 */
const POINTS = [
  { t: 'What it reads', d: 'Only the name of the app that comes to the front of your screen. It does not read text, messages, passwords, or anything you type.' },
  { t: 'Why', d: 'During a focus session, if that app is on your blocked list, fasla covers it with the lock screen. If it opens in a pop-up window, fasla presses Back once to close it.' },
  { t: 'What is kept', d: 'When a blocked app is opened, its name and the time are saved on this phone for your Insights.' },
  { t: 'What is shared', d: 'Nothing. fasla has no account and sends no data off your phone.' },
];

export function AccessibilityDisclosureSheet({ visible, onAgree, onClose }: Props) {
  const pal = usePalette();
  return (
    <InfoSheet
      visible={visible}
      title="fasla uses the Accessibility service"
      lead="It’s how fasla notices a blocked app opening and covers it immediately. Here’s exactly what that involves:"
      points={POINTS}
      note={<Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: pal.c9A9AA0 }}>You can turn it off any time in Android Settings → Accessibility.</Text>}
      cta="Agree and open settings"
      onCta={onAgree}
      onClose={onClose}
    />
  );
}
