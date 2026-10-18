# fasla iOS: steps for the Mac developer

fasla is a React Native app (TypeScript). The screens, database, state and logic already work on iOS. Do **not** rewrite the app in Swift. Only the native Android parts need an iOS version, written in Swift and exposed to the same JavaScript API.

## 1. Set up (about 1 hour)
1. Install Xcode (App Store), Node 20+, and CocoaPods (`sudo gem install cocoapods`).
2. Clone the repo (you need collaborator access to the private repo):
   `git clone https://github.com/MSabihkhan/bricksclone.git && cd bricksclone`
3. `npm install`, then `cd ios && pod install && cd ..`
4. Open `ios/BricksApp.xcworkspace` in Xcode. Set your Team under Signing & Capabilities.
5. Change the bundle identifier to `com.fasla.focus` (same as Android).
6. Run on a **real iPhone** (XS or newer). The simulator cannot read NFC or test app blocking.

## 2. What to build
The JavaScript calls one native module, `BricksBlocking`, described in `src/native/BlockingModule.ts`. Android implements it in Kotlin (`android/app/src/main/java/com/bricks/app/`). Create the same module in Swift under `ios/` with the same method names and events.

| Feature | Android | iOS |
| --- | --- | --- |
| Tap key to start and end | NFC foreground dispatch | Core NFC (`NFCNDEFReaderSession` or `NFCTagReaderSession`). iOS needs a scan prompt to read a tag. |
| Block apps during a session | Accessibility service + lock screen | Screen Time API: FamilyControls, ManagedSettings, DeviceActivity. `FamilyActivityPicker` replaces the app list. |
| "Not right now" lock screen | `BlockedActivity` | Shield Configuration extension |
| Silence notifications | Notification listener | Not possible on iOS. Hide the "Silence notifications" setting there. |
| Foreground service | `FocusBlockingService` | Not needed. DeviceActivity schedules the shield. |
| Prayer reminders | Alarm + notification | Local notifications (`UNUserNotificationCenter`) |

## 3. Apple requirements (start early)
- Apple Developer Program account ($99 a year).
- The FamilyControls (Distribution) entitlement needs approval from Apple. Request it first; it can take days to weeks.
- Add the NFC Tag Reading capability and `NFCReaderUsageDescription` to Info.plist.

## 4. Done when
1. Pair a key, start a session by tapping it, and blocked apps show the shield.
2. Tapping the same key ends the session and unlocks the apps.
3. History and Insights show the session.
4. The app works with no internet and has no account.

## 5. Rules
- Keep all screens and logic in `src/`. Only add iOS-specific code behind `Platform.OS === 'ios'`.
- Never commit signing certificates or keystores.
- Product copy, design and Play answers are in `docs/` and the root `README`.
