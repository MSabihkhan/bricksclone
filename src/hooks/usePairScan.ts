import { useEffect, useRef, useState } from 'react';
import { db } from '../db';
import { nfcService, normalizeTagId } from '../services/nfc';
import { useFocusUi } from '../state/useFocusUi';
import { showToast } from '../ui/kit';

/**
 * Listens for a new key while the pair sheet is open. A known key just says so; a new one
 * shows the "Key found" state, then hands its id to `onFound` (which opens Register · Name).
 */
export function usePairScan(open: boolean, onFound: (tagId: string) => void) {
  const [found, setFound] = useState(false);
  const cb = useRef(onFound);
  cb.current = onFound;
  const setPairing = useFocusUi(s => s.setPairing);

  useEffect(() => {
    if (!open) { setFound(false); return; }
    setPairing(true);
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = nfcService.subscribe(async tag => {
      if (!tag || !live) return;
      const id = normalizeTagId(tag.id);
      const existing = await db.tags.getTagById(id).catch(() => undefined);
      if (!live) return;
      if (existing) { showToast(`Already paired as “${existing.name}”`); return; }
      setFound(true);
      timer = setTimeout(() => { if (live) cb.current(id); }, 750);
    });
    return () => { live = false; clearTimeout(timer); unsubscribe(); setPairing(false); };
  }, [open, setPairing]);

  return found;
}
