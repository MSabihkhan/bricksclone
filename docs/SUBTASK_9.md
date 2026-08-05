# SUBTASK 9 OF 9 — ANTI-CIRCUMVENTION + EDGE-CASE HARDENING

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md, src/services/blocking/blockingEngine.ts (endFocusSession computes raw
durationSec = now - startTime — unclamped), src/state/useFocusStore.ts (no live blocked-attempt persistence; no
NFC tap-to-start), src/screens/Home.tsx (hydrate + manual start exist; add tap-to-start), src/screens/AddBrick.tsx
(scan/detected flow; add registered-tag handling), src/navigation/HomeStackNavigator.tsx, src/services/nfc
(tagUtils.isRegisteredTag, nfcService beginListening/stopListening/isSupported/isEnabled), src/db (blockedAttempts
repository), __tests__/services/blockingEngine.test.ts, __tests__/state/useFocusStore.test.ts.
S1-S8 done and green (20 suites / 113 tests). Use useTheme() in new UI. TypeScript strict, no `any`, no comments,
no new npm deps, Android only.

GOAL (all hardening + ONE functional gap):
A) Persist live blocked attempts to the DB so Insights stats ("Most blocked", blocked counts) reflect the CURRENT
   session, not just recovered ones.
B) Tap-to-start: while the Home screen is focused, listening for NFC lets a REGISTERED Brick start a session and an
   UNREGISTERED tag open the AddBrick register flow.
C) AddBrick handles a scanned tag that is ALREADY registered (show "Start session" instead of "Register").
D) Clock-tamper clamp: durationSec computed from wall clock is clamped so negative/absurd values can't corrupt stats.
E) Unit tests for all of the above.

## 1. src/services/blocking/blockingEngine.ts — clamp durations (edit endFocusSession + recoverActiveSession)
- Add module-local: const MAX_SESSION_SEC = 24 * 60 * 60; and export function clampDurationSec(sec: number): number
  (Math.max(0, Math.min(sec, MAX_SESSION_SEC))). Export it from the blockingEngine object so it can be unit tested.
- endFocusSession: durationSec = clampDurationSec(now - activeSession.startTime).
- recoverActiveSession: when creating the 'recovered' session, leave duration as-is (0 on open) — but clamp any
  durationSec used in flush path if present. (Only clamp explicit computations in this file.)

## 2. src/state/useFocusStore.ts — live attempt persistence
- Track a detach function + active session id in module scope (like intervalId):
  let detachAttemptListener: (() => void) | null = null;
- Add private helper attachListener(activeSessionId: number): 
  if (detachAttemptListener) return; detachAttemptListener =
  blockingEngine.attachBlockedAttemptListener((attempt) => {
    db.blockedAttempts.recordAttempt({ sessionId: activeSessionId, packageName: attempt.packageName,
      label: attempt.label, createdAt: attempt.createdAt }).catch(() => {});
    set((s) => ({ liveBlocked: s.liveBlocked + 1 }));
  });
- Call it in startSession (after obtaining the session from getActiveSession, use session.id) and in hydrate when
  state.state === 'active' (use the recovered activeSession.id).
- endSession: if (detachAttemptListener) { detachAttemptListener(); detachAttemptListener = null; } before clearing
  interval.
- Keep timer interval logic unchanged.

## 3. New file src/hooks/useNfcSessionStart.ts — tap-to-start on Home
- export function useNfcSessionStart(params: { onRegistered: (tagId: string) => void; onUnregistered: () => void;
  registeredTagIds: string[] }): void
  - useEffect on [registeredTagIds]: if !(nfcService.isSupported && isEnabled) return; subscribe
    nfcService.beginListening((tag) => { const { id } = tag; isRegisteredTag(id, registeredTagIds) ?
    onRegistered(normalizeTagId(id)) : onUnregistered(); }); return cleanup nfcService.stopListening().
  - Wrap body in try/catch; ignore NFC runtime errors (silently). NOTE: you may need to adapt to the exact
    nfcService API (read src/services/nfc/index.ts first: beginListening signature, tag payload shape, isSupported /
    isEnabled async or sync). Adjust the hook internals to the REAL API; the hook's public props stay as above.
- READ src/services/nfc/index.ts and src/screens/RegisterTag.tsx before writing this — reuse their beginListening
  usage exactly.

## 4. src/screens/Home.tsx — wire tap-to-start (keep all existing UI/behavior)
- Compute registeredTagIds from the already-loaded `tags` state (map tag.id).
- Add: const handleRegistered = async (tagId: string) => { await startSession(tagId);
  navigation.navigate('FocusLock'); };
  const handleUnregistered = () => { navigation.navigate('AddBrick'); };
- Call useNfcSessionStart({ onRegistered: handleRegistered, onUnregistered: handleUnregistered, registeredTagIds })
  at the top of the component. Guard: do not attach while a session is already active (machine === 'active' → pass
  registeredTagIds of the active session's own tag OR skip listening; simplest: skip when machine==='active').
- If NFC unsupported/disabled, the hook is a no-op — the existing manual "Start" button still works. No error UI needed.

## 5. src/screens/AddBrick.tsx — already-registered tag handling
- In the 'detected' step, before showing "Register this Brick": check db.tags.getTagById(normalizeTagId(tag.id)).
  - If found: show a "REGISTERED BRICK" eyebrow (blue #4DA3FF), title "{name} is already registered", sub
    "{modeLabel} · {N} apps" muted 14px; primary button "Start session" -> blockingEngine.startFocusSession({tagId,
    apps: active categories via CATEGORY_PACKAGES as already done in save}) then useFocusStore.setState for machine
    active (or call startSession(tagId)) then navigation.replace('FocusLock'); ghost button "Back" -> goBack.
  - If not found: existing "NEW BRICK DETECTED" register flow unchanged.
- Keep scan/detected/name/block/done flow identical for new tags.

## 6. src/navigation/HomeStackNavigator.tsx — disable swipe-back on FocusLock
- For the FocusLock screen add options={{ gestureEnabled: false }} (keep headerShown false). Leave everything else.

## 7. Tests
- __tests__/services/blockingEngine.test.ts (extend): clampDurationSec negative -> 0, huge -> MAX_SESSION_SEC, normal
  -> same. And endFocusSession computes clamped duration (mock db.sessions.endSession arg durationSec).
- __tests__/state/useFocusStore.test.ts (extend): mock blockingEngine.attachBlockedAttemptListener to capture the
  handler; after startSession (mock startFocusSession + getActiveSession returning id=7), invoke handler with an
  attempt -> db.blockedAttempts.recordAttempt called with sessionId 7 + liveBlocked incremented; after endSession,
  the captured detach fn was called.
- __tests__/utils or __tests__/screens: if AddBrick's registered-detection branches on a pure check, extract it as a
  tiny pure helper (e.g. src/screens/addBrickModel.ts: classifyDetectedTag(tagId, registeredTagId?: string) ->
  'register' | 'start') and unit-test it; otherwise rely on the store/engine tests above.
- Keep all 113 existing tests green.

## VERIFICATION GATES (run, confirm, report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npm test all green (report suite/test counts)

## CONSTRAINTS
Do not modify src/db, src/services/nfc, src/services/oem, src/theme, src/components, src/navigation/types.ts,
RootNavigator, MainTabsNavigator, ModalNavigator, OnboardingNavigator. May edit ONLY: src/services/blocking/
blockingEngine.ts, src/state/useFocusStore.ts, src/screens/Home.tsx, src/screens/AddBrick.tsx,
src/navigation/HomeStackNavigator.tsx, src/hooks/useNfcSessionStart.ts (new), src/screens/addBrickModel.ts (new,
optional), and the two named test files. No `any` casts (use ?? and typed signatures). If the real nfcService API
differs from the sketch in section 3, adapt to it but keep the hook's props contract.

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: how live attempts now persist (sessionId wiring, dedupe reasoning vs recover flush); tap-to-start flow +
how registered vs unregistered tags route; AddBrick registered-tag handling; clamp behavior; gestureEnabled change;
tsc/eslint/jest results.
