import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Screen } from '../components/Screen';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { oemService } from '../services/oem/oemService';
import { OEM_SUMMARY, OemInfo } from '../services/oem/oemDetection';

export function BatteryOptimization() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  
  const [oem, setOem] = useState<OemInfo | null>(null);
  const [exemption, setExemption] = useState(false);
  const [overlay, setOverlay] = useState(true);

  useEffect(() => {
    async function load() {
      const oemInfo = await oemService.getOem();
      setOem(oemInfo);
      
      const isExempt = await oemService.hasBatteryOptimizationExemption();
      setExemption(isExempt);
      setOverlay(await oemService.hasOverlayPermission());
    }
    load();

    const interval = setInterval(async () => {
      const isExempt = await oemService.hasBatteryOptimizationExemption();
      setExemption(isExempt);
      setOverlay(await oemService.hasOverlayPermission());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const onNext = () => {
    navigation.navigate('RegisterTag');
  };

  const obTint = colors.accent + '24';
  const showAutostart = oem && oem.autostartSteps.length > 0 && oem.isAggressive;

  return (
    <Screen style={styles.container}>
      <OnboardingHeader />
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconBox, { backgroundColor: obTint, borderColor: colors.accent }]}>
          <Icon name="zap" size={44} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Keep Bricks running</Text>
        <Text style={[styles.body, { color: colors.muted, marginBottom: 24 }]}>
          {oem ? OEM_SUMMARY[oem.id] : ''}
        </Text>

        {oem && (
          <View style={styles.instructionsList}>
            <Text style={[styles.listHeader, { color: colors.text }]}>Battery:</Text>
            {oem.batterySteps.map((step, i) => (
              <Text key={`bat-${i}`} style={[styles.listItem, { color: colors.muted }]}>
                {i + 1}. {step}
              </Text>
            ))}

            <TouchableOpacity 
              style={[styles.outlineBtn, { borderColor: colors.border }]} 
              onPress={() => oemService.openBatterySettings(oem.id)}
            >
              <Text style={[styles.outlineBtnText, { color: colors.text }]}>Open battery settings</Text>
            </TouchableOpacity>

            {!overlay && (
              <View>
                <Text style={[styles.listHeader, { color: colors.text, marginTop: 24 }]}>Display over other apps:</Text>
                <Text style={[styles.listItem, { color: colors.muted }]}>
                  Lets the block screen appear on top of a distracting app.
                </Text>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.border }]}
                  onPress={() => oemService.requestOverlayPermission()}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.text }]}>Allow display over apps</Text>
                </TouchableOpacity>
              </View>
            )}

            {showAutostart && (
              <View>
                <Text style={[styles.listHeader, { color: colors.text, marginTop: 24 }]}>Autostart:</Text>
                {oem.autostartSteps.map((step, i) => (
                  <Text key={`auto-${i}`} style={[styles.listItem, { color: colors.muted }]}>
                    {i + 1}. {step}
                  </Text>
                ))}

                <TouchableOpacity 
                  style={[styles.outlineBtn, { borderColor: colors.border }]} 
                  onPress={() => oemService.openAutostartSettings(oem.id)}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.text }]}>Open autostart settings</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {exemption && (
        <View style={styles.successRow}>
          <Icon name="check" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 8 }}>
            Battery optimization is off for Bricks
          </Text>
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent, marginTop: 16 }]}
        onPress={onNext}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  iconBox: {
    width: 104,
    height: 104,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  title: {
    fontFamily: 'BricolageGrotesque',
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: -1.8,
    lineHeight: 38,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    marginTop: 16,
  },
  instructionsList: {
    marginBottom: 20,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  listItem: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
    marginLeft: 4,
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
