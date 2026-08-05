const fs = require('fs');
const path = require('path');

const screens = [
  'Intro', 'WhyUsageAccess', 'GrantUsageAccess', 'WhyAccessibility', 
  'GrantAccessibility', 'BatteryOptimization', 'RegisterTag', 'SelectApps', 
  'OnboardingDone', 'Home', 'FocusLock', 'AddBrick', 'Insights', 'Settings', 
  'ManageTags', 'ManageBlockedApps', 'EmergencyHistory', 'About', 'Blocked', 
  'EmergencyOverride'
];

const dir = path.join(__dirname, 'src', 'screens');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

screens.forEach(screen => {
  const content = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { darkColors, typography } from '../theme';

export function ${screen}() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>${screen}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.screenTitle,
    color: darkColors.text,
  },
});
`;
  const filePath = path.join(dir, `${screen}.tsx`);
  fs.writeFileSync(filePath, content);
});

console.log('Screens generated successfully.');
