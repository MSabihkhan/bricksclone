import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModalStackParamList } from '../navigation/types';
import { Icon } from '../components/Icon';
import { RingProgress } from '../components/RingProgress';
import { useFocusStore } from '../state/useFocusStore';

export function Blocked() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ModalStackParamList>>();
  const { activeSession } = useFocusStore();
  
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigation.goBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigation]);

  const onOverride = () => {
    navigation.navigate('EmergencyOverride');
  };

  const pct = secondsLeft / 10;
  const isStrict = activeSession?.strict === 1;
  const obTint = colors.accent + '24'; // ~15% tint

  return (
    <View style={styles.scrim}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.centerWrap}>
          <View style={[styles.iconBox, { backgroundColor: obTint }]}>
            <Icon name="lock" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>BLOCKED</Text>
          <Text style={[styles.title, { color: colors.text }]}>Hold on</Text>
          <Text style={[styles.body, { color: colors.muted }]}>This app is locked until your focus session ends.</Text>
          
          <View style={styles.ringWrap}>
            <RingProgress size={96} stroke={6} color={colors.accent} trackColor={colors.track} progress={pct}>
              <Text style={[styles.ringText, { color: colors.muted }]}>
                Returning in 00:{secondsLeft.toString().padStart(2, '0')}
              </Text>
            </RingProgress>
          </View>
        </View>
        
        {!isStrict && (
          <TouchableOpacity style={[styles.ghostBtn, { borderColor: colors.border }]} onPress={onOverride}>
            <Text style={[styles.ghostBtnText, { color: colors.text }]}>I really need it</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 17, 21, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 24
  },
  centerWrap: {
    alignItems: 'center'
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.16 * 11,
    marginBottom: 8
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10
  },
  body: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22.5,
    marginBottom: 32,
    paddingHorizontal: 10
  },
  ringWrap: {
    marginBottom: 24
  },
  ringText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: 70
  },
  ghostBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: '800'
  }
});
