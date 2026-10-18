import React from 'react';
import { ScrollView, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PermissionsChecklist, usePermissionStatus } from '../components/PermissionsChecklist';
import { usePalette } from '../theme/palette';
import { fonts } from '../theme/fonts';
import { Frame, RoundButton, Title } from '../ui/kit';

/** Permissions (Fasla Redesign v2). */
export function Permissions() {
  const pal = usePalette();
  const navigation = useNavigation();
  const { status } = usePermissionStatus();

  return (
    <Frame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <RoundButton icon="back" label="Back" onPress={() => navigation.goBack()} />
        <Title style={{ marginTop: 20 }}>Permissions</Title>
        <Text style={{ marginTop: 10, marginBottom: 18, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: pal.c9A9AA0 }}>
          fasla needs these to notice a blocked app and cover it. Nothing leaves your phone.
        </Text>
        <PermissionsChecklist status={status} />
      </ScrollView>
    </Frame>
  );
}
