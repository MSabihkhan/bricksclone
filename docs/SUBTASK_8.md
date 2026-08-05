# SUBTASK 8 OF 9 — ONBOARDING FLOW WIRING + MIGRATION RUNNER

WORKING DIRECTORY: C:\Users\msabi\OneDrive\Desktop\Bricksclone\BricksApp
READ FIRST: docs/ARCHITECTURE.md, src/db/index.ts (Database singleton — init() currently does NOT apply migrations;
this is a KNOWN LATENT BUG to fix), src/db/migrations.ts (MIGRATIONS + LATEST_VERSION), src/db/Driver.ts,
src/db/repositories/SettingsRepository.ts, src/state/onboarding.ts (currently `export const onboarded = false`),
src/navigation/RootNavigator.tsx (uses the constant), App.tsx, __tests__/db/helpers.ts (SqlJsDriver test driver),
src/screens/Intro.tsx (Skip button), src/screens/OnboardingDone.tsx (finish flow), src/theme/ThemeContext.tsx,
src/components/* (Icon, Screen, Button).
S1-S7 done and green (18 suites / 106 tests). Use useTheme() where UI involved. TypeScript strict, no `any`,
no comments, no new npm deps, Android only.

GOAL:
A) Apply SQLite migrations automatically at startup (fix the latent bug: migrations never ran on device).
B) Replace the hardcoded `onboarded = false` constant with REAL onboarding gating read from SQLite.
C) Make "Skip" on Intro complete onboarding and land in the main app.
D) Verify OnboardingDone completes onboarding correctly.
E) Unit tests for the migration runner + gating.

## 1. New file src/db/migrate.ts
- export async function runMigrations(driver: DbDriver): Promise<number>
  - Determine current version: try `SELECT value FROM settings WHERE key = 'schema_version'` via driver.get();
    Number(value) or 0. If the query throws (settings table missing on brand-new db), treat as 0.
  - For i = currentVersion; i < LATEST_VERSION; i++: await driver.execute(MIGRATIONS[i]) inside
    driver.withTransaction (one transaction around the whole apply loop).
  - Then upsert `INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', ?)` with String(LATEST_VERSION).
  - Return the final LATEST_VERSION.
  - Idempotent: second call is a no-op.
- import from './migrations' (MIGRATIONS, LATEST_VERSION) and './Driver' (DbDriver).

## 2. src/db/index.ts — apply migrations in init()
- In Database.init(): after `await this.driver.open();` call `await runMigrations(this.driver);` BEFORE constructing
  repositories. Import runMigrations from './migrate'. Nothing else changes.

## 3. src/state/onboarding.ts — real gating
- Replace the constant with:
  ```
  import { db } from '../db';
  export async function isOnboarded(): Promise<boolean> {
    await db.init();
    const value = await db.settings.get('onboarded');
    return value === '1';
  }
  export async function completeOnboarding(): Promise<void> {
    await db.init();
    await db.settings.set('onboarded', '1');
  }
  ```

## 4. New file src/components/Splash.tsx — brand splash used during async init
- Full-screen view: bg = colors.bg; centered: 44px accent rounded box (radius 12) containing a 22px white rounded
  square (same glyph as OnboardingHeader logo); "BRICKS" label 15px 800 ls .06em below; colors.muted ActivityIndicator
  (or a small pulsing dot) under it. useTheme().

## 5. App.tsx — init db before UI (ready gate)
- Add state: const [ready, setReady] = useState(false);
- useEffect(() => { db.init().then(() => setReady(true)).catch(() => setReady(true)); }, []);  (never block the app on
  error — even if migration fails, proceed; screens handle query failures)
- if (!ready) return <SafeAreaProvider><Splash /></SafeAreaProvider>;  (plain View, no theme needed — Splash uses
  defaultTheme)
- else render the existing tree unchanged.

## 6. src/navigation/RootNavigator.tsx — real onboarding gating
- Remove `import { onboarded } from '../state/onboarding';`
- Add: const [status, setStatus] = useState<'loading' | 'onboarded' | 'new'>('loading');
  useEffect(() => { isOnboarded().then(v => setStatus(v ? 'onboarded' : 'new')).catch(() => setStatus('new')); }, []);
- if (status === 'loading') return <Splash />;  (import from '../components/Splash')
- Keep ModalStack screen registered ALWAYS (registered but unreachable until gated — it must remain in the navigator
  so navigation.navigate('ModalStack', ...) works from both stacks).
- Initial route: status === 'onboarded' ? MainTabs : OnboardingStack (same conditional rendering as now, driven by
  status instead of the constant).
- RootStackParamList unchanged.

## 7. src/screens/Intro.tsx — real Skip
- onSkip: async () => { await completeOnboarding(); navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }); }
  using a RootStackParamList-typed navigation (useNavigation<NativeStackNavigationProp<RootStackParamList>>() from
  '@react-navigation/native-stack' — the OnboardingStack lives inside RootStack so resetting the root works; this is
  the pattern already used by OnboardingDone).
- Keep the pager + Continue/Get Started as-is (Get Started still walks through the permission screens).

## 8. src/screens/OnboardingDone.tsx — verify/complete flow
- Verify "Start focusing" calls completeOnboarding() (or db.settings.set('onboarded','1')) and then
  navigation.reset to MainTabs with RootStack typed navigation. Adjust if it navigates differently (keep its exact
  visual layout).

## 9. Tests (new + keep green)
- __tests__/db/migrate.test.ts (new): use SqlJsDriver from __tests__/db/helpers.ts (do NOT run MIGRATIONS in setup;
  instantiate SqlJsDriver + open directly):
  1. fresh db -> runMigrations returns LATEST_VERSION; sqlite_master contains tables tags, blocked_apps, sessions,
     blocked_attempts, settings; settings has schema_version = String(LATEST_VERSION).
  2. run again -> still LATEST_VERSION, no duplicate/error (idempotent).
  3. partial db: open fresh, execute only `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
     and insert schema_version='0' -> runMigrations -> LATEST_VERSION + all tables exist.
- __tests__/state/onboarding.test.ts (new): jest.mock('../../src/db') providing db.init / settings.get / settings.set
  mocks; isOnboarded true when get('onboarded')==='1', false otherwise (undefined, '0', ''); completeOnboarding calls
  set('onboarded','1'). 
- Keep all 106 existing tests green.

## VERIFICATION GATES (run, confirm, report exact results)
   - npx tsc --noEmit exits 0
   - npx eslint src __tests__ --quiet exits 0
   - npm test all green (report suite/test counts)

## CONSTRAINTS
Do not modify src/db/repositories, src/db/Driver.ts, src/db/types.ts, src/db/migrations.ts, src/db/native,
src/navigation/types.ts, src/navigation/OnboardingNavigator.tsx, src/navigation/MainTabsNavigator.tsx,
src/navigation/ModalNavigator.tsx. May edit ONLY: src/db/index.ts, src/db/migrate.ts (new), src/state/onboarding.ts,
App.tsx, src/navigation/RootNavigator.tsx, src/screens/Intro.tsx, src/screens/OnboardingDone.tsx,
src/components/Splash.tsx (new), __tests__/db/migrate.test.ts (new), __tests__/state/onboarding.test.ts (new).
No `any` casts in new/edited code (use the existing pattern: optional chaining / ?? instead).

End final summary with exactly:
requires physical device verification — cannot confirm in this environment.

Report: migration runner behavior (transaction, idempotency, partial-db path); how gating now works on first launch
vs returning user; Skip behavior; how OnboardingDone completes; tsc/eslint/jest results.
