# SUBTASK 6d OF 9 — NFC BRICK FLOW + MANAGEMENT SCREENS

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md, src/theme/index.ts, src/theme/ThemeContext.tsx, src/components/*
(Screen, Button, Card, Switch, SectionHeader, Icon, RingProgress, SegmentedControl, Slider),
src/state/useFocusStore.ts, src/services/nfc (tagUtils, NfcService, nfcService), src/services/blocking/blockingEngine.ts,
src/db (types, repositories, index), src/utils/onboarding.ts, src/utils/appSelection.ts,
src/screens/RegisterTag.tsx (reuse its scan/detected/name UI + OnboardingHeader pattern),
src/screens/FocusLock.tsx (lock styling), src/screens/SelectApps.tsx (app picker list pattern),
src/screens/Settings.tsx (nav row wiring), src/screens/Home.tsx (My Bricks card wiring).
Mockup ADD BRICK overlay (the ONLY reference for the add-brick flow): C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp\..\Bricks Mockup\Bricks Focus.dc.html
  - NAME step ~L410-433, BLOCK step ~L436-475, DONE step ~L478-497, scan/detected overlay ~L365-410 (radio rings).
  - Exact data model in script: state.newBrick L524, locList L717-725, modeList L726-734, bcatList L735-740,
    durMap/durList L741-746, strict switch L747, summaryChips L750-754, primaryBtn/ghostBtn L755-767,
    pickMode presets L555, saveBrick L559, brickStartNow L560.
S1-S6c done and green (17 suites / 85 tests). Keep intact. All screens must use useTheme() (theme context) — never the
static defaultTheme import. TypeScript strict, no `any`, no explanatory comments, no iOS, no new npm deps.

GOAL: implement the remaining real screens. Screens with mockup reference = pixel-faithful. Screens without mockup
reference (ManageTags, ManageBlockedApps, EmergencyHistory, About, Blocked, EmergencyOverride) = extrapolate the exact
mockup visual language (cards, icon boxes, eyebrow labels, 56px CTA, accent #E82127, colors.card/border/text/muted/faint).

## 1. Pure data + helpers (src/utils/onboarding.ts — EXTEND, unit-tested)
Add (keep existing exports):
- export const BRICK_MODES = [{ key:'deep', label:'Deep Work', desc:'Blocks social, games, video & news' },
  { key:'wind', label:'Wind Down', desc:'Softer — social, video, shopping & chat' },
  { key:'custom', label:'Custom', desc:'Choose exactly what to block below' }] as const;
- export const MODE_PRESETS: Record<string, Record<string, boolean>> = { deep: { social:true, games:true, video:true,
  news:true, shopping:false, messaging:false }, wind: { social:true, games:false, video:true, news:false,
  shopping:true, messaging:true } };
- export const DURATIONS = [{ key:'25', label:'25 min' }, { key:'50', label:'50 min' }, { key:'90', label:'90 min' },
  { key:'inf', label:'Until I tap out' }] as const;
- export function modeLabel(mode: string): string  -> 'Deep Work' | 'Wind Down' | 'Custom'
- export function durationLabel(d: string): string -> '25 min' | '50 min' | '90 min' | 'Until I tap out' (fallback
  '50 min')
- export function buildBrickSummary(mode: string, categories: Record<string, boolean>, duration: string):
  Array<{ label: string; icon: 'target' | 'shield' | 'timer' }>  -> 3 chips: [modeLabel, N-apps shield chip,
  durationLabel timer chip]. N = Object.values(categories).filter(Boolean).length.
- export const CATEGORY_META: Array<{ key: string; label: string; icon: IconName }> = [{social,'Social','social'},
  {games,'Games','gamepad'}, {video,'Video','film'}, {news,'News','newspaper'}, {shopping,'Shopping','shopping'},
  {messaging,'Messaging','message'}] (order fixed).

## 2. src/screens/AddBrick.tsx (HomeStack) — FULL mockup ADD BRICK overlay flow as a screen.
Internal step state: 'scan' | 'detected' | 'name' | 'block' | 'done'. Local newBrick state:
{ name, location, mode, categories, duration, strict }. NO navigation until done.
- HEADER (all steps except scan/detected): back circle 38 (radius 50, colors.card, border) + eyebrow "REGISTER BRICK"
  (11px 800 ls .14em faint) + "Step N of 2 · Name/What to block" (15px 800) + close circle (x icon) -> navigation.goBack().
- 'scan': reuse RegisterTag scanning UI exactly (double pulse ring, 98px accent radio box 44 white, glow;
  "Hold your phone\nnear the Brick" 26px 800 ls -0.03em; "Scanning for your tag…" 15px 500 muted). beginListening on
  mount, stopListening on unmount/goBack. On tag -> 'detected' (store normalized id + raw).
- 'detected': reuse RegisterTag detected UI (brick box 134 radius 36 accent, glossy top bar, radio 46 white;
  eyebrow "NEW BRICK DETECTED" 11px 800 ls .16em green; title "Unregistered Brick" 26px 800; "ID · {formatTagId}"
  14px 600 muted tabular). primaryBtn "Register this Brick" -> 'name'; ghost "Not now" -> goBack. NFC unsupported /
  disabled handled like RegisterTag (message + "Open NFC settings" via nfcService.openSettings()).
- 'name': header eyebrow "REGISTER BRICK" / "Step 1 of 2 · Name". Body: icon box 76 radius 22 tinted (accent 14%) with
  location icon 34 accent (default 'radio'); title "Name this Brick" 27px 800; sub "Where does it live? You'll tap it
  here to start focusing." 14px 500 muted (line ~L420). Name TextInput 58 height radius 16 card bg border, 20px 800,
  placeholder "e.g. Desk". "QUICK PICK" 11px 800 ls .14em faint + 3-col grid LOCATIONS (13px padding, radius 14,
  on=accent bg white icon/label else card bg muted, gap 7). Bottom: primaryBtn "Continue" (disabled-style card2 + faint
  text when !validateBrickName(nb.name)) -> 'block'.
- 'block': header "Step 2 of 2 · What to block". Body: title "What should {name} block?" 23px 800 ls -0.03em (accent
  span). MODES list (modeList style L729: radius 16, on = accent 12% tint bg + accent border + 22px radio dot with
  check 13 white, title 15px 800 / desc 12px 500 muted). pickMode sets categories = MODE_PRESETS[mode] unless
  'custom' (keeps current). "CATEGORIES" label + 3-col CATEGORY_META grid (on=accent bg white icon else card muted,
  radius 15, padding 14px 6px). "SESSION LENGTH" label + DURATIONS pills (flex 1 1 40%, radius 13, 13px 700, on=accent
  bg white else card muted, border). Strict Mode row (card bg border radius 16 padding 15px 16px: 36px icon box card2
  with shield 18, title "Strict Mode" 14px 700 + sub "Can't unlock until the session ends" 12px muted, Switch on right
  using colors.accent track when on). Bottom: primaryBtn "Create Brick" (L755) -> save.
- save: id = normalized scanned tag id (normalizeTagId) — required; name = nb.name || location label || 'New Brick';
  location; mode; categories; duration; strict; createdAt=now. db.tags.registerTag(tag). Then 'done'.
- 'done': mockup L478-497: green circle 104 radius 50 (check 46 white, popIn, glow shadow 0 18px 46px -12px
  rgba(61,214,140,.5)); title "{name} is ready" 28px 800 ls -0.03em; sub "Tap this Brick anytime to start a {modeLabel}
  session." 15px 500 muted lineHeight 1.5; summaryChips from buildBrickSummary (card bg, border, radius 99, padding
  9px 14px, 13px 700, icon 14 accent, gap 7). Buttons: primaryBtn "Start focusing now" -> blockingEngine.startFocusSession
  ({tagId, apps: category package lists? use BLOCKED_PLACEHOLDER }) then navigation.replace('Home') / per focus store —
  SEE note below; ghostBtn "Back to home" -> navigation.goBack().

  NOTE on "Start focusing now": reuse the EXACT flow already used by Home's start (read src/state/useFocusStore.ts and
  Home.tsx). If the focus store exposes startSession(tagId, apps, strict, duration), call it and navigate('FocusLock')
  (HomeStack). Else call blockingEngine.startFocusSession({tagId, apps:Object.keys(blockedCategories)}) and navigate
  ('FocusLock'). apps = the packages that this tag's categories map to: for S6d use the 3 sample packages per active
  category: { social:['com.instagram.android','com.facebook.katana','com.tiktok'], games:['com.supercell.clashofclans',
  'com.roblox.client'], video:['com.google.android.youtube','com.netflix.mediaclient'], news:['com.google.android.apps.magazines',
  'com.flipboard.app'], shopping:['com.amazon.mShop.android.shopping','com.wish.wish'], messaging:['com.whatsapp',
  'com.facebook.orca'] } — a shared constant in src/utils/onboarding.ts: export const CATEGORY_PACKAGES:
  Record<string, string[]>. This is a placeholder mapping (real per-app selection comes from blocked_apps in S8/S9).
- 'done' BackHandler / goBack must not re-open the flow.

## 3. src/screens/ManageTags.tsx (SettingsStack) — "My Bricks" manager.
- Header (stack screen, padded top ~60): title "My Bricks" 28px 800 ls -0.03em; plus circle (38, accent bg, plus icon
  22 white) -> navigation.navigate('AddBrick') (HomeStack via parent? NO — AddBrick lives in HomeStack; instead plus
  opens a Lightbox-style inline name-only quick add using RegisterTag-style manual path is out of scope. Instead:
  plus button -> navigation.navigate('HomeTab', { screen: 'AddBrick' }) via composite nav (SettingsStackParamList is
  nested; use NavigationProp of SettingsStack and navigate('HomeTab', {screen:'AddBrick'}) is NOT typed — use
  navigation.navigate('AddBrick') if you add AddBrick to SettingsStackParamList; simplest: plus opens RegisterTag-like
  manual flow within this screen: reuse manual+naming from RegisterTag inline (a modal state) and registerTag). DECISION:
  plus opens the SAME 3-col quick-pick naming modal used in RegisterTag 'naming' (name + LOCATIONS grid + Register
  button) — but registration needs a tag id; use manual id input path (isTagIdInputValid) as in RegisterTag 'manual',
  then save. Implement as an inline modal sheet (RN Modal transparent) with RegisterTag 'manual' + 'naming' UI.
- List: db.tags.listTags(). Row (Card): icon box 44 radius 14 (card2) with location icon (locIcon map desk->monitor,
  bedroom->bed, office->building, kitchen->coffee, studio->music, car->car, fallback radio) 22 accent; name 16px 800;
  meta "{modeLabel} · {N} apps" 12px muted; chevron right. Tap row -> inline edit modal (rename TextInput 58 + LOCATIONS
  grid + Save ghost/primary + Delete destructive button red). Save -> db.tags.updateTag(id,{name,location}).
  Delete -> confirm Alert then db.tags.deleteTag(id) + refresh.
- Empty state: centered radio icon box 88 accent tint, "No Bricks yet", "Tap the + to register your first Brick." 14px
  muted.
- refresh via useFocusEffect (re-query on focus).

## 4. src/screens/ManageBlockedApps.tsx (SettingsStack) — "Blocked apps" manager.
- Header "Blocked apps" 28px 800 + count pill "{N} apps" (card bg border radius 99 12px 700). Plus button -> enter
  'picker' mode (same screen) reusing SelectApps pattern: search TextInput, installed apps via
  BlockingModule.getInstalledApps(), SelectionState via toggleSelection, list rows (icon box 36 radius 10 card2 first
  letter 14px 700 + label 14px 700 + check circle 22 on=accent white check else border). "Done (N selected)" ->
  db.blockedApps.replaceAll(selected) + exit picker.
- View mode rows: icon box + label 14px 700 + package 12px faint + x remove (24, muted) -> confirm Alert ->
  db.blockedApps.removeBlockedApp(packageName).
- Empty state: smartphone icon box, "No blocked apps", "Add apps to lock during focus sessions."

## 5. src/screens/EmergencyHistory.tsx (SettingsStack) — "History".
- Header "History" 28px 800. Group sessions by day label: "Today", "Yesterday", then "Mon D", "Tue D", etc.
  (Intl fallback: compute manually). db.sessions.listSessions(); per session query blockedAttempts.attemptsForSession(id).
- Session row (Card): left icon box 44 radius 14 (flame if duration>0 else clock) accent icon; title "{duration}"
  (fmtHM: Xh Ym) 16px 800 + sub "{tagName|'Manual'} · {started HH:MM}" 12px muted; right badge: endedVia 'nfc' ->
  green dot + "Completed", 'override' -> accent dot + "Overridden", active (no end_time) -> blue dot + "Active"; and
  blocked count pill "{N} blocked" when N>0.
- Total stats header row: 3 stat cells (Session count, Total time (sum durationSec), Attempts blocked total via
  blockedAttempts.countTotal()) — card bg, numbers 22px 800, labels 11px 800 ls .14em faint.
- Empty state: clock icon box, "No sessions yet".

## 6. src/screens/About.tsx (SettingsStack).
- App icon 84 radius 24 (accent bg, white rounded-square glyph as in OnboardingHeader logo enlarged) + name "Bricks"
  24px 800 + tagline "NFC focus companion" 14px muted + version pill "v1.0.0" (card border radius 99).
- Rows (Card): Privacy & Data (info icon) — "All data stays on your device" subtitle; Licenses; Contact / Support;
  Rate Bricks. Rows: icon 18 in 34 box card2 + label 15px 700 + chevron. Non-functional (no-op) except Privacy & Data
  shows an Alert. Footer: "Made with focus · © 2026" 12px faint centered.

## 7. src/screens/Blocked.tsx (ModalStack, Modal transparent) — in-app blocked fallback.
- Full-screen dark scrim (bg 96%): center card: 64px accent tinted box (lock 28 accent); eyebrow "BLOCKED" 11px 800
  ls .16em accent; title "Hold on" 26px 800; text "This app is locked until your focus session ends." 15px 500 muted
  lineHeight 1.5. Countdown ring (RingProgress 96, accent, track) with "Returning in 00:0{N}" inside (13px 700 muted
  tabular). Auto-dismiss after 10s (setTimeout, clear on unmount) -> navigation.goBack(). If session strict === 1: no
  override; else ghost button "I really need it" -> navigation.navigate('EmergencyOverride') (ModalStack).

## 8. src/screens/EmergencyOverride.tsx (ModalStack, Modal transparent) — 3-step escalation (no mockup, extrapolate
FocusLock language).
- Full-screen scrim: center card (card bg, border, radius 24, padding 26): step 1 "Are you sure?" 24px 800 + text
  "Ending early will break your streak and let distractions back in." 14px muted; countdown "Continue in 0N" (18px 700
  tabular, accent) with 8s wait (pure constant WAIT_SECONDS=8). After wait: step 2 "Still sure?" + "Tap and hold the
  button to confirm." Hold button (56 primaryBtn, label "Hold to end session") 3000ms onPressIn/onPressOut (Animated
  progress fill accent). On hold complete: step 3 "Session over" green check + "You've earned this break." + button
  "Return home". Steps 1->2 auto-advance after wait; back button (x) dismisses (goBack) at any point.
- On completion step 3 "Return home": endFocusSession('override') via blockingEngine + useFocusStore.endSession if it
  exists, then navigation.goBack() (dismiss modal) — do NOT navigate to Home (modal sits above FocusLock; goBack reveals
  Home? goBack from ModalStack returns to the screen that opened it — FocusLock. After override the session is ended;
  FocusLock's store will show idle. Acceptable.) If useFocusStore exposes an explicit endSession('override'), call it.

## 9. Wiring (edit ONLY these two existing screens):
- src/screens/Home.tsx: "My Bricks" section — the ADD card "+" (plus icon 22 accent in card) -> navigate('AddBrick');
  tapping an existing brick card -> navigate('AddBrick') (starts a fresh scan, matching mockup brickCards onClick =
  startScan). Keep everything else intact.
- src/screens/Settings.tsx: existing nav rows wire to real screens: "My Bricks" -> navigate('ManageTags');
  "Blocked apps" -> navigate('ManageBlockedApps'); "History" -> navigate('EmergencyHistory'); "About Bricks" ->
  navigate('About'). Keep the schedule/notification rows as-is (Schedule row may remain no-op with its value). Use typed
  navigation (NativeStackNavigationProp<SettingsStackParamList>).

## 10. Tests (extend existing, all green under `npm test`)
- __tests__/utils/onboarding.test.ts: add cases for BRICK_MODES shape, MODE_PRESETS, DURATIONS, modeLabel,
  durationLabel fallback, buildBrickSummary chip count/order, CATEGORY_PACKAGES covers every CATEGORY_META key.
- __tests__/screens/emergencyOverrideModel.test.ts IF you extract pure model logic (recommended: put WAIT_SECONDS,
  HOLD_MS, steps progression in src/screens/emergencyOverrideModel.ts as pure functions; test them). Otherwise a light
  component smoke test (render Blocked + EmergencyOverride with mocked navigation + RingProgress via the existing
  react-native-svg mock) that asserts key text renders. Keep it small; do not over-test.
- Keep all 85 existing tests passing.

## VERIFICATION GATES (run, confirm, report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npm test all green (report suite/test counts)

## CONSTRAINTS
Do not modify src/db, src/services/nfc, src/services/blocking, src/services/oem, src/state, src/navigation (screen
bodies may call typed navigation). Do not add new npm deps. No `any`. No comments. Home.tsx + Settings.tsx may be edited
per section 9 only. utils/onboarding.ts may be extended per section 1.

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: files created/changed; how AddBrick persists a brick; how ManageTags quick-add registers a tag without NFC;
how EmergencyOverride steps escalate and what happens after completion; how Settings/Home wiring was done;
tsc/eslint/jest results.
