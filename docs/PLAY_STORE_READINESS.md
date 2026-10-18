# Play Store readiness

*Last updated 2026-10-04. Ordered by what blocks a release first.*

## Fixed in code

- **Removed `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.** Play only allows it for chat, VPN, device-companion and similar apps. The app now opens the system battery-optimisation list instead, which needs no permission.
- **Accessibility prominent disclosure** (`WhyAccessibility`): now says exactly what is read (the foreground app's name), why, what is kept on the phone, that nothing is shared, and ends with **Agree and continue** plus a **Not now** option, as Play's User Data policy requires for non-accessibility-tool apps.
- **Prayer sessions are no longer graded.** Asking "done / not done" after prayer contradicted the app's own promise.
- **Notification silencing** (`NotificationBlockerService`) has its own in-app disclosure (`NotificationAccessSheet`) before the user is sent to Android's Notification access screen: what it does, what still gets through, what it reads (sender app and type, never content), what's kept (a count per app), nothing shared. The privacy policy and Data safety answers must say the same.

## Note on sideloaded test builds

Android 13+ blocks Accessibility and Notification access for apps installed from a file ("Restricted setting"). Testers installing the APK directly must open App info → ⋮ → **Allow restricted settings** first. Installs from Play (including closed testing) are not affected. The app explains this in the notification disclosure sheet.

## Must do before submitting

1. **Personal developer account → closed test first.** Accounts created after 13 Nov 2023 must run a closed test with at least 12 testers opted in for the last 14 days in a row before applying for production. Start recruiting now; dropping below 12 resets the clock. Organisation accounts are exempt.
2. **Accessibility API declaration** in Play Console: describe the core feature (blocking apps during focus sessions), why the API is needed, and attach a short video of the disclosure and the blocking flow. Do **not** set `isAccessibilityTool` — that is only for apps built for people with disabilities.
3. **Foreground service declaration** for `specialUse` ("Focus session app blocking") with a description and video.
4. **Privacy policy URL.** Required because the app uses accessibility and usage access. Host it on the landing page (`website/`). It should match the disclosure: no account, no data leaves the phone, blocked-attempt history stays local.
5. **Data safety form.** The app makes no network calls, so the honest answer is "no data collected or shared". To make that airtight, move the `INTERNET` permission from `src/main/AndroidManifest.xml` to `src/debug/AndroidManifest.xml` (only Metro needs it).
6. **Release signing and AAB.** Create an upload keystore, fill `android/keystore.properties` (template exists), build with `./gradlew bundleRelease`, and enrol in Play App Signing. The current test APK is signed with the debug key and cannot be uploaded.
7. **Name and icon.** "Bricks" sits very close to the existing NFC blocker "Brick" with the same mechanic — a likely trademark or impersonation complaint. Ship under the "Fasla" direction (after the trademark/store/domain checks noted in `website/BRAND.md`) and replace the default React Native launcher icon.
8. **Device testing.** `docs/MANUAL_TEST_MATRIX.md` is still unchecked. At minimum: tap start/end, blocked-app redirect, force-kill, reboot, and one aggressive-OEM phone (Xiaomi/Oppo/vivo).
9. **Store listing basics:** content rating questionnaire, Productivity category, screenshots (the website already has four), short and full description that explains the Brick is a separate physical NFC tag.

## Value to add before or shortly after launch

Ranked by how much they strengthen the core loop for the effort:

1. **A block list per Brick.** The single biggest gap. Desk Brick blocks social; bedroom Brick blocks almost everything. Without it, two Bricks only differ by name and timer.
2. **City-based prayer times**, calculated offline (`adhan` library, Karachi method, Hanafi Asr option). Fixes the drift of fixed clock times and is a strong differentiator for the Pakistani audience.
3. **Each Brick remembers its usual ritual** — tap the bedroom Brick, Bedtime is already selected.
4. **Weekly review notification** (local): time per ritual, study/work outcomes, best day. Uses data the app already stores.
5. **Backup and restore** to a local file, so switching phones doesn't lose history and Bricks.
6. **Urdu localisation**, matching the brand.
7. **Quick Settings tile or widget** showing whether a session is running.

## Reference

- Play Console: [Testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- Play Console: [Use of the AccessibilityService API](https://support.google.com/googleplay/android-developer/answer/10964491)
