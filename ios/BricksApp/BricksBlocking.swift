import DeviceActivity
import FamilyControls
import Foundation
import UIKit
import React

/// iOS side of the `BricksBlocking` native module (see src/native/BlockingModule.ts).
///
/// Blocking uses the Screen Time API: the chosen apps are shielded through ManagedSettings,
/// the "Not right now" screen lives in the FaslaShield extension, and timed sessions are ended
/// by the FaslaMonitor extension. Android's per-attempt events have no iOS equivalent.
@objc(BricksBlocking)
class BricksBlocking: RCTEventEmitter {
  private let defaults = UserDefaults.standard
  private enum Key {
    static let persona = "bricks.personaEnabled"
  }

  /// DeviceActivity refuses schedules shorter than this; shorter sessions end through the JS timer.
  private let minMonitoredSeconds: TimeInterval = 15 * 60

  private var screenTimeApproved: Bool {
    AuthorizationCenter.shared.authorizationStatus == .approved
  }

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! { ["BlockedAttempt"] }

  // MARK: Session state

  @objc(startBlocking:tagId:blockedPackages:strict:startedAt:plannedEndTime:intention:ritual:keyName:resolver:rejecter:)
  func startBlocking(
    _ sessionId: Double,
    tagId: String?,
    blockedPackages: [String],
    strict: Bool,
    startedAt: Double,
    plannedEndTime: NSNumber?,
    intention: String?,
    ritual: String?,
    keyName: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard screenTimeApproved else {
      #if DEBUG
      // Debug builds on a free account cannot get Screen Time access; still run the session without a shield.
      FaslaShared.saveSession(FaslaShared.Session(
        sessionId: sessionId, tagId: tagId, blockedIds: blockedPackages, strict: strict, startedAt: startedAt,
        plannedEndTime: plannedEndTime?.doubleValue, intention: intention, ritual: ritual, keyName: keyName))
      resolve(nil)
      #else
      reject("screen_time_denied", "Screen Time access is needed to block apps.", nil)
      #endif
      return
    }
    guard FaslaShared.applyShield(ids: Set(blockedPackages)) else {
      reject("no_apps", "None of the chosen apps could be found. Choose your apps again.", nil)
      return
    }
    let session = FaslaShared.Session(
      sessionId: sessionId, tagId: tagId, blockedIds: blockedPackages, strict: strict, startedAt: startedAt,
      plannedEndTime: plannedEndTime?.doubleValue, intention: intention?.trimmingCharacters(in: .whitespaces),
      ritual: ritual, keyName: keyName)
    FaslaShared.saveSession(session)
    FaslaShared.clearCompletion()
    scheduleEnd(of: session)
    resolve(nil)
  }

  @objc(stopBlocking:rejecter:)
  func stopBlocking(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // State first, as on Android, so nothing can see a half-stopped session.
    FaslaShared.saveSession(nil)
    DeviceActivityCenter().stopMonitoring([DeviceActivityName(FaslaShared.sessionActivity)])
    FaslaShared.clearShield()
    resolve(nil)
  }

  @objc(isBlockingActive:rejecter:)
  func isBlockingActive(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(FaslaShared.loadSession() != nil)
  }

  @objc(getActiveBlocking:rejecter:)
  func getActiveBlocking(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = FaslaShared.loadSession() else {
      resolve(nil)
      return
    }
    resolve([
      "sessionId": session.sessionId,
      "tagId": session.tagId ?? NSNull(),
      "blockedPackages": session.blockedIds,
      "strict": session.strict,
      "startedAt": session.startedAt,
      "plannedEndTime": session.plannedEndTime ?? NSNull(),
    ])
  }

  @objc(getPendingBlockedAttempts:rejecter:)
  func getPendingBlockedAttempts(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // iOS never tells the app which blocked app was opened.
    resolve([])
  }

  @objc(getPendingSessionCompletion:rejecter:)
  func getPendingSessionCompletion(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(FaslaShared.loadCompletion())
  }

  @objc(clearPendingSessionCompletion:rejecter:)
  func clearPendingSessionCompletion(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    FaslaShared.clearCompletion()
    resolve(nil)
  }

  // MARK: Permissions
  // Usage access and overlay are Android-only and report "granted". The "accessibility" slot
  // reports Screen Time access, so enforcement health reflects the one permission iOS needs.

  @objc(hasUsageAccess:rejecter:)
  func hasUsageAccess(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(true) }

  @objc(requestUsageAccess:rejecter:)
  func requestUsageAccess(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { openSettings(resolve) }

  @objc(isAccessibilityEnabled:rejecter:)
  func isAccessibilityEnabled(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(screenTimeApproved) }

  @objc(requestAccessibility:rejecter:)
  func requestAccessibility(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { openSettings(resolve) }

  @objc(hasOverlayPermission:rejecter:)
  func hasOverlayPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(true) }

  @objc(requestOverlayPermission:rejecter:)
  func requestOverlayPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { openSettings(resolve) }

  @objc(hasIgnoringBatteryOptimizations:rejecter:)
  func hasIgnoringBatteryOptimizations(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(true) }

  @objc(requestBatteryOptimizationExemption:rejecter:)
  func requestBatteryOptimizationExemption(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }

  @objc(openOemSettings:screen:resolver:rejecter:)
  func openOemSettings(_ oem: String, screen: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }

  @objc(hasNotificationAccess:rejecter:)
  func hasNotificationAccess(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(false) }

  @objc(requestNotificationAccess:rejecter:)
  func requestNotificationAccess(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }

  @objc(openAppInfo:rejecter:)
  func openAppInfo(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { openSettings(resolve) }

  // MARK: Device and apps

  @objc(getForegroundPackage:rejecter:)
  func getForegroundPackage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }

  @objc(getManufacturer:rejecter:)
  func getManufacturer(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Apple") }

  /// iOS cannot list installed apps, so this is the apps chosen in the Screen Time picker.
  @objc(getInstalledApps:rejecter:)
  func getInstalledApps(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(FaslaShared.items(in: FaslaShared.loadSelection()).map { ["packageName": $0.id, "label": $0.label] })
  }

  // MARK: Screen Time

  @objc(hasScreenTimeAccess:rejecter:)
  func hasScreenTimeAccess(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(screenTimeApproved)
  }

  @objc(requestScreenTimeAccess:rejecter:)
  func requestScreenTimeAccess(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      // Denial and a missing entitlement both throw; JS only needs to know whether it was granted.
      try? await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      resolve(AuthorizationCenter.shared.authorizationStatus == .approved)
    }
  }

  /// Shows Apple's app picker. Resolves with the chosen items, or null if the user cancelled.
  @objc(pickBlockedApps:rejecter:)
  func pickBlockedApps(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let shown = ActivityPicker.present(initial: FaslaShared.loadSelection()) { selection in
        guard let selection = selection else {
          resolve(nil)
          return
        }
        FaslaShared.saveSelection(selection)
        resolve(FaslaShared.items(in: selection).map { ["packageName": $0.id, "label": $0.label] })
      }
      if !shown { reject("no_view", "Could not open the app picker.", nil) }
    }
  }

  private func scheduleEnd(of session: FaslaShared.Session) {
    guard let end = session.plannedEndTime else { return }
    let endDate = Date(timeIntervalSince1970: end)
    guard endDate.timeIntervalSinceNow >= minMonitoredSeconds else { return }
    let fields: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
    let schedule = DeviceActivitySchedule(
      intervalStart: Calendar.current.dateComponents(fields, from: Date()),
      intervalEnd: Calendar.current.dateComponents(fields, from: endDate),
      repeats: false)
    // Best-effort: without the monitor the JS timer still ends the session when the app is open.
    try? DeviceActivityCenter().startMonitoring(DeviceActivityName(FaslaShared.sessionActivity), during: schedule)
  }

  // MARK: Settings

  @objc(getHeldNotificationCount:rejecter:)
  func getHeldNotificationCount(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(0) }

  @objc(setPrayerReminders:resolver:rejecter:)
  func setPrayerReminders(_ json: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }

  @objc(setPersonaEnabled:resolver:rejecter:)
  func setPersonaEnabled(_ enabled: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    defaults.set(enabled, forKey: Key.persona)
    resolve(nil)
  }

  // iOS cannot silence other apps' notifications.
  @objc(setSilenceEnabled:resolver:rejecter:)
  func setSilenceEnabled(_ enabled: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(nil) }

  @objc(getSilenceEnabled:rejecter:)
  func getSilenceEnabled(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(false) }

  private func openSettings(_ resolve: @escaping RCTPromiseResolveBlock) {
    DispatchQueue.main.async {
      if let url = URL(string: UIApplication.openSettingsURLString) {
        UIApplication.shared.open(url)
      }
      resolve(nil)
    }
  }
}
