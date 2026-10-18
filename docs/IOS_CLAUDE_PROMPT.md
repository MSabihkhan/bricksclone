# Prompt to give Claude Code (run it from the repo root on the Mac)

Copy everything in the block below.

```
You are porting the Android app "fasla" to iOS. The repo is a React Native 0.86 app (New Architecture, Hermes, TypeScript). Read docs/IOS_STEPS.md and src/native/BlockingModule.ts first.

What fasla is: an NFC focus app. The user taps a physical NFC card (called a "key") to start a focus session. Chosen apps are blocked until they tap the same key again. No account, no server, all data stays on the phone.

Important:
- Do NOT rewrite the app in Swift. All screens, the SQLite database, Zustand state and logic in src/ are shared and must keep working unchanged on both platforms.
- Only the native layer is Android-only. Build an iOS native module in Swift named BricksBlocking that matches the API in src/native/BlockingModule.ts (same method names, same event names), so the JavaScript does not change. Use the Kotlin files in android/app/src/main/java/com/bricks/app/ as the behavioral reference (BricksBlockingModule.kt, StateStore.kt, BlockGuard.kt, BlockedActivity.kt, BlockingAccessibilityService.kt, FocusBlockingService.kt, PrayerReminder.kt, NfcUnlockActivity.kt).

Do these in order, and stop after each to tell me what to test on a real iPhone:
1. Make the project build and run on iOS. Run pod install, set the bundle id to com.fasla.focus, fix any iOS build errors, and load the fonts in android/app/src/main/assets/fonts (Archivo, Geist, JetBrains Mono) into the iOS project and Info.plist (UIAppFonts). Add a safe iOS stub for BricksBlocking so the app opens with no native crashes.
2. NFC with Core NFC: scanning a key, normalizing the tag id, and the events the JS expects. Add the NFC Tag Reading capability and NFCReaderUsageDescription. Note iOS needs a scan sheet, so adapt the "tap to start" and "tap to end" flow in src/hooks/useNfcSessionStart.ts and src/components/ScanSheet.tsx for iOS.
3. App blocking with the Screen Time API (FamilyControls, ManagedSettings, DeviceActivity). Use FamilyActivityPicker for choosing apps, and a Shield Configuration extension for the "Not right now" screen using the design in docs and the existing Android BlockedActivity as reference (dark #0B0B0D background, red #E5242B accent). Map the existing blocked-apps list in the JS to FamilyActivitySelection. Explain clearly which Apple entitlements and capabilities I must request, and write the exact text for the entitlement request.
4. Local notifications for the prayer reminders (src/features/prayer.ts). Hide the "Silence notifications" setting on iOS because iOS cannot do it.
5. Update the Settings, Permissions and onboarding screens so the Android-only items (Accessibility, usage access, display over other apps, battery, autostart) do not appear on iOS and are replaced by the Screen Time permission and the NFC prompt. Keep the same visual style (src/theme/palette.ts, src/ui/kit.tsx).
6. Run tsc, jest and lint. Do not change Android behavior; confirm the Android code paths still compile.

Rules: keep platform checks as Platform.OS === 'ios' in JS; never commit certificates or secrets; keep the app offline with no analytics or accounts; write short comments only where the reason is not obvious. Ask me before anything that needs my Apple account.
```
