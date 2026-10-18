import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { AccessibilityDisclosureSheet } from './AccessibilityDisclosureSheet';
import { NotificationAccessSheet } from './NotificationAccessSheet';
import { PermissionItem, PermissionKey, PermissionStatus, permissionChecklist } from '../features/permissions';
import { openAppInfo, readPermissions, requestPermission } from '../services/permissionsService';
import { oemService } from '../services/oem/oemService';
import type { OemInfo } from '../services/oem/oemDetection';
import { RED, usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { CheckRing, Glyph, SectionLabel } from '../ui/kit';

/** Live permission status, re-read whenever the app comes back from Android settings. */
export function usePermissionStatus() {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const refresh = useCallback(() => {
    readPermissions().then(setStatus).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);
  return { status, refresh };
}

interface Props {
  status: PermissionStatus | null;
  /** Hide the optional rows (onboarding shows them collapsed behind "More options"). */
  compact?: boolean;
}

/** The design's permission list: check ring, title + NEEDED tag, description, Allow / On pill. */
export function PermissionsChecklist({ status, compact }: Props) {
  const pal = usePalette();
  const [accessibilitySheet, setAccessibilitySheet] = useState(false);
  const [notificationSheet, setNotificationSheet] = useState(false);
  const [showOptional, setShowOptional] = useState(!compact);
  const [oem, setOem] = useState<OemInfo | null>(null);

  useEffect(() => { oemService.getOem().then(setOem).catch(() => {}); }, []);

  if (!status) return null;
  const items = permissionChecklist(status);
  const core = items.filter(i => i.key === 'accessibility' || i.key === 'usage' || i.key === 'overlay');
  const optional = items.filter(i => !core.includes(i));

  const onAllow = (key: PermissionKey) => {
    // Both of these need an in-app disclosure before Android's own screen (Play policy).
    if (key === 'accessibility') return setAccessibilitySheet(true);
    if (key === 'notificationAccess') return setNotificationSheet(true);
    requestPermission(key).catch(() => {});
  };

  const help = (text: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button">
      <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: pal.cF5F5F2, textDecorationLine: 'underline', marginTop: 4 }}>{text}</Text>
    </Pressable>
  );

  const renderRow = (item: PermissionItem, last: boolean) => {
    const on = status[item.key];
    return (
      <View key={item.key} style={{ flexDirection: 'row', gap: 14, padding: 16, alignItems: 'flex-start', borderBottomWidth: last ? 0 : 1, borderBottomColor: pal.c232327 }}>
        <View style={{ marginTop: 2 }}><CheckRing on={on} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: pal.cF5F5F2 }}>{item.title}</Text>
            {item.required && !on ? <Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: pal.cFF5A5F }}>NEEDED</Text> : null}
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: pal.c9A9AA0 }}>{item.why}</Text>
          {item.key === 'accessibility' && !on ? help('Switch greyed out? Open App info → ⋮ → Allow restricted settings', () => { openAppInfo().catch(() => {}); }) : null}
          {item.key === 'battery' && oem?.isAggressive ? help(`${oem.name} phones also need Autostart turned on → Open`, () => { oemService.openAutostartSettings(oem.id).catch(() => {}); }) : null}
        </View>
        <Pressable
          onPress={() => (on ? requestPermission(item.key).catch(() => {}) : onAllow(item.key))}
          accessibilityRole="button"
          accessibilityLabel={on ? `${item.title} is on` : `Allow ${item.title}`}
          style={({ pressed }) => ({ height: 36, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? 'transparent' : RED, borderWidth: on ? 1 : 0, borderColor: pal.c3A3A40, opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: on ? pal.cF5F5F2 : '#FFFFFF' }}>{on ? 'On' : 'Allow'}</Text>
        </Pressable>
      </View>
    );
  };

  const card = { borderRadius: 24, backgroundColor: pal.c17171A, borderWidth: 1, borderColor: pal.c232327, overflow: 'hidden' as const };

  return (
    <View>
      <View style={card}>{core.map((item, i) => renderRow(item, i === core.length - 1))}</View>

      {showOptional ? (
        <>
          <SectionLabel>RECOMMENDED</SectionLabel>
          <View style={card}>{optional.map((item, i) => renderRow(item, i === optional.length - 1))}</View>
        </>
      ) : (
        <Pressable onPress={() => setShowOptional(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, marginTop: 6, paddingHorizontal: 4 }} accessibilityRole="button">
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.c9A9AA0 }}>More options</Text>
          <Glyph name="chevron" size={16} color={pal.c9A9AA0} />
        </Pressable>
      )}

      <AccessibilityDisclosureSheet
        visible={accessibilitySheet}
        onClose={() => setAccessibilitySheet(false)}
        onAgree={() => { setAccessibilitySheet(false); requestPermission('accessibility').catch(() => {}); }}
      />
      <NotificationAccessSheet visible={notificationSheet} onClose={() => setNotificationSheet(false)} />
    </View>
  );
}
