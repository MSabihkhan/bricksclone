# SUBTASK 7 OF 9 — STATS AGGREGATION + CHARTS (deepen stats layer, wire real data)

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md, src/services/stats/statsService.ts (existing API — EXTEND, do not break callers),
__tests__/services/statsService.test.ts (mocking pattern — reuse it), src/theme/ThemeContext.tsx,
src/components/* (RingProgress, SectionHeader, Icon, Card, SegmentedControl), src/screens/Insights.tsx,
src/screens/Home.tsx, src/screens/FocusLock.tsx, src/db (types, repositories, index).
S1-S6d done and green (18 suites / 94 tests). Use useTheme() everywhere. TypeScript strict, no `any`, no comments,
no new npm deps, Android only.

GOAL: turn the existing basic stats into a real aggregation layer, then wire REAL data into Insights, Home hero,
and Focus Lock. Screens keep their mockup look; only data sources change.

## 1. Extend src/services/stats/statsService.ts (keep ALL existing exports unchanged in name/signature)
Add pure, exported date helpers (unit-tested):
- export function startOfDay(ts: number): number  (epoch of local midnight for ts)
- export function endOfDay(ts: number): number
- export function dayKey(d: Date): string  (`YYYY-M-D` local, same format used internally)
- export function shiftDays(ts: number, days: number): number
- export function periodRange(period: Period): { start: number; end: number }  (same logic as the internal
  getPeriodRange — refactor so getPeriodStats/getFocusBars/getTopBlocked reuse it; identical behavior for 'day' =
  today-midnight..now, 'week' = rolling 7 days, 'month' = calendar month start..now).

Add async aggregation functions (all query via db.sessions / db.blockedAttempts / db.tags / db.settings, all epoch
seconds):
- export interface TodayStats { focusSec: number; goalSec: number; blocked: number; goalPct: number; streakDays: number }
  export async function getTodayStats(): Promise<TodayStats>
  focusSec = summed session durations today; goalSec = Number(db.settings.get('daily_goal')) || 210*60;
  blocked = COUNT blocked_attempts today; goalPct = min(100, floor(focusSec/goalSec*100)); streakDays recompute as in
  getPeriodStats but extracted into a shared helper computeStreakDays(allSessions) (exported, pure-ish, unit-tested).
- export async function getPeriodComparison(period: Period): Promise<{ focusSec: number; prevFocusSec: number;
  deltaPct: number }>  — current window focus vs the immediately previous window of equal length (previous 1 day,
  7 days, or the prior calendar month). deltaPct = prev>0 ? Math.round((focusSec-prevFocusSec)/prevFocusSec*100) : 100.
- export async function getCompletionByMode(period: Period): Promise<Array<{ mode: string; label: string;
  completed: number; total: number; pct: number }>>
  For each session in period: completed = endedVia !== null && durationSec != null && durationSec > 0 (treat an ended
  session as completed; 'override' counts as completed). mode from tag: tagId != null ? (await db.tags.getTagById(tagId))
  -> .mode : 'recovered'. Group by mode key. Label: deep->'Deep Work', wind->'Wind Down', custom->'Custom',
  recovered->'Recovered'. Only include modes with total>0. pct = round(completed/total*100).
- export async function getBestDay(period: Period): Promise<{ label: string; minutes: number } | null>
  Sum focused minutes per dayKey across the window; return the max day as weekday label (e.g. 'Mon') or 'Today' if
  it's today, else null when no sessions.
- export async function getAvgSessionSec(period: Period): Promise<number>  (mean durationSec over ended sessions in
  window; 0 when none).

## 2. Wire src/screens/Insights.tsx (keep layout; add REAL data + small new elements)
- Keep period SegmentedControl; on period change re-run all queries (useFocusEffect + local state, same as now).
- TOTAL FOCUS card: now from getPeriodStats (focusSec fmtHM, sessions, blocked) + add 2 chips row:
  "N-day streak" (flame icon 14 accent) and "avg Xh Ym" (timer icon) from getAvgSessionSec.
- Bar chart header: existing "FOCUS TREND" eyebrow + right-side delta label from getPeriodComparison: "+12% vs last
  week" (green #3DD68C when >0, accent #E82127 when <0, faint '—' at 0). Period label: day->'day', week->'week',
  month->'month'.
- Below rings: new "COMPLETION" section (SectionHeader) with 3-4 rows from getCompletionByMode — each row: mode label
  14px 700 + "{completed}/{total}" 12px muted right; track bar (height 6 radius 3, colors.track) filled accent to pct
  width. Show only modes with total>0.
- Add "BEST DAY" + "AVG SESSION" stat pair into the existing rings grid or a two-cell card under completion:
  card bg border radius 16, 2 cells (border-left 1px colors.border between): value 22px 800 (best label / avg fmtHM),
  label 11px 800 ls .14em faint. Use getBestDay + getAvgSessionSec.
- Top blocked stays from getTopBlocked.

## 3. Wire src/screens/Home.tsx (keep layout; replace static numbers with real data)
- On focus (useFocusEffect) load getTodayStats() + db.tags.listTags(). Hero ring progress = goalPct (0..1), center
  big number = fmtHM(focusSec) (keep "FOCUS TODAY" eyebrow). Hero sub line = "Xh Ym of Yh Zm goal" (focusSec vs
  goalSec) muted 13px. Streak pill (flame icon) shows "N-day streak" (hide if 0).
- Metrics row: Session count = today sessions (sessionsBetween today), Blocked count = today's blocked (from
  getTodayStats().blocked) + keep the live increment behavior you already have (liveBlocked) — initialize liveBlocked
  from stats.blocked then add live events.
- My Bricks list: load real tags (db.tags.listTags()); brick card meta = "{modeLabel} · {N} apps" where N =
  Object.values(tag.categories).filter(Boolean).length; icon = location icon (reuse locIcon map). Keep "+" add card.
  If tags empty, show the empty add-only card.
- Do NOT change navigation targets from S6d.

## 4. Wire src/screens/FocusLock.tsx (replace the hardcoded planned=50*60)
- On mount / when activeSession.tagId changes: plannedSec = await db.tags.getTagById(tagId) -> duration==='inf' ? null
  : (Number(duration)||50)*60; when tag missing -> 50*60. isInf = plannedSec === null.
- Ring: isInf ? progress 0 (hide/neutral) with elapsed shown in timer and remaining line shows "Xh Ym elapsed" : same
  as now (progress = elapsed/plannedSec, remaining). Keep everything else identical. If duration is '25'/'50'/'90'
  respect it.
- Keep the strict-mode BackHandler + End Session -> EmergencyOverride wiring from S6a/S6d unchanged.

## 5. Tests
- Extend __tests__/services/statsService.test.ts:
  - date helpers: startOfDay/endOfDay roundtrip; dayKey format; shiftDays; periodRange for day/week/month boundaries.
  - getTodayStats: focus sum + goalPct cap + blocked count via query mock.
  - getPeriodComparison: delta math (prev>0, prev=0 -> 100).
  - getCompletionByMode: with mocked db.tags.getTagById returning modes; grouping + labels + pct.
  - getBestDay / getAvgSessionSec basic cases.
  - Keep the existing 3 describe blocks passing (update the module-level jest.mock to also provide db.tags
    { getTagById: jest.fn() } and db.sessions.sessionsBetween already mocked).
- Keep all 94 existing tests green.

## VERIFICATION GATES (run, confirm, report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npm test all green (report suite/test counts)

## CONSTRAINTS
Do not modify src/db, src/services/nfc, src/services/blocking, src/services/oem, src/state, src/navigation,
src/utils, src/components. May edit ONLY: src/services/stats/statsService.ts, src/screens/Insights.tsx,
src/screens/Home.tsx, src/screens/FocusLock.tsx, __tests__/services/statsService.test.ts.
No new npm deps, no `any`, no comments. Keep every exported symbol that already exists.

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: files changed; which Insights/Home/FocusLock numbers are now real vs still static; the periodRange refactor
behavior; tsc/eslint/jest results.
