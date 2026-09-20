import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { db } from '../db';
import { BlockedApp } from '../db/types';
import { BlockingModule } from '../native/BlockingModule';
import { useFocusEffect } from '@react-navigation/native';

export function ManageBlockedApps() {
  const { colors } = useTheme();
  
  const [blocked, setBlocked] = useState<BlockedApp[]>([]);
  const [pickerMode, setPickerMode] = useState(false);
  
  const [installed, setInstalled] = useState<{ packageName: string; label: string }[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, { packageName: string; label: string }>>({});
  const [loading, setLoading] = useState(false);

  const loadBlocked = async () => {
    const apps = await db.blockedApps.listBlockedApps();
    setBlocked(apps);
  };

  useFocusEffect(
    useCallback(() => {
      loadBlocked();
    }, [])
  );

  const enterPicker = async () => {
    setPickerMode(true);
    setLoading(true);
    try {
      const apps = await BlockingModule.getInstalledApps();
      setInstalled(apps);
      const sel: Record<string, { packageName: string; label: string }> = {};
      for (const b of blocked) {
        sel[b.packageName] = { packageName: b.packageName, label: b.label };
      }
      setSelected(sel);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const savePicker = async () => {
    const now = Math.floor(Date.now() / 1000);
    const arr = Object.values(selected).map(s => ({ ...s, addedAt: now }));
    await db.blockedApps.replaceAll(arr);
    setPickerMode(false);
    loadBlocked();
  };

  const removeApp = (packageName: string) => {
    Alert.alert('Remove app', 'Stop blocking this app during focus sessions?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          await db.blockedApps.removeBlockedApp(packageName);
          loadBlocked();
        }
      }
    ]);
  };

  const toggleSelection = (app: { packageName: string; label: string }) => {
    const next = { ...selected };
    if (next[app.packageName]) {
      delete next[app.packageName];
    } else {
      next[app.packageName] = app;
    }
    setSelected(next);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return installed;
    return installed.filter(a => a.label.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q));
  }, [installed, search]);

  if (pickerMode) {
    const count = Object.keys(selected).length;
    return (
      <Screen style={{ paddingHorizontal: 0 }}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close app picker" onPress={() => setPickerMode(false)} style={[styles.circleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Icon name="back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.pickerHeading}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Blocked apps</Text>
            <Text style={[styles.pickerCount, { color: colors.muted }]}>{count} selected</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Search apps"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {loading ? (
          <View style={styles.emptyCenter}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollPad}>
            {filtered.map(app => {
              const on = !!selected[app.packageName];
              return (
                <TouchableOpacity key={app.packageName} style={[styles.pickerRow, { borderBottomColor: colors.border }]} onPress={() => toggleSelection(app)}>
                  <View style={[styles.iconBox, { backgroundColor: colors.card2 }]}>
                    <Text style={[styles.iconInitial, { color: colors.text }]}>{app.label.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.pickerLabel, { color: colors.text }]} numberOfLines={1}>{app.label}</Text>
                  <View style={[styles.checkCircle, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accent : 'transparent' }]}>
                    {on && <Icon name="check" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        <View style={[styles.bottomPad, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.accent }]} onPress={savePicker}>
            <Text style={styles.btnPrimaryText}>Save blocked apps</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.headerView}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <Text style={[styles.headerTitleView, { color: colors.text }]}>Blocked apps</Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>{blocked.length} selected · blocked during focus</Text>
          </View>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add blocked apps" style={[styles.plusCircle, { backgroundColor: colors.accent }]} onPress={enterPicker}>
          <Icon name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadView}>
        {blocked.length === 0 ? (
          <View style={styles.emptyCenter}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.accent + '14' }]}>
              <Icon name="smartphone" size={44} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No blocked apps</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>Add apps to lock during focus sessions.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {blocked.map(b => (
              <View key={b.packageName} style={[styles.viewRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconBox, { backgroundColor: colors.card2 }]}>
                  <Text style={[styles.iconInitial, { color: colors.text }]}>{b.label.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.viewLabel, { color: colors.text }]} numberOfLines={1}>{b.label}</Text>
                  <Text style={[styles.viewPkg, { color: colors.faint }]} numberOfLines={1}>{b.packageName}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${b.label}`} onPress={() => removeApp(b.packageName)} style={{ padding: 4 }}>
                  <Icon name="x" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 22, paddingBottom: 16 },
  headerView: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 22, paddingBottom: 24 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  pickerHeading: { alignItems: 'center' },
  headerTitle: { fontFamily: 'BricolageGrotesque', fontSize: 20, fontWeight: '400', letterSpacing: -0.6 },
  pickerCount: { fontFamily: 'IBMPlexMono-Regular', fontSize: 10, marginTop: 2 },
  headerTitleView: { fontFamily: 'BricolageGrotesque', fontSize: 30, fontWeight: '400', letterSpacing: -1.8 },
  headerSub: { fontFamily: 'IBMPlexMono-Regular', fontSize: 11, marginTop: 4 },
  countPill: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1 },
  countText: { fontSize: 12, fontWeight: '700' },
  plusCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  
  input: { width: '100%', height: 50, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, fontSize: 15, fontWeight: '500' },
  
  scrollPad: { paddingHorizontal: 22, paddingBottom: 40 },
  scrollPadView: { paddingHorizontal: 22, paddingBottom: 40 },
  
  pickerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconInitial: { fontSize: 14, fontWeight: '700' },
  pickerLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  
  bottomPad: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 14 },
  btnPrimary: { height: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 14, fontWeight: '500' },

  viewRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  viewLabel: { fontSize: 15, fontWeight: '600' },
  viewPkg: { fontFamily: 'IBMPlexMono-Regular', fontSize: 10, marginTop: 3 },
});
