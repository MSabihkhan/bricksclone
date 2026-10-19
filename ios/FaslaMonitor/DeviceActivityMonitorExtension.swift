import DeviceActivity

/// Ends a timed session while the app is closed: lifts the shield and records the completion.
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    if activity.rawValue == FaslaShared.sessionActivity {
      FaslaShared.finishFromTimer()
    }
  }
}
