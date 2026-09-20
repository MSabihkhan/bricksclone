import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen } from '../components/Screen';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { BlockingModule, InstalledApp } from '../native/BlockingModule';
import { SelectionState, toggleSelection, selectedCount } from '../utils/appSelection';
import { db } from '../db';
import { BlockedApp } from '../db/types';

export function SelectApps() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selection, setSelection] = useState<SelectionState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [manualPackage, setManualPackage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const installed = await BlockingModule.getInstalledApps();
        installed.sort((a, b) => a.label.localeCompare(b.label));
        setApps(installed);
        
        const existing = await db.blockedApps.listBlockedApps();
        const sel: SelectionState = {};
        for (const app of existing) {
          sel[app.packageName] = true;
        }
        setSelection(sel);
      } catch {
        // native unavailable
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const onToggle = (packageName: string) => {
    setSelection(prev => toggleSelection(prev, packageName));
  };

  const onAddManual = () => {
    if (!manualPackage.trim()) return;
    const pkg = manualPackage.trim();
    if (!apps.find(a => a.packageName === pkg)) {
      setApps(prev => [{ packageName: pkg, label: pkg }, ...prev]);
    }
    setSelection(prev => toggleSelection(prev, pkg));
    setManualPackage('');
  };

  const onNext = async () => {
    const toAdd: BlockedApp[] = apps
      .filter(a => selection[a.packageName])
      .map(a => ({
        packageName: a.packageName,
        label: a.label,
        addedAt: Math.floor(Date.now() / 1000)
      }));
    await db.blockedApps.replaceAll(toAdd);
    navigation.navigate('OnboardingDone');
  };

  const count = selectedCount(selection);
  
  const filteredApps = apps.filter(a => a.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderItem = ({ item }: { item: InstalledApp }) => {
    const isSelected = !!selection[item.packageName];
    return (
      <TouchableOpacity 
        style={[styles.row, { borderBottomColor: colors.border }]} 
        onPress={() => onToggle(item.packageName)}
      >
        <View style={[styles.appIcon, { backgroundColor: colors.card2 }]}>
          <Text style={[styles.appIconText, { color: colors.text }]}>
            {item.label.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.appLabel, { color: colors.text }]} numberOfLines={1}>
          {item.label}
        </Text>
        <View style={[
          styles.checkCircle, 
          { 
            borderColor: isSelected ? colors.accent : colors.border,
            backgroundColor: isSelected ? colors.accent : 'transparent' 
          }
        ]}>
          {isSelected && <Icon name="check" size={13} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen style={styles.container}>
      <OnboardingHeader />
      
      <Text style={[styles.title, { color: colors.text }]}>What should Bricks block?</Text>
      
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        placeholder="Search apps…"
        placeholderTextColor={colors.muted}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : apps.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Could not load apps.</Text>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginTop: 16 }]}
            placeholder="Add package manually..."
            placeholderTextColor={colors.muted}
            value={manualPackage}
            onChangeText={setManualPackage}
            onSubmitEditing={onAddManual}
          />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            data={filteredApps}
            keyExtractor={item => item.packageName}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        </KeyboardAvoidingView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, opacity: count > 0 ? 1 : 0.5 }]}
          disabled={count === 0}
          onPress={onNext}
        >
          <Text style={styles.buttonText}>Continue ({count} selected)</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 18,
    flex: 1,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 30,
    fontWeight: '400',
    letterSpacing: -1.4,
    paddingHorizontal: 22,
    marginBottom: 20,
  },
  searchInput: {
    height: 58,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 22,
    marginBottom: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 14,
    fontWeight: '600',
  },
  appLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    paddingTop: 16,
  },
  button: {
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
