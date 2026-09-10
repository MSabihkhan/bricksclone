package com.bricks.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object FocusCompletion {
    private const val CHANNEL_ID = "focus_results_v1"
    private const val MAX_SESSION_SEC = 24 * 60 * 60L

    fun complete(context: Context, state: BlockingState, endedVia: String) {
        val now = System.currentTimeMillis() / 1000
        val effectiveEnd = if (endedVia == "timer" && state.plannedEndTime != null) {
            minOf(now, state.plannedEndTime)
        } else {
            now
        }
        val durationSec = (effectiveEnd - state.startedAt).coerceIn(0, MAX_SESSION_SEC)

        // Persist this before clearing native blocking. React Native reconciles it into
        // SQLite the next time the app is intentionally opened.
        StateStore.savePendingCompletion(
            SessionCompletion(state.sessionId, endedVia, effectiveEnd, durationSec)
        )
        StateStore.save(null)
        BlockGuard.reset()
        BlockedActivity.dismissAfterUnlock()
        showSummaryNotification(context, durationSec, state.blockedCount)
    }

    private fun showSummaryNotification(context: Context, durationSec: Long, blockedCount: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Focus summaries", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Shows a summary when a focus session finishes."
                    enableVibration(true)
                    setShowBadge(false)
                }
            )
        }

        val openApp = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            20,
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val duration = formatDuration(durationSec)
        val blockedText = if (blockedCount == 1) "1 distraction blocked" else "$blockedCount distractions blocked"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Focus complete")
            .setContentText("$duration focused · $blockedText")
            .setStyle(NotificationCompat.BigTextStyle().bigText("$duration focused · $blockedText"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setAutoCancel(true)
            .setTimeoutAfter(8_000)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(2, notification)
    }

    private fun formatDuration(seconds: Long): String {
        if (seconds < 60) return "Less than a minute"
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        return when {
            hours > 0 && minutes > 0 -> "${hours}h ${minutes}m"
            hours > 0 -> "${hours}h"
            else -> "${minutes} min"
        }
    }
}
