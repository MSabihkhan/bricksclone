# SUBTASK 5 OF 9 — OEM BATTERY-MANAGEMENT / AUTOSTART ONBOARDING PLUMBING

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md, src/theme/index.ts. Read src/native/BlockingModule.ts and
android/app/src/main/java/com/bricks/app/BricksBlockingModule.kt (S4 created these — you will EXTEND the
native module, keep everything else in them intact).
S1-S4 done and green. No JDK/SDK here — Kotlin cannot be compiled; review will be manual. JS must be tested.

CONTEXT: target market is Pakistan-heavy on MIUI (Xiaomi/Redmi/Poco), ColorOS (Oppo/Realme), FuntouchOS/OriginOS
(Vivo) — all aggressively kill background services and disable autostart by default, silently breaking session
enforcement. This subtask builds the DETECTION + INSTRUCTION + DEEP-LINK plumbing so onboarding (S8) can show a
manufacturer-specific "keep us alive" step. UI screens come later (S6/S8); you only build services + native plumbing
+ tests now.

## A. NATIVE (extend BricksBlockingModule.kt)

Add TWO new @ReactMethod Promise functions to BricksBlockingModule.kt (do not remove or change existing methods):

1. hasIgnoringBatteryOptimizations(promise): Boolean
   - val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
   - promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))

2. openOemSettings(oem: String, screen: String, promise)
   - Build a target Intent per OEM + screen, launch with FLAG_ACTIVITY_NEW_TASK, and ALWAYS fall back to the
     generic ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS (or ACTION_SETTINGS) if the OEM intent cannot be resolved
     (resolveActivity == null). Wrap in try/catch; on any exception fall back to generic then resolve(null).
   - Intent targets (use androidx Intent.canResolveActivity check via packageManager.queryIntentActivities):
     * MIUI/Xiaomi (oem in {xiaomi, redmi, poco}):
       - autostart: action "miui.intent.action.OP_AUTO_START" package "com.miui.securitycenter"
       - battery:   action "miui.intent.action.OP_BATTERY_SAVER" package "com.miui.securitycenter"
     * ColorOS/Oppo/Realme (oem in {oppo, realme}):
       - autostart: package "com.coloros.safecenter", activity "com.coloros.safecenter.startupapp.StartupAppListActivity"
       - battery:   package "com.oplus.safe" activity "com.oplus.safe.view.manage.BatteryOptimizationActivity"
     * Vivo (oem == vivo):
       - autostart: package "com.vivo.permissionmanager" activity "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
       - battery:   package "com.vivo.permissionmanager" activity "com.vivo.permissionmanager.activity.PurgeManagerActivity"
     * Samsung (oem == samsung):
       - battery: package "com.samsung.android.lool"
     * generic: battery -> Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS; autostart -> Settings.ACTION_SETTINGS
   - oem parameter is a lowercase string id ("xiaomi"|"redmi"|"poco"|"oppo"|"realme"|"vivo"|"samsung"|"generic").
   - If an OEM-specific intent can't be resolved, fall back to the generic action. Always resolve(promise) — never reject.

## B. JS LAYER (fully tested)

3. src/services/oem/oemDetection.ts — PURE functions, no react-native imports.
   - export type OemId = "xiaomi" | "redmi" | "poco" | "oppo" | "realme" | "vivo" | "samsung" | "google" | "generic"
   - export interface OemInfo { id: OemId; name: string; isAggressive: boolean; batterySteps: string[]; autostartSteps: string[]; }
   - detectOem(manufacturer: string): OemInfo — map Build.MANUFACTURER values (case-insensitive substring match):
     "xiaomi"|"redmi"|"po" -> MIUI family; "oppo"|"realme" -> ColorOS; "vivo"|"iqoo" -> Vivo; "samsung" ->
     Samsung; "google"|"pixel" -> Google. Everything else -> generic { isAggressive: false }.
     Return concrete, honest instructional steps (numbered strings) for battery + autostart per OEM. For generic,
     give standard Android steps (disable battery optimization + enable notification access if present).
   - export const OEM_SUMMARY: Record<OemId, string> — a one-line "why this matters" string per OEM.
   - Keep strings plain (they will be rendered by S8 UI).

4. src/services/oem/oemService.ts — runtime service using BlockingModule.
   - getOem(): Promise<OemInfo> — manufacturer = await BlockingModule.getManufacturer(); return detectOem(manufacturer)
     (catch -> generic).
   - hasBatteryOptimizationExemption(): Promise<boolean> — BlockingModule.hasIgnoringBatteryOptimizations() (catch -> false).
   - openBatterySettings(oem: OemId): Promise<void> — BlockingModule.openOemSettings(oem, "battery") (catch -> Linking.openSettings()).
   - openAutostartSettings(oem: OemId): Promise<void> — BlockingModule.openOemSettings(oem, "autostart") (catch -> Linking.openSettings()).
   - export const oemService = { getOem, hasBatteryOptimizationExemption, openBatterySettings, openAutostartSettings }
   - export helper inAppName(): returns "Bricks" (used by instructions text).

5. Extend src/native/BlockingModule.ts — add hasIgnoringBatteryOptimizations(): Promise<boolean> and
   openOemSettings(oem: string, screen: string): Promise<void> to both the real and stub implementations.

## C. TESTS (all green under `npm test`)

6. __tests__/oem/oemDetection.test.ts — detectOem: "Xiaomi" -> xiaomi aggressive true; "Redmi Note 11" -> redmi;
   "POCO X5" -> poco; "OPPO CPH2451" -> oppo; "realme 9" -> realme; "vivo 1906" -> vivo; "iQOO 12" -> vivo;
   "samsung SM-S918B" -> samsung; "Google" -> google; "Fairphone" -> generic. All aggressive OEMs have
   batterySteps.length>0 and autostartSteps.length>0. Generic isAggressive false.

7. __tests__/oem/oemService.test.ts — jest.mock ../../src/native/BlockingModule. getOem maps manufacturer via
   detectOem; native failure -> generic. openBatterySettings calls openOemSettings(oem,"battery"); native throw ->
   falls back to Linking.openSettings (mock Linking from react-native with jest.mock). hasBatteryOptimizationExemption
   passes through.

## VERIFICATION GATES (run, confirm, report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npx jest __tests__/oem --silent -> both suites pass
   - npm test all green

## CONSTRAINTS
TypeScript strict, no `any` in new files, no explanatory comments, no iOS. Do not modify src/db, src/navigation,
src/services/nfc, src/state, src/services/blocking, App.tsx. No new npm deps.

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: files created/changed, the OEM intent table you implemented, and tsc/eslint/jest results.
