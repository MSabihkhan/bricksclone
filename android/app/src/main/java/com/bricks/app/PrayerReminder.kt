package com.bricks.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import java.util.Calendar

data class PrayerReminderEntry(val label: String, val hour: Int, val minute: Int, val enabled: Boolean)

/**
 * Schedules one daily alarm per prayer reminder. Each alarm is a one-shot that reschedules
 * itself for the next day from its *stored clock time*, not "now + 24h", so delivery delays
 * never accumulate into drift.
 *
 * Alarms are inexact (`setAndAllowWhileIdle`): Android may deliver a few minutes late in
 * Doze. Exact alarms need SCHEDULE_EXACT_ALARM, which Play restricts and which is denied by
 * default on Android 14+, so it is deliberately not used.
 */
object PrayerReminderScheduler {
    private const val PREFS = "prayer_reminder"
    private const val KEY_LIST = "reminders"
    private const val LEGACY_REQUEST_CODE = 7301
    private const val BASE_REQUEST_CODE = 7400
    const val MAX_REMINDERS = 10
    const val EXTRA_INDEX = "prayer_index"

    fun setReminders(context: Context, json: String) {
        val entries = parse(json)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_LIST, json)
            // The single-reminder keys from the first version would otherwise be restored on boot.
            .remove("enabled").remove("hour").remove("minute")
            .apply()
        cancelAll(context)
        entries.forEachIndexed { index, entry -> if (entry.enabled) scheduleOne(context, index, entry) }
    }

    fun restore(context: Context) {
        cancelAll(context)
        load(context).forEachIndexed { index, entry -> if (entry.enabled) scheduleOne(context, index, entry) }
    }

    fun load(context: Context): List<PrayerReminderEntry> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.getString(KEY_LIST, null)?.let { return parse(it) }
        // Upgrade path: the first version stored a single reminder under these keys.
        if (prefs.getBoolean("enabled", false)) {
            return listOf(PrayerReminderEntry("Prayer", prefs.getInt("hour", 12), prefs.getInt("minute", 30), true))
        }
        return emptyList()
    }

    fun rescheduleIndex(context: Context, index: Int) {
        val entry = load(context).getOrNull(index) ?: return
        if (entry.enabled) scheduleOne(context, index, entry)
    }

    private fun parse(json: String): List<PrayerReminderEntry> = try {
        val array = JSONArray(json)
        (0 until minOf(array.length(), MAX_REMINDERS)).map { i ->
            val o = array.getJSONObject(i)
            PrayerReminderEntry(
                label = o.optString("label", "Prayer").ifBlank { "Prayer" },
                hour = o.optInt("hour", 12).coerceIn(0, 23),
                minute = o.optInt("minute", 0).coerceIn(0, 59),
                enabled = o.optBoolean("enabled", true),
            )
        }
    } catch (e: Exception) {
        emptyList()
    }

    private fun pendingFor(context: Context, index: Int, flags: Int): PendingIntent? {
        val intent = Intent(context, PrayerReminderReceiver::class.java).putExtra(EXTRA_INDEX, index)
        return PendingIntent.getBroadcast(context, BASE_REQUEST_CODE + index, intent, flags or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun scheduleOne(context: Context, index: Int, entry: PrayerReminderEntry) {
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, entry.hour)
            set(Calendar.MINUTE, entry.minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
        }
        val pending = pendingFor(context, index, PendingIntent.FLAG_UPDATE_CURRENT) ?: return
        val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.timeInMillis, pending)
    }

    private fun cancelAll(context: Context) {
        val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for (index in 0 until MAX_REMINDERS) {
            pendingFor(context, index, PendingIntent.FLAG_NO_CREATE)?.let {
                alarm.cancel(it)
                it.cancel()
            }
        }
        PendingIntent.getBroadcast(
            context,
            LEGACY_REQUEST_CODE,
            Intent(context, PrayerReminderReceiver::class.java),
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )?.let {
            alarm.cancel(it)
            it.cancel()
        }
    }
}

class PrayerReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // Alarms fired by the first version carry no index; treat them as the first reminder.
        val index = intent.getIntExtra(PrayerReminderScheduler.EXTRA_INDEX, 0)
        val entry = PrayerReminderScheduler.load(context).getOrNull(index)
        if (entry == null || !entry.enabled) return

        val channelId = "prayer_reminders"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(NotificationChannel(channelId, "Prayer reminders", NotificationManager.IMPORTANCE_DEFAULT))
        }
        val open = PendingIntent.getActivity(context, 7302, Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val body = "Time for ${entry.label}. Take a quiet pause — tap your key if you want the phone to stay quiet."
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_fasla)
            .setContentTitle(entry.label)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(7400 + index, notification)
        } catch (_: SecurityException) {
            // Notifications denied; still keep tomorrow's alarm so it works once allowed.
        }
        PrayerReminderScheduler.rescheduleIndex(context, index)
    }
}
