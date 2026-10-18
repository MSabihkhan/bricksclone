import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../db';
import { BlockingModule } from '../native/BlockingModule';
import { parsePersonaEnabled, PERSONA_SETTING_KEY } from '../features/persona';

/** Whether the card character shows its face and lines (Settings → Card character). On by default. */
export function usePersonaEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);
  useFocusEffect(useCallback(() => {
    let active = true;
    db.settings.get(PERSONA_SETTING_KEY).then(raw => {
      const on = parsePersonaEnabled(raw);
      // Keep the native lock screen in step with the setting.
      BlockingModule.setPersonaEnabled(on).catch(() => {});
      if (active) setEnabled(on);
    }).catch(() => {});
    return () => { active = false; };
  }, []));
  return enabled;
}
