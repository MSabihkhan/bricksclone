# SUBTASK 4 OF 9 — ANDROID NATIVE BLOCKING ENGINE + SESSION STATE MACHINE

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md. Also read src/db/repositories/*.ts and src/db/types.ts (DONE — reuse),
src/services/nfc/tagUtils.ts (DONE — reuse), src/theme/index.ts (colors for native UI).
S1-S3 done. This environment has NO JDK/SDK — you CANNOT compile Kotlin. Write it carefully; correctness
review will be manual. JS layers MUST be fully unit-tested in Jest.

CONTEXT: package com.bricks.app. Template is Kotlin (MainActivity.kt, MainApplication.kt at
android/app/src/main/java/com/bricks/app/). New Architecture 0.86 — use a LEGACY ReactContextBaseJavaModule
registered manually via add(...) in MainApplication; that works through the interop layer. Blocking must
survive app force-kill and device reboot; JS polling is fallback only.

SCOPE — build the full blocking engine (native + JS orchestration + pure state machine). No UI screens.

## A. NATIVE ANDROID (Kotlin)
Create under android/app/src/main/java/com/bricks/app/:

1. StateStore.kt — object StateStore with:
   - save(active: BlockingState?)
   - load(): BlockingState?
   - recordAttempt(pkg: String, label: String, ts: Long)
   - drainAttempts(): List<Attempt>
   Backed by SharedPreferences("focus_blocking") + org.json.JSONObject/JSONArray.
   BlockingState { sessionId: Long, blockedPackages: List<String>, strict: Boolean, startedAt: Long }.
   Attempt { sessionId: Long, packageName: String, label: String, createdAt: Long }.
   On startBlocking clear old state; on stopBlocking save(null) but KEEP the attempts buffer.

2. FocusBlockingService.kt — Service with START_STICKY.
   - onStartCommand: if active state in StateStore -> startForeground with NotificationChannel "focus_blocking"
     (low importance, ongoing, content "Focus session active · N apps blocked").
   - Spawn a daemon Thread polling every 2000ms: UsageStatsManager.queryUsageStats(INTERVAL_BEST, now-5000, now) ->
     most recent LAST_TIME_USED entry's packageName is the foreground app. If it is in active.blockedPackages AND
     not the app's own package AND not "com.android.systemui" AND not the launcher package ->
     recordAttempt + launch BlockedActivity (flags NEW_TASK | CLEAR_TOP). Polling is the FALLBACK; the
     accessibility service is the PRIMARY mechanism. Skip launching if BlockedActivity already showing (in-process flag).
   - onDestroy: if StateStore still active, do NOT stopSelf during an active session (START_STICKY lets the OS
     restart it).

3. BlockingAccessibilityService.kt — AccessibilityService.
   - onServiceConnected: serviceInfo = AccessibilityServiceInfo(); eventTypes = TYPE_WINDOW_STATE_CHANGED;
     feedbackType = FEEDBACK_GENERIC.
   - onAccessibilityEvent: if eventType == TYPE_WINDOW_STATE_CHANGED and active state exists:
     pkg = event.packageName?.toString() ?: return. If pkg in blockedPackages and not self package / not
     systemui / not launcher -> recordAttempt(pkg, label resolved via PackageManager.getApplicationLabel)
     + launch BlockedActivity. PRIMARY interception.

4. BlockedActivity.kt — full-screen activity: excludeFromRecents, taskAffinity "", no launcher icon, dark theme.
   Programmatic UI in Kotlin (no XML layout needed): background #0F1115, centered rounded red #E82127 lock
   glyph, letter-spaced caps label "FOCUS LOCKED", line "Distraction blocked", button "OK, back to focus"
   that finishes(). Guard with an in-process flag so it launches only once at a time (reset onDestroy).

5. BricksBlockingModule.kt (ReactContextBaseJavaModule, name "BricksBlocking") + BricksBlockingPackage.kt.
   All Promise-style (@ReactMethod fun x(promise: Promise)). Methods:
   - startBlocking(sessionId: Double, blockedPackages: ReadableArray, strict: Boolean, startedAt: Double):
     StateStore.save + startForegroundService(FocusBlockingService)
   - stopBlocking(): stop service (intent to stopService) + StateStore.save(null)
   - isBlockingActive(promise): Boolean
   - getActiveBlocking(promise): map {sessionId, blockedPackages, strict, startedAt} or null
   - hasUsageAccess(promise): AppOpsManager.checkOpNoThrow(OPSTR_GET_USAGE_STATS) == MODE_ALLOWED
   - requestUsageAccess(): startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
   - isAccessibilityEnabled(promise): Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES string contains this component
   - requestAccessibility(): startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
   - getForegroundPackage(promise): String? via UsageStatsManager
   - getPendingBlockedAttempts(promise): StateStore.drainAttempts() -> array of maps
   - getManufacturer(promise): Build.MANUFACTURER
   - Emit JS event "BlockedAttempt" with {packageName, label, createdAt} via
     reactContext.getJSModule(RCTDeviceEventEmitter::class.java) whenever accessibility/service records an
     attempt (in addition to buffering).

6. BootReceiver.kt — BroadcastReceiver for ACTION_BOOT_COMPLETED (also ACTION_LOCKED_BOOT_COMPLETED):
   if StateStore.load() != null -> startForegroundService(FocusBlockingService).

7. MainApplication.kt — add BricksBlockingPackage() to the packages list.

8. AndroidManifest.xml (android/app/src/main/AndroidManifest.xml):
   - permissions: FOREGROUND_SERVICE, FOREGROUND_SERVICE_SPECIAL_USE, PACKAGE_USAGE_STATS
     (add xmlns:tools to the manifest root and tools:ignore="ProtectedPermissions"), RECEIVE_BOOT_COMPLETED.
   - BlockedActivity: exported=false, excludeFromRecents=true, taskAffinity="", dark theme.
   - FocusBlockingService: exported=false, foregroundServiceType="specialUse",
     property android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE = "Focus session app blocking", stopWithTask=false.
   - BlockingAccessibilityService: permission android.permission.BIND_ACCESSIBILITY_SERVICE,
     intent-filter android.accessibilityservice.AccessibilityService,
     meta-data android:resource="@xml/accessibility_service_config".
   - BootReceiver: exported=true, intent-filter BOOT_COMPLETED + LOCKED_BOOT_COMPLETED.

9. res/xml/accessibility_service_config.xml — accessibilityEventTypes="typeWindowStateChanged",
   canRetrieveWindowContent="false", description string, notificationTimeout=100. Add the accessibility
   service label string to res/values/strings.xml.

## B. JS LAYER (fully tested)

10. src/native/BlockingModule.ts — typed wrapper: `const raw = NativeModules.BricksBlocking`. If raw is
    undefined return a stub whose methods reject with Error('native module unavailable'). Exports:
    startBlocking({sessionId, blockedPackages, strict, startedAt}), stopBlocking(), isBlockingActive(),
    getActiveBlocking(), hasUsageAccess(), requestUsageAccess(), isAccessibilityEnabled(),
    requestAccessibility(), getForegroundPackage(), getPendingBlockedAttempts(), getManufacturer(),
    blockedAttemptsEmitter (new NativeEventEmitter(raw)) with a typed addAttemptListener helper returning an
    unsubscribe function. No `any`.

11. src/state/sessionMachine.ts — PURE state machine. No react-native/db imports.
    - state: "idle" | "active"
    - events: {type:"START"} | {type:"END_NFC"} | {type:"END_OVERRIDE"} | {type:"FORCE_KILL_RECOVER"} |
      {type:"SERVICE_KILL_RECOVER"} | {type:"BOOT_RECOVER"}
    - reducer(state, event) -> state. Allowed transitions:
      idle --START--> active; active --END_NFC/END_OVERRIDE--> idle;
      active --FORCE_KILL_RECOVER/SERVICE_KILL_RECOVER/BOOT_RECOVER--> active (resumes).
      All other combinations return the CURRENT state unchanged (no throwing).
    - endedViaForEvent(event): "nfc" | "override" | "force_kill" | "service_kill" | null
    - export interface SessionState

12. src/services/blocking/blockingEngine.ts — orchestrates session lifecycle. Imports: db from src/db
    (sessions, blockedApps, blockedAttempts, settings), sessionMachine, BlockingModule. Functions:
    - startFocusSession({tagId, apps}): validate reducer START allowed; db.sessions.startSession({tagId,
      startTime: floor(now/1000), strict: 1, apps}); BlockingModule.startBlocking({sessionId,
      blockedPackages: apps, strict: true, startedAt}); returns {sessionId, state:"active"}.
    - endFocusSession(via: "nfc"|"override"): reducer END_NFC/END_OVERRIDE; read active session;
      durationSec = now - startTime; db.sessions.endSession(id, {endedVia: via, durationSec});
      BlockingModule.stopBlocking(); returns state.
    - recoverActiveSession(): called on app launch. Promise.all([BlockingModule.getActiveBlocking(),
      db.sessions.getActiveSession()]). If native active but no DB row -> restore DB row (startSession with
      stored times) so stats keep it. If DB active but native inactive -> BlockingModule.startBlocking(...) to
      re-enforce. If both active -> fine. Then flush pending attempts: BlockingModule.getPendingBlockedAttempts()
      -> db.blockedAttempts.recordAttempt each (active sessionId). Return {state, activeSession}. Any native
      failure treated as "native inactive" — do not crash. No `any`.
    - attachBlockedAttemptListener(handler): subscribes to blockedAttemptsEmitter; returns unsubscribe.
    - Export a small object `blockingEngine` with these four methods.

## C. TESTS (all green under `npm test`)

13. __tests__/state/sessionMachine.test.ts — full table: START idle->active; START active->active no-op;
    END_NFC/END_OVERRIDE active->idle; END_NFC idle->idle no-op; FORCE_KILL_RECOVER/SERVICE_KILL_RECOVER/
    BOOT_RECOVER active->active; recover events idle->idle; endedViaForEvent mapping incl null for START/recover.

14. __tests__/services/blockingEngine.test.ts — jest.mock src/db (in-memory fake repositories),
    jest.mock src/native/BlockingModule (fake native). Tests:
    - startFocusSession creates DB row + calls native with correct sessionId/packages
    - endFocusSession("nfc") writes endedVia nfc + duration + calls stopBlocking
    - endFocusSession("override") writes override
    - recoverActiveSession: native-only case restores DB row; db-only case re-enforces native; attempts flushed
      into db; listener attach returns unsubscribe
    Use jest.fn for the emitter subscription.

## VERIFICATION GATES (run, confirm, and report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npx jest __tests__/state __tests__/services --silent -> new suites pass
   - npm test all green
   Kotlin cannot be compiled here.

## CONSTRAINTS
TypeScript strict, no `any` in new files, no explanatory comments, no iOS. Do not modify src/db,
src/navigation, src/services/nfc, App.tsx. Do not add new npm deps.

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: list of files created, native module registration approach, how force-kill + reboot recovery works
end to end, tsc/eslint/jest results.
