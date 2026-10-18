import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { nfcService, isRegisteredTag, normalizeTagId } from '../services/nfc';
import type { NfcTag } from '../services/nfc/types';
import { useFocusStore } from '../state/useFocusStore';
import { useFocusUi } from '../state/useFocusUi';

const TAP_COOLDOWN_MS = 4000;

export interface NfcSessionHandlers {
  /** A registered key was tapped while no session was running. */
  onRegistered: (tagId: string) => void;
  /** An unknown tag was tapped while no session was running. */
  onUnregistered: (tagId: string) => void;
  /**
   * A registered key was tapped during an active session — this is how a session ends.
   * Omit to keep the previous behaviour of ignoring taps while locked.
   */
  onEndTap?: (tagId: string) => void;
  registeredTagIds: string[];
}

/**
 * Drives the whole key loop: tap to start, tap again to unlock.
 *
 * The listener is re-armed whenever the session state flips so the same physical tap is
 * routed to the right handler, and the handlers are held in a ref so callers do not have to
 * memoise them to avoid tearing the NFC listener down on every render.
 */
export function useNfcSessionStart({
  onRegistered,
  onUnregistered,
  onEndTap,
  registeredTagIds
}: NfcSessionHandlers): void {
  const machine = useFocusStore((s) => s.machine);

  const handlers = useRef({ onRegistered, onUnregistered, onEndTap, registeredTagIds });
  handlers.current = { onRegistered, onUnregistered, onEndTap, registeredTagIds };

  const lastTag = useRef<{ id: string; at: number }>({ id: '', at: 0 });

  // Only the ids matter for re-arming, not the array identity.
  const tagKey = registeredTagIds.join('|');

  useEffect(() => {
    let unmounted = false;

    const dispatch = (tag: NfcTag | null) => {
      if (!tag || unmounted) return;
      // While a key is being paired, the pairing sheet owns the reader.
      if (useFocusUi.getState().pairing) return;
      const current = handlers.current;
      const id = normalizeTagId(tag.id);

      // getLaunchTagEvent keeps returning the tag that opened the app, so without a
      // cooldown a single physical tap could start and immediately end a session.
      const now = Date.now();
      if (id === lastTag.current.id && now - lastTag.current.at < TAP_COOLDOWN_MS) return;
      lastTag.current = { id, at: now };

      const known = isRegisteredTag(id, current.registeredTagIds);

      if (machine === 'active') {
        if (known && current.onEndTap) current.onEndTap(id);
        return;
      }

      if (known) {
        current.onRegistered(id);
      } else {
        current.onUnregistered(id);
      }
    };

    const unsubscribe = nfcService.subscribe(dispatch);

    // A tap that cold-started the app arrives as a launch intent, not a live event.
    nfcService
      .getLaunchTag()
      .then((tag) => {
        if (tag && !unmounted) dispatch(tag);
      })
      .catch(() => {
        // NFC is best-effort; the manual controls stay available either way.
      });

    // A tap that wakes the app from the background arrives through the launcher intent,
    // not the foreground-dispatch listener, so re-check on every return to foreground.
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' || unmounted) return;
      nfcService
        .getLaunchTag()
        .then((tag) => {
          if (tag) dispatch(tag);
        })
        .catch(() => {});
    });

    return () => {
      unmounted = true;
      appStateSub.remove();
      unsubscribe();
    };
  }, [machine, tagKey]);
}
