package com.bricks.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.content.pm.PackageManager

class BlockingAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        StateStore.init(applicationContext)
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val activeState = StateStore.load() ?: return
            val pkg = event.packageName?.toString() ?: return

            if (pkg in activeState.blockedPackages &&
                pkg != packageName &&
                pkg != "com.android.systemui" &&
                pkg != getLauncherPackageName()
            ) {
                if (!BlockedActivity.isShowing) {
                    val pm = packageManager
                    val label = try {
                        val ai = pm.getApplicationInfo(pkg, 0)
                        pm.getApplicationLabel(ai).toString()
                    } catch (e: Exception) {
                        pkg
                    }
                    
                    val ts = System.currentTimeMillis()
                    StateStore.recordAttempt(pkg, label, ts)
                    val attempt = Attempt(activeState.sessionId, pkg, label, ts)
                    BricksBlockingModule.emitAttempt(attempt)

                    val intent = Intent(this, BlockedActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    }
                    startActivity(intent)
                }
            }
        }
    }

    override fun onInterrupt() {}

    private fun getLauncherPackageName(): String {
        val intent = Intent(Intent.ACTION_MAIN)
        intent.addCategory(Intent.CATEGORY_HOME)
        val resolveInfo = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        return resolveInfo?.activityInfo?.packageName ?: ""
    }
}
