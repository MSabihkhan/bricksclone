import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export function About() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handlePrivacy = () => {
    Alert.alert('Privacy & Data', 'All your focus sessions, settings, and blocked app data are stored locally on your device. We do not track or upload any personal information.');
  };

  const handleLicenses = () => {
    Alert.alert('Open-source licenses', 'Bricks uses React Native, React Navigation, Zustand, SQLite, React Native NFC Manager, and React Native SVG. Dependency license texts are distributed with their packages.');
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={[styles.circleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>About</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollPad}>
        <View style={styles.hero}>
          <View style={[styles.appIconBox, { backgroundColor: colors.accent }]}>
            <View style={styles.glyph} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Bricks</Text>
          <Text style={[styles.appTagline, { color: colors.muted }]}>NFC focus companion</Text>
          <View style={[styles.versionPill, { borderColor: colors.border }]}>
            <Text style={[styles.versionText, { color: colors.muted }]}>v1.0.2</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.row} onPress={handlePrivacy}>
            <View style={[styles.iconBox, { backgroundColor: colors.card2 }]}>
              <Icon name="info" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Privacy & Data</Text>
              <Text style={[styles.rowSub, { color: colors.muted }]}>All data stays on your device</Text>
            </View>
            <Icon name="chevron" size={20} color={colors.faint} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <TouchableOpacity style={styles.row} onPress={handleLicenses}>
            <View style={[styles.iconBox, { backgroundColor: colors.card2 }]}>
              <Icon name="info" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Licenses</Text>
            </View>
            <Icon name="chevron" size={20} color={colors.faint} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerText, { color: colors.faint }]}>Made with focus · © 2026</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 22, paddingBottom: 16 },
  circleBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollPad: { paddingHorizontal: 22, paddingBottom: 40 },

  hero: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  appIconBox: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  glyph: { width: 42, height: 42, borderRadius: 12, borderWidth: 4, borderColor: '#fff' },
  appName: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  appTagline: { fontSize: 14, fontWeight: '500', marginBottom: 16 },
  versionPill: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1 },
  versionText: { fontSize: 12, fontWeight: '700' },

  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  divider: { height: 1, marginLeft: 64 },

  footerText: { fontSize: 12, fontWeight: '600', textAlign: 'center' }
});
