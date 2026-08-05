# SUBTASK 6a OF 9 — UI FOUNDATION COMPONENTS + HOME (DASHBOARD) + FOCUS LOCK

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md and src/theme/index.ts (tokens). Then read the mockup source of truth:
  C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp\..\Bricks Mockup\Bricks Focus.dc.html
  (parent folder "Bricks Mockup"). Read the DASHBOARD + FOCUS LOCK sections (lines ~49-163 and ~338-363) and the
  icon() function (~569-610) for exact SVG path data. Match the mockup pixel-for-pixel using theme tokens —
  do NOT invent new colors/radii.
S1-S5 done (navigation shells, db, nfc, blocking engine, oem). Keep them intact.

GOAL: shared UI foundation + the Home tab and Focus Lock overlay, faithful to the mockup. Live data wiring
is light here (stats aggregation is S7).

## 0. Install deps
npm i react-native-svg zustand. (react-native-svg is needed for rings + icons; zustand for the session store.)

## 1. src/components/Icon.tsx
Port the mockup's icon set EXACTLY: read the `icon(name,size,color)` function in the mockup (returns inline
SVG from path data for names: grid, barChart, settings, social, gamepad, film, newspaper, shopping, message,
ban, target, check, clock, shield, flame, zap, lock, bell, coffee, moon, chevron, calendar, smartphone, info,
play, stop, radio, plus, x, back, monitor, bed, building, music, car, timer).
- Build a React Native component `<Icon name size color />` using react-native-svg (Svg, Path, Circle, Rect,
  Line, Polyline, Polygon) reproducing each icon's exact geometry (viewBox 0 0 24 24, strokeWidth 2,
  strokeLinecap/join round, fill none unless the mockup icon passes fill).
- Export a typed IconName union. Keep it dependency-free otherwise. This is the ONLY icon source.

## 2. Shared components in src/components/
- Button.tsx — props: { label, onPress, variant: 'primary'|'ghost'|'soft', disabled?, icon?: IconName, iconColor? }.
  primary: bg accent, radius 16, height 54, centered content (icon+label), font typography.button (Manrope 800 15px),
  label color #fff, shadow 0 10px 30px -8px accent 55%. ghost: transparent, border colors.border, text colors.text.
  soft: bg colors.card2. Pressed scale 0.97. Disabled: bg card2, text faint, no shadow.
- Card.tsx — bg colors.card, border colors.border, radius prop (default 22), padding prop (default 20), optional elevation.
- Switch.tsx — track 46x28 pill (on: accent; off: colors.track), knob 20 white with small shadow, animated 250ms.
  Props { value, onValueChange, disabled? }.
- SegmentedControl.tsx — props { options: {label,value}[], value, onChange, width? }. Container bg card radius 15 border;
  sliding accent indicator (animated, radius 11); active label #fff bold 13, inactive muted.
- RingProgress.tsx — svg circle ring. Props { size, stroke, progress (0-1), color, trackColor?, children? }.
  Rotate -90deg, strokeLinecap round, animated via setNativeProps/Animated on dashoffset 700ms ease.
- SectionHeader.tsx — props { title, right? } matches mockup "My Bricks" header (16px 800 -0.02em + muted 12px right).
- Screen.tsx — SafeAreaView wrapper: bg colors.bg, horizontal padding colors.spacing.screenX (20), top 8 bottom 28.
- MetricCard / BlockingQuickCard / BrickCard / ActivityRow — small components matching mockup Home internals
  (see Home spec below); these can also be defined inside Home if simpler.

## 3. Zustand store — src/state/useFocusStore.ts
Install zustand. Store:
  interface FocusState {
    machine: 'idle' | 'active';
    activeSession: Session | null;
    todayFocusSec: number; blockedToday: number; streakDays: number;
    liveBlocked: number;              // distractions blocked this session
    timerTick: number;                // bump every second while active (drives re-render)
    hydrate(): Promise<void>;         // blockingEngine.recoverActiveSession() then loadTodayStats()
    startSession(tagId: string): Promise<void>;  // blockingEngine.startFocusSession({tagId, apps: blockedApps}) ; set machine active; start interval
    endSession(via: 'nfc'|'override'): Promise<void>;
  }
- startSession reads current blocked apps from db.blockedApps.listBlockedApps() for `apps`.
- Internal interval (setInterval 1000) while active updates timerTick and todayFocusSec.
- loadTodayStats(): query db.sessions.sessionsBetween(startOfDay, endOfDay), sum durationSec (treat null end as now),
  count sessions for streak via a simple helper here (proper streak util comes in S7 — keep a local simple impl).
- Export `useFocusStore` hook. Use `db` from src/db. This store is the single state holder the Home screen uses.

## 4. Home screen — src/screens/Home.tsx (REPLACE the shell)
Implement the mockup DASHBOARD section exactly (dark theme). Sections:
- Header: left column date line (13px semibold colors.muted, format like "Wednesday, Jul 30") + greeting
  (25px 800 ls -0.03em colors.text, e.g. "Good afternoon"); right: 46px circle (bg colors.card2, border colors.border,
  centered initials). Pull first name from a settings key (default "there"/"Alex" style fallback).
- Hero card (Card radius 24): row: "FOCUS TODAY" eyebrow (colors.muted 11px 800 ls .16em) + pill (bg card2, radius 99,
  padding 5x11) with a live dot (7px green #3DD68C, blink animation) and text "N apps blocked" (N = active apps count).
  Body row: RingProgress size 98 stroke 9 track colors.track color accent progress = todayFocusSec / dailyGoal
  (goal from settings daily_goal, default 210*60 sec) with center "X%"/"OF GOAL" (19px 800 / 9px 700 muted ls .08em);
  right: today's focus "h m" (typography.display, tabular-nums) over "of Xh daily goal" (13px muted semibold).
  Button primary "Start Focus Session" with play icon -> calls store.startSession using the first registered tag
  (or opens AddBrick if no tag registered).
- Metrics: 3 cards grid (gap 11): Focused (clock icon, colors.blue, todayFocusSec), Blocked (shield, accent, blockedToday),
  Streak (flame, colors.green, "Nd"). Value 20px 800, label 11px 600 muted.
- My Bricks: SectionHeader "My Bricks" right "Tap a Brick to focus". Horizontal ScrollView (padding 0 -20 compensates,
  mockup margin -20 trick): BrickCard list from db.tags.listTags() (150px wide card, radius 18, padding 16, minHeight 118:
  top row icon box 40px radius 11 bg card2 with location icon accent + green dot; bottom: name 16px 800, meta 11px
  "MODE · N apps" muted). Tapping -> store.startSession(tag.id) (if tag exists). Dashed "Add a Brick" card (+ plus icon
  accent in 40px box, "Add a Brick" 16px 800, "Tap to scan a new tag" 11px) -> navigate AddBrick.
- Blocking: SectionHeader "Blocking" right "Tap to toggle". 3-col grid of 6 category cards (Social/gamepad, Games/gamepad,
  Video/film, News/newspaper, Shopping/shopping, Messages/message) reading toggle state from a local settings-derived
  map (persist toggles in db.settings key "block_categories" JSON). Card: minHeight 104 radius 18, on = bg accent 12%
  border accent + icon box accent with white icon + label text 13px 700 + status "BLOCKED" accent 10px 800 ls .1em;
  off = bg card border colors.border, icon muted, label muted, status "Allowed" faint. Tap toggles.
- Live Activity: SectionHeader "Live Activity" right pill "• Live" (green dot blink + "Live" 12px 700 green). Card
  radius 20 overflow hidden: rows (border-top colors.border 1px): 3px color bar (accent for blocked, green for allowed,
  text for session), 34px icon box radius 9 bg card2 (ban red / target text / check green), app 14px 700, act 12px muted,
  time 11px faint. Populate from a local activity list built from recent db.blockedAttempts + recent sessions
  (max 5 rows; simple).
- If machine === 'active', show the Focus Lock overlay INSTEAD of the dashboard content (see 5), still inside Home.

## 5. Focus Lock overlay — src/screens/FocusLock.tsx (REPLACE the shell)
Full-screen (position absolute inset 0) radial-gradient-ish (use two-layer View: bg colors.bg + top accent glow at 16%
alpha using a large blurred circle or simple overlay — keep close to mockup feel). Content per mockup lock section:
- Eyebrow top center: lock icon (15, accent) + "FOCUS LOCKED" (12px 800 ls .2em accent).
- Center: 230px RingProgress (stroke 6, track colors.track, color accent, progress = elapsed / planned, planned from
  tag duration or 50min default; if "inf" duration, progress stays 0 and remaining shows elapsed). Inner: "DEEP WORK"
  eyebrow muted 11px 800 ls .14em, timer (typography.timer, tabular-nums, live ticking from store.timerTick), and
  remaining "Xh Ym remaining" 13px semibold muted (or "elapsed" for infinite). Add an outer pulsing ring: a circle
  View with border accent 1px animating scale 1->1.12 opacity fade (Animated.loop), 2600ms.
- Pill: "• N distractions blocked" (bg colors.card border colors.border radius 99 padding 11x18, accent dot blink 8px,
  14px 700) where N = liveBlocked.
- Bottom: Button ghost full width "End Session" (stop icon) -> store.endSession('nfc')? No — ending via UI is the
  frictionful path: navigate to EmergencyOverride (modal) if strict; if not strict, end directly. For this subtask:
  if the active session strict flag is on, navigate to EmergencyOverride; else endSession('override'). Under the
  button: faint 12px note: strict ? "Strict Mode is on. Ending early will break your streak." : "You can end this
  session at any time." Lock the back button (BackHandler blocks default) — strict style.

## 6. Tab bar — src/navigation/MainTabsNavigator.tsx
Restyle to match mockup: tab bar container height 80, bg colors.card, border-top colors.border, paddingBottom 16;
top indicator: 3px accent bar sliding between 3 tabs (absolute top 0, width 1/3, translateX animated). Tabs:
Home (grid), Insights (barChart), Settings (settings) using Icon; active icon colors.text, inactive colors.faint;
label 11px 700 marginTop 5. Hide default labels and headers. Keep screen names as-is.

## 7. Tests — keep `npm test` green
- __tests__/components/Icon.test.tsx: react-test-renderer smoke — renders <Icon name="lock" size={24} color="#fff" />
  without crashing (jest.mock('react-native-svg', ...) to a stub that renders a host View, or configure
  moduleNameMapper in jest.config.js — DO IT in jest.config.js via moduleNameMapper so all svg icons work in tests;
  do not leave broken tests).
- __tests__/state/useFocusStore.test.ts: with jest.mock of src/db and src/services/blocking/blockingEngine:
  hydrate sets machine from recoverActiveSession result; startSession calls startFocusSession with apps from
  blockedApps and flips machine to active; endSession('nfc') calls endFocusSession and flips to idle.
  Use jest.useFakeTimers() for the interval.
- Update the App.test.tsx smoke test so it still passes (it currently mocks navigation — keep it working).

## VERIFICATION GATES (run, confirm, report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npm test all green (report suite/test counts)
   The visual result cannot be seen headlessly — describe precisely how each section maps to the mockup.

## CONSTRAINTS
TypeScript strict, no `any` in new files, no explanatory comments, no iOS. Do not modify src/db, src/services/*,
src/state/sessionMachine.ts, App.tsx (keep RootNavigator wiring as-is). You MAY modify src/navigation/MainTabsNavigator.tsx.
Do not add other new npm deps.

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: files created/changed, jest moduleNameMapper/mock decisions, and how each Home/FocusLock section maps to the mockup HTML.
