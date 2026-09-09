# Running Bricks on Android

Android is the only supported platform right now. The iOS folder is the stock React Native
scaffold and is not wired to the blocking engine.

## One-time setup

- Node >= 22.11
- Android SDK 36 + NDK 27.1.12297006 (`android/local.properties` must point at the SDK)
- JDK 17

### Gradle must run on JDK 17

Android Studio ships JetBrains Runtime 25. When Gradle runs on it, the Android Gradle Plugin
forks the `prefab` tool, that JVM prints `WARNING: A restricted method in java.lang.System
has been called` to stderr, and AGP turns any stderr from `prefab` into a build failure:

```
Execution failed for task ':app:configureCMakeDebug[arm64-v8a]'.
> WARNING: A restricted method in java.lang.System has been called
```

Pin Gradle to JDK 17 in `~/.gradle/gradle.properties` (machine-local, not committed):

```properties
org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot
```

Verify with `./gradlew --version` — "Daemon JVM" should report 17.

## Run on a device

Enable USB debugging, plug the phone in, confirm `adb devices` lists it, then:

```bash
npx react-native run-android
```

That starts Metro and installs the debug APK. To build the APK without installing:

```bash
cd android && ./gradlew :app:assembleDebug
```

The output lands in `android/app/build/outputs/apk/debug/app-debug.apk`.

### ABIs

`android/gradle.properties` builds `armeabi-v7a,arm64-v8a,x86,x86_64`. It previously built
`x86_64` only, which produces an APK that installs on an emulator but **not** on any real
phone (those are `arm64-v8a`). To speed up emulator-only iteration, override per build
rather than editing the file:

```bash
cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64
```

## Permissions the app needs

NFC blocking cannot work without these; onboarding walks through each one.

| Permission | Why | Granted in |
| --- | --- | --- |
| Usage access | detects which app is in the foreground | Settings → Usage access |
| Accessibility service | instant foreground detection, and it is what exempts the app from Android 10+ background-activity-start limits so the block screen can appear | Settings → Accessibility |
| Display over other apps | second exemption for showing the block screen | Settings → Display over other apps |
| Battery optimization off | keeps the session alive in the background | system dialog / OEM settings |
| Notifications (Android 13+) | shows the ongoing focus-session notification | runtime prompt on first launch |

On Xiaomi/MIUI, Oppo/ColorOS, vivo and Samsung, also enable Autostart — the onboarding
screen deep-links to the right page per manufacturer.

## Emulator notes

Emulators have no NFC hardware. `RegisterTag` detects this and offers **Enter tag ID
manually**, so the whole flow is testable without a physical Brick: register a made-up hex
id, then start and end sessions from the Home screen buttons.

## Checks

```bash
npx tsc --noEmit && npx jest && npx eslint . --ext .ts,.tsx
```
