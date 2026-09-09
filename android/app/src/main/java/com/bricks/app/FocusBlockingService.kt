package com.bricks.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class FocusBlockingService : Service() {
    @Volatile
    private var isRunning = false
    private var pollingThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        StateStore.init(applicationContext)
        // Post the notification before any early return: Android kills a service that was
        // started with startForegroundService() and does not call startForeground() in time.
        startForegroundNotification()
        if (StateStore.load() != null) {
            startPolling()
        } else {
            stopSelf()
        }
        return START_STICKY
    }

    private fun startForegroundNotification() {
        val channelId = "focus_blocking"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Focus Blocking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                setShowBadge(false)
                description = "Shown while a focus session is running."
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        val numApps = StateStore.load()?.blockedPackages?.size ?: 0

        val contentIntent = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(
                this,
                0,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        var iconRes = resources.getIdentifier("ic_launcher", "mipmap", packageName)
        if (iconRes == 0) iconRes = android.R.drawable.ic_lock_lock

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Focus session active")
            .setContentText("$numApps apps blocked · tap your Brick to end")
            .setSmallIcon(iconRes)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .apply { contentIntent?.let { setContentIntent(it) } }
            .build()

        startForeground(1, notification)
    }

    private fun startPolling() {
        if (isRunning) return
        isRunning = true

        pollingThread = Thread {
            val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            var lastQueryTime = System.currentTimeMillis() - 10_000
            while (isRunning) {
                try {
                    if (StateStore.load() == null) {
                        isRunning = false
                        stopSelf()
                        break
                    }

                    val now = System.currentTimeMillis()
                    // Event stream rather than aggregated stats: queryUsageStats sorted by
                    // lastTimeUsed reports whichever app was touched most recently in the
                    // window, which lags badly and misreports on fast app switches.
                    val fgPackage = latestForegroundPackage(usageStatsManager, lastQueryTime - 1000, now)
                    lastQueryTime = now

                    if (fgPackage != null) {
                        BlockGuard.handleForegroundPackage(this, fgPackage)
                    }
                } catch (e: Exception) {
                    // Usage access can be revoked mid-session; keep polling rather than dying.
                }

                try {
                    Thread.sleep(1000)
                } catch (e: InterruptedException) {
                    break
                }
            }
        }
        pollingThread?.start()
    }

    private fun latestForegroundPackage(manager: UsageStatsManager, start: Long, end: Long): String? {
        val events = manager.queryEvents(start, end)
        val event = UsageEvents.Event()
        var latestPackage: String? = null
        var latestTime = 0L
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val isResume = event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                event.eventType == UsageEvents.Event.ACTIVITY_RESUMED
            if (isResume && event.timeStamp >= latestTime) {
                latestTime = event.timeStamp
                latestPackage = event.packageName
            }
        }
        return latestPackage
    }

    override fun onDestroy() {
        isRunning = false
        pollingThread?.interrupt()
        pollingThread = null
        super.onDestroy()
    }
}
