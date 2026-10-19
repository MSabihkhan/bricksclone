import CryptoKit
import FamilyControls
import Foundation
import ManagedSettings

/// State shared by the app and its two extensions (shield screen, session timer).
enum FaslaShared {
  static let appGroup = "group.com.fasla.focus"
  /// Falls back to the app's own defaults when the App Group is not provisioned, as on a free account.
  static let defaults = UserDefaults(suiteName: appGroup) ?? .standard

  private enum Key {
    static let selection = "fasla.screenTime.selection"
    static let session = "fasla.session.v2"
    static let completion = "fasla.pendingCompletion"
  }

  /// One focus session as the lock screen and the timer extension need to see it.
  struct Session: Codable {
    var sessionId: Double
    var tagId: String?
    var blockedIds: [String]
    var strict: Bool
    var startedAt: Double
    var plannedEndTime: Double?
    var intention: String?
    var ritual: String?
    var keyName: String?
  }

  struct Item {
    let id: String
    let label: String
  }

  static let sessionActivity = "fasla.session"

  // MARK: Session

  static func loadSession() -> Session? {
    guard let data = defaults.data(forKey: Key.session) else { return nil }
    return try? JSONDecoder().decode(Session.self, from: data)
  }

  static func saveSession(_ session: Session?) {
    guard let session = session, let data = try? JSONEncoder().encode(session) else {
      defaults.removeObject(forKey: Key.session)
      return
    }
    defaults.set(data, forKey: Key.session)
  }

  static func loadCompletion() -> [String: Any]? { defaults.dictionary(forKey: Key.completion) }

  static func clearCompletion() { defaults.removeObject(forKey: Key.completion) }

  /// Ends the session from the timer extension: lifts the shield and leaves a record for the app.
  static func finishFromTimer() {
    guard let session = loadSession() else { return }
    clearShield()
    let end = session.plannedEndTime ?? Date().timeIntervalSince1970
    defaults.set([
      "sessionId": session.sessionId,
      "endedVia": "timer",
      "endTime": end,
      "durationSec": max(0, end - session.startedAt),
    ], forKey: Key.completion)
    saveSession(nil)
  }

  // MARK: Chosen apps

  static func loadSelection() -> FamilyActivitySelection {
    guard let data = defaults.data(forKey: Key.selection),
          let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    else { return FamilyActivitySelection() }
    return selection
  }

  static func saveSelection(_ selection: FamilyActivitySelection) {
    defaults.set(try? JSONEncoder().encode(selection), forKey: Key.selection)
  }

  /// Apple hides which app a token is, so JS gets a stable id per token in place of a package name.
  private static func digest<T: Encodable>(_ value: T) -> String {
    let data = (try? JSONEncoder().encode(value)) ?? Data()
    return SHA256.hash(data: data).prefix(8).map { String(format: "%02x", $0) }.joined()
  }

  static func appId(_ token: ApplicationToken) -> String { "ios.app." + digest(token) }
  static func categoryId(_ token: ActivityCategoryToken) -> String { "ios.cat." + digest(token) }
  static func webId(_ token: WebDomainToken) -> String { "ios.web." + digest(token) }

  /// Every chosen app, category and site as an id plus a best-effort name (iOS often withholds it).
  static func items(in selection: FamilyActivitySelection) -> [Item] {
    let apps = selection.applicationTokens.sorted { appId($0) < appId($1) }.enumerated().map { index, token in
      Item(id: appId(token), label: Application(token: token).localizedDisplayName ?? "App \(index + 1)")
    }
    let categories = selection.categoryTokens.sorted { categoryId($0) < categoryId($1) }.enumerated().map { index, token in
      Item(id: categoryId(token), label: ActivityCategory(token: token).localizedDisplayName ?? "Category \(index + 1)")
    }
    let sites = selection.webDomainTokens.sorted { webId($0) < webId($1) }.enumerated().map { index, token in
      Item(id: webId(token), label: WebDomain(token: token).domain ?? "Website \(index + 1)")
    }
    return apps + categories + sites
  }

  // MARK: Shield

  /// Shields only the chosen ids. Returns false when none of them matches a stored token.
  @discardableResult
  static func applyShield(ids: Set<String>) -> Bool {
    let selection = loadSelection()
    let apps = Set(selection.applicationTokens.filter { ids.contains(appId($0)) })
    let categories = Set(selection.categoryTokens.filter { ids.contains(categoryId($0)) })
    let sites = Set(selection.webDomainTokens.filter { ids.contains(webId($0)) })
    guard !(apps.isEmpty && categories.isEmpty && sites.isEmpty) else { return false }

    let store = ManagedSettingsStore()
    store.shield.applications = apps.isEmpty ? nil : apps
    store.shield.applicationCategories = categories.isEmpty ? nil : .specific(categories)
    store.shield.webDomains = sites.isEmpty ? nil : sites
    store.shield.webDomainCategories = categories.isEmpty ? nil : .specific(categories)
    return true
  }

  static func clearShield() {
    ManagedSettingsStore().clearAllSettings()
  }
}
