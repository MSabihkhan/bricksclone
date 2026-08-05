import { useEffect } from 'react';
import { nfcService, isRegisteredTag, normalizeTagId } from '../services/nfc';
import type { NfcTag } from '../services/nfc/types';
import { useFocusStore } from '../state/useFocusStore';

export function useNfcSessionStart({
  onRegistered,
  onUnregistered,
  registeredTagIds
}: {
  onRegistered: (tagId: string) => void;
  onUnregistered: () => void;
  registeredTagIds: string[];
}): void {
  const machine = useFocusStore((s) => s.machine);

  useEffect(() => {
    let unmounted = false;

    if (machine === 'active') {
      return;
    }

    async function setupNfc() {
      try {
        const supported = await nfcService.isSupported();
        if (!supported || unmounted) return;

        const enabled = await nfcService.isEnabled();
        if (!enabled || unmounted) return;

        nfcService.beginListening((tag: NfcTag | null) => {
          if (tag && !unmounted) {
            const { id } = tag;
            if (isRegisteredTag(id, registeredTagIds)) {
              onRegistered(normalizeTagId(id));
            } else {
              onUnregistered();
            }
          }
        });
      } catch {
        // ignore
      }
    }

    setupNfc();

    return () => {
      unmounted = true;
      try {
        nfcService.stopListening();
      } catch {
        // ignore
      }
    };
  }, [machine, registeredTagIds, onRegistered, onUnregistered]);
}
