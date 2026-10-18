package com.bricks.app

import android.app.Notification
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationManagerCompat
import java.lang.ref.WeakReference

/**
 * While a focus session runs, removes notifications posted by blocked apps so they can't
 * pull the user back in. Requires the user to grant Notification access.
 *
 * Removed, not snoozed: snoozing is meant for a user-chosen delay and re-alerts when it
 * expires. The app's messages themselves are untouched — opening the app afterwards shows
 * them — and the session summary says how many were held back.
 *
 * Never removed: calls and alarms (so a blocked messenger can still ring), ongoing and
 * foreground-service notifications (music, navigation), and anything not clearable.
 */
class NotificationBlockerService : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        StateStore.init(applicationContext)
        instance = WeakReference(this)
        sweepActive()
    }

    override fun onListenerDisconnected() {
        instance = null
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        StateStore.init(applicationContext)
        silenceIfBlocked(sbn)
    }

    /** Clears notifications from blocked apps that were already showing when the session began. */
    fun sweepActive() {
        if (StateStore.load() == null) return
        val active = try { activeNotifications } catch (e: Exception) { null } ?: return
        active.forEach { silenceIfBlocked(it) }
    }

    private fun silenceIfBlocked(sbn: StatusBarNotification) {
        if (!StateStore.isSilenceEnabled()) return
        val state = StateStore.load() ?: return
        val notification = sbn.notification ?: return
        if (!shouldSilence(sbn.packageName, packageName, state.blockedPackages, sbn.isClearable, notification.flags, notification.category)) return
        try {
            cancelNotification(sbn.key)
        } catch (e: Exception) {
            return
        }
        // A group summary is the "3 new messages" header, not a message of its own.
        if (notification.flags and Notification.FLAG_GROUP_SUMMARY == 0) {
            StateStore.recordHeldNotification(sbn.packageName)
        }
    }

    companion object {
        @Volatile
        private var instance: WeakReference<NotificationBlockerService>? = null

        fun isAccessGranted(context: Context): Boolean =
            NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

        /** Called when a session starts so notifications already in the shade are cleared too. */
        fun sweepNow() {
            val service = instance?.get() ?: return
            Handler(Looper.getMainLooper()).post { service.sweepActive() }
        }

        fun shouldSilence(
            pkg: String,
            ownPackage: String,
            blockedPackages: List<String>,
            clearable: Boolean,
            flags: Int,
            category: String?
        ): Boolean {
            if (pkg == ownPackage || pkg !in blockedPackages) return false
            if (!clearable) return false
            if (flags and Notification.FLAG_ONGOING_EVENT != 0) return false
            if (flags and Notification.FLAG_FOREGROUND_SERVICE != 0) return false
            if (category == Notification.CATEGORY_CALL || category == Notification.CATEGORY_ALARM) return false
            return true
        }
    }
}
