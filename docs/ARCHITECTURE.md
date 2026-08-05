# Bricks — Architecture & Build Spec

Android-only React Native clone of "Brick" (physical NFC-tag focus app). This doc is the single
reference for all subtask dispatches. Read `src/theme/index.ts` for design tokens — they are
extracted from `Bricks Mockup/Bricks Focus.dc.html` (dark Manrope palette: bg #0F1115, card #181B20,
card2 #1F232B, border #2A2E37, text #FFF, muted #8A9099, faint #5A6069, green #3DD68C,
blue #4DA3FF, track #23272F, accent #E82127).

## Environment facts

- No JDK / Android SDK / adb on this machine. Native Android code is written but CANNOT be compiled
  or run here. Any subtask touching native capability must end its summary with:
  `requires physical device verification — cannot confirm in this environment.`
- `npm test` (Jest) and `npx tsc --noEmit` run fine — keep them green.
- React Native 0.86.2, New Architecture, TypeScript strict, project root `C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp`, package `com.bricks.app`.

## Mockup screen inventory (source of truth)

Onboarding (3 steps) · Dashboard/Home · Insights/Analytics (Day/Week/Month) · Settings · Focus Lock
overlay (active session) · NFC flow (scan → detected → name → block → done).

Missing from mockup (extrapolate same visual language): permission "why" screens, NFC unsupported/
disabled/error, app-selection multi-select, OEM battery/autostart instructions, Blocked redirect
screen, emergency override flow, tag/brick management, emergency history, session history list.

## Directory layout

```
src/
  theme/index.ts          design tokens (done)
  navigation/             navigators + param list
  screens/                one folder per screen
  components/             shared UI (Button, Card, Switch, SegmentedControl, Ring, BarChart…)
  state/                  Zustand stores + session state machine
  db/                     SQLite driver interface + repositories + migrations
  services/
    nfc/                  NFC tag detection/validation (platform-agnostic logic + native bridge)
    blocking/             blocking engine client
    oem/                  OEM battery/autostart detection + deep links
  native/                 typed JS bridges to Android modules
  utils/                  pure helpers (time, streaks, tag-id formatting)
docs/                     this + manual matrix
```

## Navigation tree

```
RootStack
 ├─ OnboardingStack (if not onboarded)
 │    ├─ Intro (3 steps, mockup)
 │    ├─ WhyPermissions (Usage Access)
 │    ├─ GrantUsageAccess
 │    ├─ WhyAccessibility
 │    ├─ GrantAccessibility
 │    ├─ BatteryOptimization (generic + OEM-specific instructions / deep links)
 │    ├─ RegisterTag (scan NFC, mockup NFC flow style)
 │    ├─ SelectApps (multi-select installed apps)
 │    └─ Done
 └─ MainTabs (bottom tabs: Home / Insights / Settings, mockup 3px top indicator)
      ├─ Home (dashboard, mockup)
      │    ├─ FocusLock (full-screen overlay state within Home, mockup lock screen)
      │    └─ AddBrick (NFC scan flow: scan → detected → name → block → done)
      ├─ Insights (mockup: period seg, total focus, rings, bar chart, most blocked)
      └─ Settings (mockup)
           ├─ ManageTags
           ├─ ManageBlockedApps (multi-select)
           ├─ EmergencyHistory
           └─ About
ModalStack
 ├─ BlockedScreen (full-screen redirect when blocked app launched)
 └─ EmergencyOverride (frictionful multi-step unlock)
```

## Data model (SQLite)

- `tags(id TEXT PK, name TEXT, location TEXT, mode TEXT, categories TEXT JSON, duration TEXT,
  strict INTEGER, created_at INTEGER)`
- `blocked_apps(package_name TEXT PK, label TEXT, added_at INTEGER)`
- `sessions(id INTEGER PK AUTOINCREMENT, tag_id TEXT, start_time INTEGER, end_time INTEGER,
  duration_sec INTEGER, ended_via TEXT CHECK in ('nfc','override','force_kill','service_kill'),
  strict INTEGER, apps TEXT JSON)`
- `blocked_attempts(id INTEGER PK AUTOINCREMENT, session_id INTEGER, package_name TEXT, label TEXT,
  created_at INTEGER)`
- `settings(key TEXT PK, value TEXT)` — onboarding completed, notifications, intensity, daily_goal

## Delegation protocol (agy)

Each subtask is ONE reviewable unit. agy is invoked non-interactively (`agy -p "…"`). Give it:
paths, the exact files to create, the mockup tokens, what to test (automatable vs device-only), and
the phrase `npm test` / `npx tsc --noEmit` as its verification gates. Do not let one dispatch chain
multiple unrelated subtasks. After each dispatch: review diff, run tests, then next subtask.
