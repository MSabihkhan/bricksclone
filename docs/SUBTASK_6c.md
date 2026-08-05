# SUBTASK 6c OF 9 — ONBOARDING SCREENS (intro, permissions, OEM setup, tag register, app select, done)

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md, src/theme/index.ts, src/theme/ThemeContext.tsx, src/components/* (Screen, Button,
Card, Switch, SectionHeader, Icon, RingProgress, SegmentedControl, Slider), src/state/useFocusStore.ts,
src/services/nfc (tagUtils, NfcService, nfcService), src/services/oem (oemService, oemDetection), src/db (types,
repositories, index).
Then read the mockup ONBOARDING section: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp\..\Bricks Mockup\Bricks Focus.dc.html (~lines 314-336) — this is the ONLY mockup screen for onboarding; ALL other onboarding
screens extrapolate that exact visual language (same header with BRICKS logo + Skip, same centered icon box/title/
text, same bottom CTA, same dots pattern). Do not invent a new style.
S1-S6b done and green. Keep intact.

GOAL: replace the 9 onboarding screen SHELLS with real screens. Navigation gating/ordering is wired in S8 — screens
here just implement their own UI + local actions and navigate to the next screen with typed navigation.

## 1. Native — enumerate installed apps (extend BricksBlockingModule.kt)
Add @ReactMethod getInstalledApps(promise): Promise<Array<{packageName: string, label: string}>>
- packageManager.getInstalledApplications(PackageManager.GET_META_DATA or 0).
- Keep only apps with a launcher intent (queryIntentActivities ACTION_MAIN + CATEGORY_LAUNCHER set contains
  applicationInfo.packageName).
- label = getApplicationLabel(ai).toString() (fallback packageName).
- Exclude this app's own package (com.bricks.app).
- Return array of maps. Flag device verification.
Expose in src/native/BlockingModule.ts (real + stub): getInstalledApps(): Promise<InstalledApp[]>; export interface
InstalledApp { packageName: string; label: string; }.

## 2. src/utils/onboarding.ts — PURE helpers (unit-tested)
- export const LOCATIONS = [{key:'desk',label:'Desk',icon:'monitor'}, {key:'bedroom',label:'Bedroom',icon:'bed'},
  {key:'office',label:'Office',icon:'building'}, {key:'kitchen',label:'Kitchen',icon:'coffee'},
  {key:'studio',label:'Studio',icon:'music'}, {key:'car',label:'Car',icon:'car'}] (icon names from Icon.tsx).
- export function validateBrickName(name: string): boolean (trimmed length >= 1).
- export function defaultCategories(): Record<string, boolean> — { social:true, games:true, video:true, news:true,
  shopping:false, messaging:false }.
- export function isTagIdInputValid(raw: string): boolean — uses isValidTagId from tagUtils.

## 3. src/utils/appSelection.ts — PURE reducer for multi-select (unit-tested)
- export interface SelectionState { [packageName: string]: boolean }
- export function toggleSelection(state: SelectionState, packageName: string): SelectionState (immutable copy)
- export function selectedCount(state: SelectionState): number

## 4. Screens (replace shells). Each uses Screen + theme via useTheme().
Common onboarding header component FIRST: src/components/OnboardingHeader.tsx — row: BRICKS logo (22px accent box
radius 6 with 9px white inner square) + "BRICKS" (15px 800 ls .06em) left; right "Skip" (14px 700 muted) with
onSkip prop (optional).

a) Intro.tsx — mockup 3-step pager (icon box 104 radius 30 tinted accent 14% + accent border; icon 44 accent; title
  34px 800 ls -0.035em; body 16px 500 muted lineHeight 26; dots: active 26px accent pill else 6px colors.border;
  CTA 56px radius 16 accent "Continue" / last step "Get Started").
  Steps (from mockup): shield "Block the noise" / target "Set your intent" / barChart "Watch focus grow" with the
  mockup copy. local step state. On finish navigate('WhyUsageAccess'). Skip -> navigate('WhyUsageAccess') too (S8
  decides real gating).
b) WhyUsageAccess.tsx — "Why usage access" explanation screen: header; icon box (shield, accent); title "Why do you
  need this?"; body explaining: "Bricks uses Usage Access to detect which app you open so it can redirect blocked
  apps the moment they launch. Your usage data never leaves this phone."; CTA "Continue" -> navigate('GrantUsageAccess').
c) GrantUsageAccess.tsx — same shell; CTA "Allow usage access" calls BlockingModule.requestUsageAccess(); poll
  hasUsageAccess() every 1s (setInterval, clear on unmount); when true show success state (green check box) + CTA
  "Continue" -> navigate('WhyAccessibility'). If user comes back without granting, keep button + hint text
  "Permission required to block apps" (do not auto-continue).
d) WhyAccessibility.tsx — explanation: "Bricks uses an Accessibility Service to instantly redirect blocked apps to a
  locked screen when you try to open them mid-session. It reads only app-open events, nothing else." CTA ->
  navigate('GrantAccessibility').
e) GrantAccessibility.tsx — CTA "Enable accessibility" calls BlockingModule.requestAccessibility(); poll
  isAccessibilityEnabled(); success state + Continue -> navigate('BatteryOptimization').
f) BatteryOptimization.tsx — on mount: oem = await oemService.getOem(); exemption = await
  oemService.hasBatteryOptimizationExemption(). UI: icon box (zap), title "Keep Bricks running", body = OEM_SUMMARY
  for oem.id. Then instruction list: "Battery:" numbered oem.batterySteps, "Autostart:" numbered oem.autostartSteps
  (only show autostart block if steps.length>0 and oem.isAggressive). Buttons: "Open battery settings"
  (oemService.openBatterySettings(oem.id)) and if autostart block shown "Open autostart settings"
  (oemService.openAutostartSettings(oem.id)). Green check line if exemption true ("Battery optimization is off for
  Bricks"). CTA "Continue" -> navigate('RegisterTag').
g) RegisterTag.tsx — NFC brick registration.
  Modes: 'unsupported' | 'scanning' | 'detected' | 'naming' | 'manual'.
  - On mount: check nfcService.isSupported() and isEnabled(). If unsupported -> 'unsupported' UI: icon box (radio),
    title "NFC not available", body "Your phone doesn't support NFC tags. You can still use Bricks with a manual
    toggle."; CTA "Enter tag ID manually" -> 'manual'. If disabled -> show "NFC is off" + button "Open NFC settings"
    (nfcService.openSettings()) then resume.
  - 'scanning': nfcService.beginListening(onTag); pulsing double ring (reuse pattern from mockup scan section:
    190px, two ringPulse rings, 98px accent rounded box with radio icon 44 white, glow); title "Hold your phone\nnear
    the Brick" (26px 800 ls -0.03em); sub "Scanning for your tag…" (15px 500 muted). On tag -> 'detected'.
  - 'detected': accent brick box 134 radius 36 with radio glyph + glossy top bar (mockup detected section); eyebrow
    "NEW BRICK DETECTED" (11px 800 ls .16em green); title "Unregistered Brick" (26px 800); id line "ID · {formatTagId}"
    (14px 600 muted tabular). Buttons: primary "Register this Brick" -> 'naming'; ghost "Not now" -> navigate back.
  - 'naming': header "REGISTER BRICK / Step 1 of 1 · Name" (11px 800 ls .14em faint / 15px 800); icon box 76 radius
    22 tinted; title "Name this Brick" (27px 800); sub "Where does it live? You'll tap it here to start focusing.";
    text input (height 58, radius 16, card bg, border, 20px 800); "QUICK PICK" label + 3-col grid LOCATIONS (icon
    20 + label 11px 700; selected = accent bg white icon). CTA "Register" (enabled when validateBrickName) ->
    db.tags.registerTag({id: normalizedTagId, name, location, mode:'deep', categories: defaultCategories(),
    duration:'50', strict:1, createdAt: now}) then navigate('SelectApps').
  - 'manual': text input for tag id + hint "Enter the tag ID printed on your Brick (hex)". "Use this ID" enabled when
    isTagIdInputValid. Goes to 'naming' with that id.
  - stopListening on unmount / leaving screen.
h) SelectApps.tsx — "What should Bricks block?" list.
  - On mount: apps = await BlockingModule.getInstalledApps() (loading spinner state; if native unavailable show
    message + a manual add input). Local SelectionState init from db.blockedApps.listBlockedApps().
  - Search TextInput (58px input style) filtering by label substring (case-insensitive).
  - FlatList rows: app icon box (36 radius 10 card2, first letter uppercase 14px 700) + label 14px 700 + right: check
    circle (22px, selected = accent bg white check icon 13, else 2px colors.border border).
  - Bottom fixed CTA (outside list): "Continue (N selected)" — disabled when N===0; on press
    db.blockedApps.replaceAll(selected apps mapped {packageName, label, addedAt}) -> navigate('OnboardingDone').
i) OnboardingDone.tsx — green check circle 104 radius 50 with white check 46 + glow; title "You're all set" (28px 800);
  body "Tap your Brick to start your first focus session."; CTA primary "Start focusing" -> db.settings.set('onboarded',
  '1') then navigation.reset to MainTabs (typed: RootStackParamList MainTabs).

## 5. Tests (all green under `npm test`)
- __tests__/utils/onboarding.test.ts — LOCATIONS has 6 entries with valid icon names; validateBrickName trims;
  defaultCategories shape; isTagIdInputValid uses hex rule.
- __tests__/utils/appSelection.test.ts — toggle add/remove idempotent; selectedCount.
- __tests__/screens/registerTagModel.test.ts — if you extract a small controller (pure function mapping scan state ->
  detected id formatting / manual validation), test it; otherwise skip. MINIMUM REQUIRED: test that detected-id path
  registers via db.tags with normalizeTagId(tag.id) — mock db + nfcService (jest.mock react-native-nfc-manager via the
  src/services/nfc index; use a fake NfcService driver as in nfc tests).
- Keep existing tests passing.

## VERIFICATION GATES (run, confirm, report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npm test all green (report suite/test counts)

## CONSTRAINTS
TypeScript strict, no `any` in new files, no explanatory comments, no iOS. Do not modify src/db, src/services/nfc,
src/services/blocking, src/services/oem, src/state, src/navigation (except via typed navigation calls inside
screens), src/components except adding OnboardingHeader.tsx. Do not add new npm deps.

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: files created/changed, how permission polling works, how RegisterTag handles unsupported/disabled NFC +
manual fallback, tsc/eslint/jest results.
