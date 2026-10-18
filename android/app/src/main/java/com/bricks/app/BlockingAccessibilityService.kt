package com.bricks.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent

class BlockingAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        StateStore.init(applicationContext)
        isConnected = true
        // Start from the info the system built out of accessibility_service_config.xml so the
        // flags declared there survive, then narrow the event types we actually care about.
        val info = serviceInfo ?: AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.notificationTimeout = 100
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        BlockGuard.handleForegroundPackage(this, pkg) { performGlobalAction(GLOBAL_ACTION_BACK) }
    }

    override fun onInterrupt() {}

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        isConnected = false
        return super.onUnbind(intent)
    }

    companion object {
        /**
         * An enabled accessibility service is what exempts this app from Android 10+
         * background-activity-start restrictions, so the blocking screen can appear.
         */
        @Volatile
        var isConnected = false
    }
}
