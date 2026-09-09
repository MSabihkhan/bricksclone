# BricksApp Technical Audit

**Audit date:** 2026-09-10  
**Scope:** React Native/TypeScript application, SQLite layer, navigation and screens, Android native blocking/NFC integration, iOS shell, automated tests, build configuration, and release readiness.  
**Repository state:** Audited on `master` with 49 modified or untracked entries already present. This report does not assume those changes are committed.

## Executive verdict

BricksApp is a credible **Android MVP in active development**, but it is **not production-ready yet**.

The core design is real rather than a visual prototype: the app has persistent SQLite data, NFC tag registration, installed-app selection, session state, a foreground blocking service, accessibility-event detection, a usage-events fallback, reboot recovery, blocked-attempt logging, focus statistics, and light/dark themes. TypeScript compiles, all automated tests pass, and an Android debug APK builds successfully.

The main blockers are not basic code compilation. They are correctness under failure, unverified behavior on physical devices, release configuration, and several UI features that are present but do not affect behavior. In particular:

1. Database session state and native blocking state can diverge if native start/stop calls fail.
2. Rapid starts can create more than one open session because the state transition does not reject `START` while already active.
3. Planned durations are displayed but never enforced or completed automatically.
4. Overrides currently count as successful completion and do not break the streak despite the UI saying they will.
5. Important settings—Auto-Pilot, break reminders, block intensity, notifications, and home category toggles—are stored but mostly not consumed.
6. The release build is configured to use the debug signing key.
7. The documented 17-scenario physical-device test matrix is still entirely unchecked.

**Readiness estimate:**

- UI/navigation prototype: **85%**
- Data and TypeScript service layer: **80%**
- Android blocking MVP: **65%**, pending device validation and failure-hardening
- Analytics correctness: **60%**
- Accessibility and release readiness: **35%**
- iOS product support: **not implemented**; only the default React Native shell exists

## Verification performed

| Check | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | Pass | No TypeScript errors |
| `npm test -- --runInBand` | Pass | 23 suites, 139 tests |
| `npm test -- --coverage --runInBand` | Pass | 35.3% line coverage overall |
| `npm run lint -- --no-cache` | Pass with warnings | 0 errors, 107 warnings |
| `android/gradlew.bat :app:assembleDebug` | Pass | Build completed successfully in 2m 18s |
| Debug APK | Produced | `android/app/build/outputs/apk/debug/app-debug.apk`, about 171 MB |
| Physical Android behavior | Not verified | Every item in `docs/MANUAL_TEST_MATRIX.md` remains unchecked |
| iOS build/runtime | Not verified | Core native features are Android-only |

The Android build emitted an SDK XML tooling-version warning and Gradle deprecation warnings that will become incompatible with Gradle 10. These do not stop the current debug build but should be cleaned up before toolchain upgrades.

## What is implemented and how it works

### Startup and persistence

- `App.tsx` initializes SQLite before showing the product and displays a retryable database failure state.
- `src/db/index.ts` protects overlapping initialization calls with one shared promise.
- `src/db/migrate.ts` splits multi-statement migrations so they execute correctly with the Android SQLite driver.
- Local tables cover Bricks/tags, blocked apps, sessions, blocked attempts, and key/value settings.
- Android backup is disabled, and there is no application network/telemetry code in the audited source.

### Onboarding

Implemented sequence:

1. Three-screen value introduction.
2. Usage Access explanation and system grant flow.
3. Accessibility explanation and system grant flow.
4. OEM-aware battery, overlay, and autostart guidance.
5. NFC scan or manual tag entry.
6. Brick name/location selection.
7. Installed-app selection.
8. Completion and navigation to the main app.

The Usage Access and Accessibility screens poll the system until permission is detected. NFC unsupported and disabled states have UI fallbacks.

### Main focus loop

- Home loads the daily goal, focus time, sessions, blocked count, Bricks, global blocked apps, category toggles, and recent blocked attempts.
- Starting a session creates a SQLite session and passes package IDs to the Android native blocker.
- Focus Lock derives elapsed time from the wall clock, which is resilient to backgrounding and JS timer pauses.
- A known NFC tag starts a session while idle and ends it while active. A four-second cooldown prevents a single launch tag from immediately ending the session it just started.
- The Android foreground service polls Usage Events once per second as a fallback.
- The Accessibility Service also reacts to foreground window changes for faster blocking.
- `BlockGuard` excludes the Bricks app, System UI, and the launcher; deduplicates repeated detections; records attempts; and opens `BlockedActivity`.
- Active native state is persisted in SharedPreferences and the boot receiver tries to restart the foreground service after reboot.

### Management and analytics

- Users can add, edit, and delete Bricks.
- Users can add/remove installed launcher apps from the global blocked list.
- History groups sessions by day and shows duration, Brick name, outcome, and blocked count.
- Insights has day/week/month aggregation, focus totals, goal progress, consistency, streak, trend bars, completion by mode, best day, average duration, and top blocked apps.
- Theme choice and profile name persist locally.

## Critical and high-priority findings

### P0 — Release build uses the debug signing key

`android/app/build.gradle:103` signs the `release` build with `signingConfigs.debug`. A build created this way is not a valid production release configuration and exposes a widely known development key.

**Required fix:** create a protected upload/release keystore, inject credentials from a non-committed properties or CI secret source, enable the release signing configuration, and verify an AAB with `bundleRelease`.

### P0 — Session creation is not atomic with native blocking startup

`src/services/blocking/blockingEngine.ts:33-46` inserts an open session before calling `BlockingModule.startBlocking`. If the native call fails:

- an active SQLite row remains;
- the Zustand store may still appear idle;
- Home starts are not wrapped in a visible error handler;
- a later hydrate can unexpectedly attempt to resume that abandoned session.

The inverse happens during stop: `blockingEngine.ts:61-66` closes the database session before calling the native stop method. If native stop fails, Android can keep blocking while the app reports that the session ended.

**Required fix:** define compensating transactions/state. On start failure, close or delete the new session with an explicit failed outcome. On stop failure, do not present the app as safely idle; retry native shutdown, expose a blocking-health error, and reconcile persisted native state.

### P0 — Multiple active sessions can be created

`src/state/sessionMachine.ts` returns the existing active state for a `START` event instead of rejecting it. `blockingEngine.ts:12-19` only checks that the resulting state is active, so a second start proceeds and creates another row with `end_time IS NULL`.

This is reachable through rapid taps because Home and Brick actions are not guarded by a start-in-progress flag. NFC has a cooldown, but the main Start button and Brick cards do not.

An older open row will continue contributing increasing time to analytics even after the newest row is ended.

**Required fix:** reject `START` from active, enforce a database-level invariant or transactional check for one open session, and disable all start controls while starting.

### P1 — Planned session duration is not behaviorally implemented

`src/screens/FocusLock.tsx:23-80` loads a Brick duration and computes remaining time and progress, but no service or timer ends/unlocks the session when the duration reaches zero. A 25/50/90-minute session can show `0h 0m remaining` indefinitely while blocking continues.

**Required decision:** either automatically complete timed sessions at zero, or rename duration as a target and explicitly state that only tapping the Brick ends blocking. The current copy promises a session length that the runtime does not enforce.

### P1 — Analytics contradicts override and streak messaging

- `computeStreakDays` counts every day containing any started session, regardless of completion or ending method.
- `getCompletionByMode` counts every ended session with positive duration as completed, including `ended_via='override'`.
- The emergency UI says ending early will break the streak, but the data model does not do that.

**Impact:** streaks and completion rates are inflated, undermining the product’s trust and behavior-change loop.

**Required fix:** define completion semantics using planned duration plus `endedVia`. Count NFC/timed completions separately from overrides, service kills, and abandoned sessions. Add analytics regression tests for all ending modes.

### P1 — Native blocked attempts can be duplicated after app restart

Android `BlockGuard` writes each attempt to `StateStore` and emits the same attempt to JavaScript. While JS is alive, the listener writes it to SQLite. The SharedPreferences copy remains queued and is later drained during recovery, which can insert the same attempt a second time.

**Required fix:** add stable attempt IDs and a unique database constraint, or acknowledge/remove native queued attempts after successful JS delivery. Bound the pending queue to prevent unbounded SharedPreferences growth while JS is unavailable.

### P1 — Physical-device blocking behavior is unverified

`docs/MANUAL_TEST_MATRIX.md` contains 17 device-only scenarios and every Pass box is blank. The unverified cases include the core promise:

- physical NFC start and stop;
- blocked-app redirect;
- force-kill persistence;
- reboot recovery;
- permission denial/revocation;
- emergency override;
- disabled/unsupported NFC;
- OEM battery restrictions;
- one-hour Doze survival;
- deep-link and notification app launches.

Passing Jest tests and compiling Kotlin cannot prove these OS-controlled behaviors.

**Required fix:** test at least Pixel/stock Android plus Samsung and one aggressive OEM such as Xiaomi/Oppo/Vivo. Record Android versions, pass/fail evidence, and logs for every matrix row.

## Incomplete or misleading product features

### Settings stored but not consumed

The following controls update SQLite but have no meaningful downstream implementation in the audited source:

- **Break Reminders** — no scheduler, timer, notification, or reminder screen.
- **Auto-Pilot** — no scheduling engine; the Schedule row itself has no navigation handler.
- **Block intensity** — stored percentage is never read by the blocker or focus logic.
- **Notifications** — stored but not used to suppress permission requests or notifications. Notification permission is requested during every applicable app startup independently of this toggle.
- **Home block categories** — stored as `block_categories`, but session start sends the global `blocked_apps` package list. Toggling Social/Games/etc. does not change what is blocked.

These should either be implemented or removed from the MVP UI. Displaying controls that do nothing is worse than postponing them.

### Brick recipes and global blocked apps do not match

Each Brick stores category flags, mode, duration, and strictness. However, `useFocusStore.startSession` always loads every globally selected blocked app and sends that same list to every Brick. Category counts shown on Brick cards are counts of enabled categories, not actual blocked apps.

**Required decision:**

- make each Brick own an explicit package list; or
- make blocked apps clearly global and remove/relabel per-Brick category configuration.

### Onboarding can declare success before the app is usable

`src/screens/Intro.tsx:24-26` makes Skip call `completeOnboarding()` and reset directly to the main tabs. This bypasses Usage Access, Accessibility, reliability setup, tag registration, and app selection. The documented manual expectation says denied permissions should block progress, but Skip defeats that gate.

Battery/overlay/autostart setup can also be continued without completion. Optional reliability steps can remain optional, but the product should distinguish “recommended” from “required” and show health later.

### NFC disabled recovery can enter a permanent scanning state

`src/screens/RegisterTag.tsx:132` sets `disabled` to false immediately after opening system settings and assumes NFC will be enabled. If the user returns without enabling it, the listener refuses to arm, while the UI shows “Scanning…” with no further state check.

**Required fix:** re-check NFC status on AppState foreground and keep the disabled screen until the system confirms it is enabled.

### Dead or disconnected UI

- Settings → Schedule has no action.
- About → Licenses has an empty handler.
- About → Contact / Support has an empty handler.
- About → Rate Bricks has an empty handler.
- The React Native `Blocked` modal exists in navigation but Android enforcement launches the separate native `BlockedActivity`; no audited code navigates to the RN `Blocked` screen.
- The `FocusLock` stack route is registered, but Home renders `FocusLock` inline based on store state rather than navigating to that route.

Dead routes and controls increase test and maintenance surface and make completeness difficult to reason about.

## Correctness and recovery concerns

### Recovery can show “active” while enforcement failed

When SQLite has an active session but native state is absent, `recoverActiveSession` tries to restart native blocking and intentionally ignores errors. It then returns the session as active regardless. The user can see Focus Lock even though blocked apps are not actually protected.

Add an explicit enforcement health state such as `starting`, `active`, `degraded`, and `stopping`. Focus Lock should visibly warn and provide recovery actions when permission or service health is degraded.

### Permission revocation has no runtime warning

The manual test matrix expects a warning when Accessibility is revoked mid-session. The service may stop delivering events and the usage fallback may fail if Usage Access is revoked, but the JS UI has no periodic permission-health check during an active session.

### Boot recovery before unlock is doubtful

The manifest listens for `LOCKED_BOOT_COMPLETED`, but the receiver is not marked direct-boot aware and `StateStore` uses ordinary credential-protected SharedPreferences. Normal `BOOT_COMPLETED` recovery after unlock may work; recovery before first unlock should not be claimed without a direct-boot-aware storage design and device verification.

### Database integrity is minimal

- There are no foreign keys between sessions, attempts, and tags.
- Deleting a Brick preserves historical sessions only through a now-unresolvable string ID, so History falls back to “Unknown Brick.”
- There is no uniqueness rule preventing multiple open sessions.
- Pending blocked attempts have no unique ID or deduplication constraint.
- The schema has only one migration version and no downgrade/export/recovery tooling.

For local-first use this is acceptable during MVP development, but the session invariants should be hardened before real users accumulate history.

## Accessibility audit

No explicit `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, `accessibilityHint`, or `testID` props were found under `src`.

Text-bearing touchables may receive usable inferred labels, but the following need deliberate support:

- icon-only back, close, add, delete, and profile actions;
- the custom Switch component;
- the custom Slider component, which currently only supports drag gestures and has no accessibility increment/decrement actions;
- segmented controls and custom bottom tabs;
- progress rings and animated scanning states;
- selected app/category/mode state announcements;
- error and permission status changes.

The Accessibility Service configuration also sets `canRetrieveWindowContent="true"` and includes window-retrieval flags, while onboarding tells users the service reads only app-open events. The Kotlin service only inspects package names, so the configuration should request the narrowest capability possible and the privacy statement should precisely match it. This is also important for Google Play Accessibility API review.

## Test quality and coverage

The 139 passing tests provide good coverage for pure logic and repositories:

- database repositories: effectively 100% lines;
- blocking engine: 92% lines;
- NFC service: 91.9% lines;
- statistics service: 87.1% lines;
- Zustand focus store: 91.5% lines;
- tag and selection utilities: high coverage.

However, overall line coverage is only **35.3%** because the user-facing and native integration surfaces are mostly untested:

- screens: **5.38%** lines;
- `useNfcSessionStart`: **3.03%** lines;
- native JS bridge: **18.51%** lines;
- actual NFC driver: **6.89%** lines;
- navigation: **19.56%** lines;
- theme context: **10.52%** lines;
- Kotlin services/activities: not covered by Jest.

Priority tests to add:

1. Start failure rolls back/reconciles the open database session.
2. Stop failure keeps a degraded active state and retries.
3. Concurrent/double starts create exactly one session.
4. Override does not count as completion and breaks/does not extend the streak according to the chosen product rule.
5. Timed session reaches zero and performs the chosen completion behavior.
6. Native pending attempts do not duplicate SQLite attempts.
7. AppState return re-checks NFC and permissions.
8. Screen-level tests for onboarding gates, permission states, app selection, Add Brick, Focus Lock, History, and Settings.
9. Android instrumentation tests for service lifecycle, StateStore, BlockGuard deduplication, and intents.

No CI configuration was found. Add a pipeline that runs TypeScript, Jest with a coverage floor, lint, Android unit tests, and at least a debug build on every pull request.

## Lint and maintainability

Lint reports no errors but 107 warnings. Most are inline-style warnings, but some indicate maintainability or behavior risks:

- unstable nested `tabBar` component creation in `MainTabsNavigator`;
- many hard-coded colors outside the theme, creating light/dark inconsistencies;
- duplicated screen/button/header/card implementations;
- a custom Slider with gesture math but limited automated interaction coverage;
- source and tests mixing style definitions with behavior-heavy screens.

Recommended refactor boundaries:

- one shared permission status/action screen;
- one Brick registration wizard used by onboarding and Add Brick;
- one app picker used by onboarding and settings;
- one navigation header component;
- a `FocusSessionCoordinator` that owns all start/stop/recovery reconciliation;
- a typed settings service so unfinished settings cannot appear “implemented” merely because a key is persisted.

## Platform and release readiness

### Android

The project compiles and has the required manifest components for its current architecture. Before Play distribution:

- replace debug release signing;
- build and verify an AAB;
- define production versioning;
- review Accessibility API policy and disclosure requirements;
- justify `SYSTEM_ALERT_WINDOW`, Usage Access, battery-optimization exemption, boot receiver, notification, and special-use foreground-service permissions;
- configure shrink/minification and inspect release size;
- provide privacy policy, support URL, licenses, and store listing metadata;
- test target-SDK behavior on current Android releases;
- verify OEM deep links and fallbacks.

### iOS

The repository contains the standard React Native iOS project, but the product is not functionally implemented for iOS:

- `BlockingModule` depends on an Android native module and rejects when unavailable;
- installed-app enumeration and Android-style app blocking have no iOS equivalent;
- no Screen Time/Family Controls/Managed Settings entitlement architecture exists;
- no iOS NFC usage description or product-specific NFC design is configured;
- the Info.plist contains an empty location usage description even though no location feature was found.

Treat the app as Android-only in product copy and build targets until a separate iOS technical design is completed.

### Product metadata is inconsistent

- `package.json`: version `0.0.1`
- Android: version name `1.0`
- About screen: `v1.0.0`
- Settings footer: `v2.4.1`
- app display name: `BricksApp`, while in-app copy says `Bricks`

Use one build-time version source and one final product name before release.

## Recommended remediation plan

### Phase 1 — Make the core promise trustworthy

1. Prevent concurrent starts and enforce one active session.
2. Reconcile DB/native state on all start/stop failures.
3. Add enforcement health and permission health to Focus Lock.
4. Decide and implement timed-session completion semantics.
5. Deduplicate native blocked attempts.
6. Correct streak and completion rules.

### Phase 2 — Remove false completeness

1. Implement or hide Auto-Pilot, Schedule, break reminders, intensity, and notifications.
2. Resolve global apps versus per-Brick categories.
3. Remove onboarding Skip or route it to a clearly limited/non-blocking mode.
4. Connect or remove About actions and dead navigation routes.
5. Standardize product name and version.

### Phase 3 — Validate Android in reality

1. Complete all 17 manual-device scenarios.
2. Add Android instrumentation tests.
3. Test stock Android, Samsung, and at least one aggressive OEM.
4. Verify blocked launches from icons, recents, notifications, widgets, and deep links.
5. Test reboot, Doze, permission revocation, and service process death.

### Phase 4 — Release hardening

1. Production signing and CI/CD.
2. Accessibility pass with TalkBack and large text.
3. Play policy/privacy review.
4. Release size, minification, and crash monitoring decision.
5. Store metadata, support, licenses, and privacy policy.

## Definition of “MVP complete”

BricksApp should not be called MVP-complete until all of the following are true:

- exactly one session can be active;
- native and database state reconcile after every failure and restart;
- timed sessions behave as described;
- completion and streak analytics match user-facing promises;
- every visible control has a real effect;
- all required permissions have clear live health states;
- all 17 manual Android scenarios pass on representative devices;
- TalkBack can operate every primary flow;
- a release-signed AAB builds in CI;
- product name, version, privacy, licenses, and support information are complete.

At present, the app is best described as **a well-structured, buildable Android MVP candidate with an implemented core loop, but with production-critical reconciliation, validation, analytics, accessibility, and release work still outstanding**.
