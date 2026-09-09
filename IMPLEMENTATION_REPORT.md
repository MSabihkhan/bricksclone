# Bricks Android Remediation Report

**Completed:** 2026-09-10  
**Baseline checkpoint:** `b5e1b44` (`chore: checkpoint current BricksApp implementation`)  
**Scope:** All code-addressable findings from `TECHNICAL_AUDIT.md`, excluding iOS support.

## Implemented

- Hardened focus-session start/stop reconciliation between SQLite and Android native state.
- Prevented concurrent sessions in the state machine, UI store, and SQLite with a unique partial index.
- Added persisted planned end times and automatic timer completion in JavaScript, Android service, and recovery.
- Added explicit enforcement health (`active`, `degraded`, `inactive`) with live permission/service checks and a Focus Lock warning.
- Corrected completion and streak semantics so overrides and interrupted/failed sessions are not successful completions.
- Deduplicated queued blocked attempts in SQLite and bounded the Android pending queue to 500 entries.
- Reconciled mismatched database/native session IDs during startup recovery.
- Removed non-functional settings and category controls; clarified that blocked apps are global.
- Made the global Strict Mode setting the default for newly registered Bricks.
- Removed onboarding bypass, dead screens, and disconnected navigation routes.
- Re-checks NFC after returning from system settings.
- Connected the licenses action and removed dead About actions.
- Standardized product name/version to Bricks 1.0.0.
- Narrowed Accessibility Service data access and removed unsupported locked-boot claims.
- Added accessibility semantics to shared controls, tabs, progress, and primary icon-only actions.
- Replaced debug release signing with optional secret-backed release signing and enabled release shrinking.
- Added an example signing configuration and Android CI for TypeScript, Jest, lint, and APK compilation.

## Verification

- TypeScript: pass (`npx tsc --noEmit`)
- Jest: pass (23 suites, 147 tests)
- Android debug build: pass (`:app:assembleDebug`)
- APK signature verification: pass (APK Signature Scheme v2)
- APK SHA-256: `DA4EDB73A39EF1874F8260EDF7CD08BF523DE5F2BDDAE661A2DF083C3E42D3AE`

## APK

`android/app/build/outputs/apk/debug/app-debug.apk`

This is an installable debug-signed APK for testing. A Play-distribution release APK/AAB requires the owner's private upload keystore values in `android/keystore.properties`; no production secret was generated or committed.

## External validation still required

No Android device is connected to this workstation, so the physical-device matrix cannot be truthfully marked complete here. NFC, reboot/Doze survival, OEM background restrictions, permission revocation, TalkBack, and blocked launches from notifications/deep links still require device testing on stock Android, Samsung, and an aggressive-OEM device. These are validation activities rather than missing application code.
