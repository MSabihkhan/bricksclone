package com.bricks.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class FocusBlockingService : Service() {
    private var isRunning = false
    private var pollingThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        StateStore.init(applicationContext)
        val activeState = StateStore.load()
        if (activeState != null) {
            startForegroundService()
            startPolling()
        } else {
            stopSelf()
        }
        return START_STICKY
    }

    private fun startForegroundService() {
        val channelId = "focus_blocking"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Focus Blocking",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        val activeState = StateStore.load()
        val numApps = activeState?.blockedPackages?.size ?: 0

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Focus session active")
            .setContentText("Focus session active · $numApps apps blocked")
            .setSmallIcon(resources.getIdentifier("ic_launcher", "mipmap", packageName))
            .build()

        startForeground(1, notification)
    }

    private fun startPolling() {
        if (isRunning) return
        isRunning = true

        pollingThread = Thread {
            val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            while (isRunning) {
                try {
                    val activeState = StateStore.load()
                    if (activeState == null) {
                        isRunning = false
                        stopSelf()
                        break
                    }

                    val now = System.currentTimeMillis()
                    val stats = usageStatsManager.queryUsageStats(
                        UsageStatsManager.INTERVAL_BEST,
                        now - 5000,
                        now
                    )

                    if (stats != null && stats.isNotEmpty()) {
                        val recentStat = stats.maxByOrNull { it.lastTimeUsed }
                        val fgPackage = recentStat?.packageName

                        if (fgPackage != null && 
                            fgPackage in activeState.blockedPackages &&
                            fgPackage != packageName &&
                            fgPackage != "com.android.systemui" &&
                            fgPackage != getLauncherPackageName()
                        ) {
                            if (!BlockedActivity.isShowing) {
                                val pm = packageManager
                                val label = try {
                                    val ai = pm.getApplicationInfo(fgPackage, 0)
                                    pm.getApplicationLabel(ai).toString()
                                } catch (e: Exception) {
                                    fgPackage
                                }

                                val ts = System.currentTimeMillis()
                                StateStore.recordAttempt(fgPackage, label, ts)
                                val attempt = Attempt(activeState.sessionId, fgPackage, label, ts)
                                BricksBlockingModule.emitAttempt(attempt)

                                val intent = Intent(this, BlockedActivity::class.java).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                                }
                                startActivity(intent)
                            }
                        }
                    }
                } catch (e: Exception) {
                    // Ignore
                }

                try {
                    Thread.sleep(2000)
                } catch (e: InterruptedException) {
                    break
                }
            }
        }
        pollingThread?.start()
    }

    private fun getLauncherPackageName(): String {
        val intent = Intent(Intent.ACTION_MAIN)
        intent.addCategory(Intent.CATEGORY_HOME)
        val resolveInfo = packageManager.resolveActivity(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
        return resolveInfo?.activityInfo?.packageName ?: ""
    }

    override fun onDestroy() {
        isRunning = false
        pollingThread?.interrupt()
        super.onDestroy()
    }
}
