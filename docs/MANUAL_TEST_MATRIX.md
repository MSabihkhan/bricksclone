# Bricks — Manual Device Test Matrix

Run on a physical Android device. Every row is device-only; nothing here is automatable in a
headless CI. Confirm each before declaring the MVP done. At least one device should be MIUI
(Xiaomi/Redmi/Poco), ColorOS (Oppo/Realme) or FuntouchOS (Vivo).

| # | Scenario | Expected result | Pass |
|---|----------|-----------------|------|
| 1 | Tap real NFC tag to start session | Session activates, blocked apps become inaccessible | ☐ |
| 2 | Tap same tag again to end | Session ends immediately, apps accessible again | ☐ |
| 3 | Try opening a blocked app mid-session | Redirected to Blocked screen, attempt logged in stats | ☐ |
| 4 | Force-kill the app mid-session (recent apps) | Blocking persists (service survives or resumes on next foreground check) | ☐ |
| 5 | Reboot device mid-session | Session state and blocking resume correctly after reboot | ☐ |
| 6 | Deny Accessibility/Usage Access permission | App shows clear explanation and blocks progress until granted, doesn't silently fail | ☐ |
| 7 | Try emergency override | Requires deliberate multi-step friction flow, logs the override event in stats | ☐ |
| 8 | NFC disabled in system settings | App detects this and deep-links to settings with clear message | ☐ |
| 9 | Airplane mode / no network | App fully functional (no feature requires network) | ☐ |
| 10 | MIUI default battery settings | Note whether blocking survives without autostart steps; confirm it survives after following onboarding steps | ☐ |
| 11 | ColorOS or FuntouchOS device | Same check as #10 for that OEM | ☐ |
| 12 | Phone idle/locked 1+ hour during session | Service still running, blocking still enforced (Doze survival) | ☐ |
| 13 | Unregistered/random NFC tag tapped mid-session | Ignored — session not toggled | ☐ |
| 14 | NFC unsupported device | Clear message + frictionful manual toggle fallback | ☐ |
| 15 | Blocked app opened from a deep link / notification | Still redirected to Blocked screen | ☐ |
| 16 | Accessibility permission revoked mid-session | Warning shown; enforcement noted as degraded | ☐ |
| 17 | App force-uninstall attempt via Settings mid-session | OS blocks/limits (device admin) or at minimum documented warning | ☐ |

## Build / run notes

- Requires JDK 17+ and Android SDK (not present in the dev machine's shell — see `docs/ARCHITECTURE.md`).
- Build: `cd BricksApp && npx react-native run-android`.
- Keep the foreground service notification visible; verify in `adb shell dumpsys activity services com.bricks.app`.
