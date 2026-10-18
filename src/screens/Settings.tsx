import React, { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeControls } from '../theme/ThemeContext';
import { ColorMode } from '../theme';
import { SettingsStackParamList } from '../navigation/types';
import { db } from '../db';
import { BlockingModule } from '../native/BlockingModule';
import { NotificationAccessSheet } from '../components/NotificationAccessSheet';
import { readPermissions } from '../services/permissionsService';
import { canBlock } from '../features/permissions';
import { useWalkthrough } from '../walkthrough/Walkthrough';
import { parsePersonaEnabled, PERSONA_SETTING_KEY } from '../features/persona';
import { parseReminders } from '../features/prayer';
import { APP_VERSION } from '../config/version';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, GroupCard, IconTile, Row, SectionLabel, Segmented, TAB_CLEARANCE, Title, Toggle } from '../ui/kit';

type NavProp = NativeStackNavigationProp<SettingsStackParamList>;
type SessionEndMode = 'brick' | 'timer';

/** Settings (Fasla Redesign v2), plus the app's extra switches in the same style. */
export function Settings() {
  const pal = usePalette();
  const { mode: appearance, setMode: setAppearance } = useThemeControls();
  const navigation = useNavigation<NavProp>();
  const { resetSeen } = useWalkthrough();
  const [keyNames, setKeyNames] = useState('');
  const [appsCount, setAppsCount] = useState(0);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [strictDefault, setStrictDefault] = useState(false);
  const [endMode, setEndMode] = useState<SessionEndMode>('brick');
  const [silenced, setSilenced] = useState(false);
  const [silenceSheet, setSilenceSheet] = useState(false);
  const [personaOn, setPersonaOn] = useState(true);
  const [prayersOn, setPrayersOn] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);

  const checkSilence = useCallback(() => {
    Promise.all([BlockingModule.hasNotificationAccess(), BlockingModule.getSilenceEnabled()])
      .then(([access, enabled]) => setSilenced(access && enabled)).catch(() => {});
  }, []);
  // Re-check when returning from Android settings; screen focus alone doesn't fire then.
  useEffect(() => {
    checkSilence();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') checkSilence(); });
    return () => sub.remove();
  }, [checkSilence]);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([db.tags.listTags(), db.blockedApps.listBlockedApps(), db.settings.getAll(), readPermissions(), db.sessions.listSessions()])
      .then(([tags, apps, sets, perms, sessions]) => {
        if (!active) return;
        setKeyNames(tags.map(t => t.name).join(', '));
        setAppsCount(apps.length);
        setStrictDefault(sets.strict_mode === '1');
        setEndMode(sets.session_end_mode === 'timer' ? 'timer' : 'brick');
        setPermissionsReady(canBlock(perms));
        setPersonaOn(parsePersonaEnabled(sets[PERSONA_SETTING_KEY]));
        setPrayersOn(parseReminders(sets).filter(r => r.enabled).length);
        setSessionsCount(sessions.filter(s => s.endTime !== null && s.endedVia !== 'start_failed').length);
      }).catch(error => console.warn('Could not load settings', error));
    checkSilence();
    return () => { active = false; };
  }, [checkSilence]));

  const setSetting = (key: string, value: string) => { db.settings.set(key, value).catch(() => {}); };

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_CLEARANCE }}>
        <Title>Settings</Title>

        <SectionLabel style={{ marginTop: 22 }}>YOUR SETUP</SectionLabel>
        <GroupCard>
          <Row icon="nfc" label="My keys" value={keyNames || 'None'} valueColor={keyNames ? pal.c85858C : pal.cFF5A5F} onPress={() => navigation.navigate('ManageTags')} />
          <Row icon="phone" label="Blocked apps" value={`${appsCount} apps`} valueColor={appsCount ? pal.c85858C : pal.cFF5A5F} onPress={() => navigation.navigate('ManageBlockedApps')} />
          <Row icon="bell" label="Silence notifications" value={silenced ? 'On' : 'Off'} onPress={() => setSilenceSheet(true)} />
          <Row icon="shield" label="Permissions" value={permissionsReady ? 'All set' : 'Action needed'} valueColor={permissionsReady ? pal.c3DDC84 : pal.cFF5A5F} onPress={() => navigation.navigate('Permissions')} last />
        </GroupCard>

        <SectionLabel>FOCUS</SectionLabel>
        <GroupCard>
          <View style={{ gap: 12, paddingVertical: 16, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: pal.c222226 }}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <IconTile icon="timer" />
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: pal.cF5F5F2 }}>Session ending</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: pal.c9A9AA0 }}>How a focus session can finish</Text>
              </View>
            </View>
            <Segmented
              options={[{ value: 'brick', label: 'Key only' }, { value: 'timer', label: 'Time limit' }]}
              value={endMode}
              onChange={v => { setEndMode(v); setSetting('session_end_mode', v); }}
              active="red"
              track={pal.c0F0F11}
            />
            <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: pal.c85858C, paddingHorizontal: 4 }}>
              {endMode === 'brick' ? 'Only tapping the same key ends focus.' : 'Ends at the key’s session length, or a tap.'}
            </Text>
          </View>
          <Row icon="lock" label="Strict mode by default" last right={
            <Toggle value={strictDefault} onChange={v => { setStrictDefault(v); setSetting('strict_mode', v ? '1' : '0'); }} label="Strict mode by default" />
          } />
        </GroupCard>

        <SectionLabel>APPEARANCE</SectionLabel>
        <Segmented
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
          value={appearance}
          onChange={v => setAppearance(v as ColorMode)}
          active="red"
          height={44}
          track={pal.c17171A}
        />

        <SectionLabel>MORE</SectionLabel>
        <GroupCard>
          <Row icon="moon" label="Prayer reminders" value={`${prayersOn} on`} onPress={() => navigation.navigate('PrayerReminder')} />
          <Row icon="clock" label="History" value={`${sessionsCount} sessions`} onPress={() => navigation.navigate('EmergencyHistory')} />
          <Row icon="smile" label="Card character" sub="The face on your key and its short lines" right={
            <Toggle value={personaOn} onChange={v => { setPersonaOn(v); setSetting(PERSONA_SETTING_KEY, v ? '1' : '0'); BlockingModule.setPersonaEnabled(v).catch(() => {}); }} label="Card character" />
          } />
          <Row icon="zap" label="Show tips again" onPress={() => { resetSeen().then(() => navigation.getParent()?.navigate('HomeTab' as never)).catch(() => {}); }} />
          {/* Runs the onboarding again; nothing is reset. */}
          <Row icon="refresh" label="Replay setup" onPress={() => navigation.getParent()?.getParent()?.reset({ index: 0, routes: [{ name: 'OnboardingStack' as never }] })} />
          <Row icon="info" label="About" value={`v${APP_VERSION}`} onPress={() => navigation.navigate('About')} last />
        </GroupCard>
      </ScrollView>
      <NotificationAccessSheet visible={silenceSheet} onClose={() => { setSilenceSheet(false); checkSilence(); }} onChanged={() => checkSilence()} />
    </Frame>
  );
}
