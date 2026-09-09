import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Easing, KeyboardAvoidingView, Platform, Alert, AppState } from 'react-native';
import { Screen } from '../components/Screen';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../navigation/types';
import { nfcService, formatTagId } from '../services/nfc';
import { LOCATIONS, validateBrickName, isTagIdInputValid } from '../utils/onboarding';
import { registerBrick } from './registerTagModel';
import { NfcTag } from '../services/nfc/types';
import { describeError } from '../utils/describeError';

type Mode = 'unsupported' | 'scanning' | 'detected' | 'naming' | 'manual';

export function RegisterTag() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  
  const [mode, setMode] = useState<Mode>('scanning');
  const [tagId, setTagId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState(LOCATIONS[0].key);
  const [disabled, setDisabled] = useState(false);
  
  // animations
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let unmounted = false;
    
    async function checkNfc() {
      const supported = await nfcService.isSupported();
      if (!supported) {
        if (!unmounted) setMode('unsupported');
        return;
      }
      const enabled = await nfcService.isEnabled();
      if (!enabled) {
        if (!unmounted) setDisabled(true);
      }
    }
    
    checkNfc();
    
    return () => {
      unmounted = true;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const supported = await nfcService.isSupported();
      const enabled = supported ? await nfcService.isEnabled() : false;
      setDisabled(supported && !enabled);
      if (!supported) setMode('unsupported');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let unmounted = false;
    let unsubscribe: (() => void) | undefined;
    if (mode === 'scanning' && !disabled) {
      // Start animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();

      unsubscribe = nfcService.subscribe((tag: NfcTag | null) => {
        if (tag && !unmounted) {
          setTagId(tag.id);
          setMode('detected');
        }
      });
    } else {
      pulseAnim.stopAnimation();
    }

    return () => {
      unmounted = true;
      unsubscribe?.();
    };
  }, [mode, disabled, pulseAnim]);

  const [registering, setRegistering] = useState(false);

  const onRegister = async () => {
    if (!validateBrickName(name) || registering) return;
    setRegistering(true);
    try {
      await registerBrick(tagId, name, location);
      navigation.navigate('SelectApps');
    } catch (err) {
      // A failed write here used to fail silently — this Brick was the only sign the user
      // ever tapped Register at all, so surface whatever broke instead of doing nothing.
      Alert.alert('Could not register this Brick', describeError(err));
      setRegistering(false);
    }
  };

  const obTint = colors.accent + '24';
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  if (mode === 'unsupported' || disabled) {
    return (
      <Screen style={styles.container}>
        <OnboardingHeader />
        <View style={styles.content}>
          <View style={[styles.iconBox, { backgroundColor: obTint, borderColor: colors.accent }]}>
            <Icon name="radio" size={44} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {disabled ? 'NFC is off' : 'NFC not available'}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {disabled 
              ? 'Please turn on NFC in your device settings to register your Brick.'
              : 'Your phone doesn\'t support NFC tags. You can still use Bricks with a manual toggle.'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={() => {
            if (disabled) {
              nfcService.openSettings();
            } else {
              setMode('manual');
            }
          }}
        >
          <Text style={styles.buttonText}>{disabled ? 'Open NFC settings' : 'Enter tag ID manually'}</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  if (mode === 'manual') {
    const valid = isTagIdInputValid(tagId);
    return (
      <Screen style={styles.container}>
        <OnboardingHeader />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text, marginBottom: 16 }]}>Manual Entry</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Enter tag ID (hex)"
            placeholderTextColor={colors.muted}
            value={tagId}
            onChangeText={setTagId}
            autoCapitalize="none"
          />
          <Text style={[styles.hint, { color: colors.muted }]}>Enter the tag ID printed on your Brick (hex)</Text>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, opacity: valid ? 1 : 0.5 }]}
          disabled={!valid}
          onPress={() => setMode('naming')}
        >
          <Text style={styles.buttonText}>Use this ID</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  if (mode === 'scanning') {
    return (
      <Screen style={styles.container}>
        <OnboardingHeader />
        <View style={styles.contentCenter}>
          <View style={styles.scannerBox}>
            <Animated.View style={[styles.pulseRing, { borderColor: colors.accent, transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
            <View style={[styles.scannerInner, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
              <Icon name="radio" size={44} color="#fff" />
            </View>
          </View>
          <Text style={[styles.scanTitle, { color: colors.text }]}>Hold your phone{'\n'}near the Brick</Text>
          <Text style={[styles.scanSub, { color: colors.muted }]}>Scanning for your tag…</Text>
        </View>
      </Screen>
    );
  }

  if (mode === 'detected') {
    return (
      <Screen style={styles.container}>
        <OnboardingHeader />
        <View style={styles.contentCenter}>
          <View style={[styles.detectedBox, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
            <View style={styles.glossyBar} />
            <Icon name="radio" size={44} color="#fff" />
          </View>
          <Text style={styles.eyebrow}>NEW BRICK DETECTED</Text>
          <Text style={[styles.detectedTitle, { color: colors.text }]}>Unregistered Brick</Text>
          <Text style={[styles.idLine, { color: colors.muted }]}>ID · {formatTagId(tagId)}</Text>
        </View>
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={() => setMode('naming')}>
            <Text style={styles.buttonText}>Register this Brick</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={() => setMode('scanning')}>
            <Text style={[styles.ghostButtonText, { color: colors.muted }]}>Not now</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  // naming
  const canRegister = validateBrickName(name) && !registering;
  return (
    <Screen style={styles.container}>
      {/*
        Without this, the open keyboard could leave the Register button stranded off-screen
        or underneath it — on Android 15+ the OS-level edge-to-edge behavior doesn't always
        resize the layout the way `windowSoftInputMode="adjustResize"` used to guarantee, so
        this drives the resize from JS instead of relying on that.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <View style={styles.namingHeader}>
          <Text style={[styles.namingStep, { color: colors.muted }]}>REGISTER BRICK / Step 1 of 1 · Name</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.namingIconBox, { backgroundColor: obTint, borderColor: colors.accent }]}>
            <Icon name="radio" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.namingTitle, { color: colors.text }]}>Name this Brick</Text>
          <Text style={[styles.namingSub, { color: colors.muted }]}>
            Where does it live? You'll tap it here to start focusing.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Desk"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={onRegister}
          />

          <Text style={[styles.quickPickLabel, { color: colors.muted }]}>QUICK PICK</Text>
          <View style={styles.grid}>
            {LOCATIONS.map(loc => {
              const selected = loc.key === location;
              return (
                <TouchableOpacity
                  key={loc.key}
                  style={[
                    styles.gridItem,
                    { backgroundColor: selected ? colors.accent : colors.card, borderColor: selected ? colors.accent : colors.border }
                  ]}
                  onPress={() => {
                    setLocation(loc.key);
                    if (!name) setName(loc.label);
                  }}
                >
                  <Icon name={loc.icon} size={20} color={selected ? '#fff' : colors.text} />
                  <Text style={[styles.gridItemLabel, { color: selected ? '#fff' : colors.text }]}>{loc.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, opacity: canRegister ? 1 : 0.5 }]}
          disabled={!canRegister}
          onPress={onRegister}
        >
          <Text style={styles.buttonText}>{registering ? 'Registering…' : 'Register'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 30,
    paddingTop: 32,
    paddingBottom: 34,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  contentCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.19,
    lineHeight: 36,
  },
  body: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 26,
    marginTop: 16,
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    fontSize: 20,
    fontWeight: '800',
  },
  hint: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  scannerBox: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
  },
  scannerInner: {
    width: 98,
    height: 98,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  scanTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.78,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  scanSub: {
    fontSize: 15,
    fontWeight: '500',
  },
  detectedBox: {
    width: 134,
    height: 134,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
    overflow: 'hidden',
  },
  glossyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.76,
    color: '#22c55e',
    marginBottom: 12,
  },
  detectedTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  idLine: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  buttonGroup: {
    gap: 12,
  },
  ghostButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  namingHeader: {
    marginBottom: 32,
  },
  namingStep: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.54,
  },
  namingIconBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  namingTitle: {
    fontSize: 27,
    fontWeight: '800',
    marginBottom: 12,
  },
  namingSub: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 24,
  },
  quickPickLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '31%',
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  gridItemLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
