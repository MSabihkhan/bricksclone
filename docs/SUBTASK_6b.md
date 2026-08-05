# SUBTASK 6b OF 9 — INSIGHTS (ANALYTICS) + SETTINGS SCREENS

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md, src/theme/index.ts. Then read the mockup source of truth
  C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp\..\Bricks Mockup\Bricks Focus.dc.html
  — ANALYTICS section (~lines 165-231) and SETTINGS section (~lines 233-297). Match pixel-for-pixel using theme
  tokens. Also read the already-built src/components (Icon, Button, Card, Switch, SegmentedControl, RingProgress,
  SectionHeader, Screen) and src/state/useFocusStore.ts — reuse, do not duplicate.
S1-S6a done and green. Keep them intact.

GOAL: rebuild the Insights and Settings screen SHELLS (src/screens/Insights.tsx, src/screens/Settings.tsx) into
full mockup-faithful screens. Stats aggregation depth is S7; here wire to a basic stats service.

## 1. src/services/stats/statsService.ts — BASIC aggregation (S7 will harden + extend)
No react-native imports. Uses db (src/db). Exports:
  export type Period = 'day' | 'week' | 'month';
  export interface PeriodStats {
    focusSec: number; sessions: number; blocked: number; streakDays: number;
    goalPct: number; consistencyPct: number;
  }
  export interface BarDatum { label: string; value: number; isMax: boolean; }
  export interface TopApp { name: string; count: number; }
  - getPeriodStats(period: Period): Promise<PeriodStats>
      day: today 00:00-now; week: last 7 days (Mon start ok, or rolling 7d); month: current calendar month.
      focusSec = sum(durationSec or (end? or now - start)); sessions = count; blocked = count of blocked_attempts
      within period; streakDays = consecutive days (ending today or yesterday) with >=1 session — implement simply;
      goalPct = focusSec / dailyGoal (read settings daily_goal, default 210*60) capped 100; consistencyPct =
      days-with-session / days-in-period capped 100.
  - getFocusBars(period: Period): Promise<BarDatum[]>
      day: 12 buckets (6a..9p hourly); week: 7 day labels M..S; month: 4 buckets W1..W4. value = focusSec per bucket.
      isMax = highest value.
  - getTopBlocked(period: Period, limit?: number): Promise<TopApp[]> — group blocked_attempts by package_name within
    period, order desc, top limit (default 5), label from the row label (first seen).
  Use Math.floor(Date.now()/1000) for times. All pure of RN.

## 2. src/theme/ThemeContext.tsx — minimal theme switching
- export const ThemeContext = React.createContext<Theme>(defaultTheme);
- export function ThemeProvider({ children }) — reads db.settings 'appearance' ('dark'|'light', default dark) via
  useEffect, holds mode state, provides themes[mode]. Also export function useTheme(): Theme.
- Modify App.tsx to wrap <RootNavigator/> in <ThemeProvider> (import path ../src/theme/ThemeContext). Do NOT
  otherwise change App.tsx wiring.
- Update shared components to use useTheme() instead of imported defaultTheme: Screen, Card, Button, Switch,
  SegmentedControl, RingProgress, SectionHeader, Icon stays color-driven. Screens Home/FocusLock keep defaultTheme
  for now (dark default) — they will be swept in a later subtask.

## 3. Insights screen — src/screens/Insights.tsx (REPLACE shell)
Layout exactly like mockup ANALYTICS:
- Header: "Insights" (typography.screenTitle) + subtitle (13px 600 muted) like "This week · +12% vs last week"
  (compute a simple label per period; the % delta can be simplified as text without real delta math for now).
- SegmentedControl period Day/Week/Month (segmented control component, accent indicator).
- TOTAL FOCUS card (Card radius 22): eyebrow "TOTAL FOCUS" (11px 800 ls .16em muted); focus value (typography.statLarge
  tabular); row of 3 stats separated by 1px colors.border vertical dividers: sessions (17px 800), blocked (17px 800),
  streak (17px 800 green) each with 11px 600 muted caption ("sessions"/"blocked"/"streak").
- Rings grid (3 cols gap 11): Card radius 18 padding 16x10 center: RingProgress 66 stroke 6 track colors.track
  (Goal met=accent, Consistency=colors.blue, Streak=colors.green) with center value 15px 800; label below 11px 700
  muted.
- Focus minutes card (radius 22): title "Focus minutes" (15px 800); bar chart row height 150: each bar column flex 1:
  value label 9px 700 faint above, bar (width 100% max 32, height % of max scaled to chart area, radius 8x8 4x4,
  accent if isMax else colors.track), day label 11px 700 muted below.
- Most blocked card (radius 22): title "Most blocked" (15px 800); 5 rows: name 13px 700 width 74; track (flex1 height 9
  radius 99 bg colors.track) with fill (accent for #1 else alpha accent 0.35, height 100%, width pct of top count);
  count 13px 800 muted tabular right.
- Load data on period change via statsService; refresh on focus (useFocusEffect from @react-navigation/native).

## 4. Settings screen — src/screens/Settings.tsx (REPLACE shell)
Layout exactly like mockup SETTINGS:
- Header "Settings".
- Profile card (radius 20 padding 18): 54px circle accent bg with initials white 18px 800; name 17px 800; sub 12px
  muted "Focus Pro · Nd streak"; chevron icon faint.
- Section eyebrow "FOCUS" (11px 800 ls .14em colors.faint) then card (radius 20 overflow hidden) with 3 rows
  (border-top colors.border): Strict Mode/shield ("Can't stop early"), Break Reminders/coffee ("Every 50 minutes"),
  Auto-Pilot/zap ("Smart scheduling"). Row: icon box 36 radius 10 bg card2, label 14px 700, sub 12px muted, Switch.
  Persist to db.settings keys strict_mode / break_reminders / auto_pilot ("1"/"0").
- Card (radius 20 padding 20): Block intensity row (label 14px 700 + value "N%" accent 14px 800 tabular) with
  Slider 0-100; divider (1px colors.border); Daily goal row (label + "Xh Ym" accent) with Slider 30-480 step 15.
  Persist intensity -> db.settings 'intensity', goal -> 'daily_goal' (seconds). On goal change, also update Home's
  goal (Home already reads daily_goal on load).
- Section eyebrow "APP" then card: Appearance row (moon icon, "Appearance", segmented Dark/Light using
  SegmentedControl) — persist 'appearance'; Notifications row (bell icon, "Notifications", sub "Session alerts &
  summaries", Switch) persist 'notifications'.
- Nav rows card (radius 20): rows: Schedule/calendar ("Schedule", value "3 active") -> no-op for now; Blocked
  apps/smartphone ("Blocked apps", value "N apps" from db.blockedApps) -> navigate ManageBlockedApps; About
  Bricks/info -> navigate About. Row: icon box 36 radius 10 card2, label 14px 700, value 12px 700 muted, chevron faint.
- Footer centered "Bricks · v2.4.1" (12px 600 faint).
- Navigation via useNavigation typed to SettingsStackParamList.

## 5. Custom Slider — src/components/Slider.tsx
Implement WITHOUT native deps: props { value, min, max, step?, onValueChange, accentColor }. Track: 6px height radius 99
bg colors.track; fill accent width pct; thumb 24px white circle with shadow; PanResponder to drag; snap to step;
min width interaction. No extra deps.

## 6. Tests — keep `npm test` green
- __tests__/services/statsService.test.ts — jest.mock src/db (in-memory fakes): getPeriodStats sums sessions +
  attempts, streak logic (sessions today+yesterday -> 2), goalPct cap; getFocusBars returns expected bucket count per
  period and isMax on highest; getTopBlocked groups/orders/limits.
- __tests__/components/Slider.test.tsx — react-test-renderer: renders track + thumb; onValueChange called when a
  drag is simulated (or at minimum component mounts and renders without error).
- Existing tests keep passing (update App.test.tsx if ThemeProvider wrapping changes the render).

## VERIFICATION GATES (run, confirm, report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npm test all green (report suite/test counts)

## CONSTRAINTS
TypeScript strict, no `any` in new files, no explanatory comments, no iOS. Do not modify src/db, src/services/* (you
MAY create src/services/stats), src/state/*, src/navigation/*, src/components except adding Slider.tsx, and App.tsx
(only the ThemeProvider wrap). No new npm deps.

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: files created/changed, how each section maps to the mockup, and tsc/eslint/jest results.
