package com.bricks.app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

data class BlockingState(
    val sessionId: Long,
    val tagId: String?,
    val blockedPackages: List<String>,
    val strict: Boolean,
    val startedAt: Long,
    val plannedEndTime: Long?,
    val blockedCount: Int = 0
)

data class SessionCompletion(
    val sessionId: Long,
    val endedVia: String,
    val endTime: Long,
    val durationSec: Long
)

data class Attempt(
    val sessionId: Long,
    val packageName: String,
    val label: String,
    val createdAt: Long
)

object StateStore {
    private const val PREFS_NAME = "focus_blocking"
    private const val KEY_ACTIVE_STATE = "active_state"
    private const val KEY_ATTEMPTS = "attempts"
    private const val KEY_PENDING_COMPLETION = "pending_completion"
    private const val MAX_PENDING_ATTEMPTS = 500

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        if (!::prefs.isInitialized) {
            prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }
    }

    fun save(active: BlockingState?) {
        if (active == null) {
            prefs.edit().remove(KEY_ACTIVE_STATE).apply()
        } else {
            val json = JSONObject().apply {
                put("sessionId", active.sessionId)
                if (active.tagId != null) put("tagId", active.tagId)
                val packagesArray = JSONArray()
                active.blockedPackages.forEach { packagesArray.put(it) }
                put("blockedPackages", packagesArray)
                put("strict", active.strict)
                put("startedAt", active.startedAt)
                if (active.plannedEndTime != null) put("plannedEndTime", active.plannedEndTime)
                put("blockedCount", active.blockedCount)
            }
            prefs.edit().putString(KEY_ACTIVE_STATE, json.toString()).apply()
        }
    }

    fun load(): BlockingState? {
        val jsonString = prefs.getString(KEY_ACTIVE_STATE, null) ?: return null
        return try {
            val json = JSONObject(jsonString)
            val packagesArray = json.getJSONArray("blockedPackages")
            val packages = mutableListOf<String>()
            for (i in 0 until packagesArray.length()) {
                packages.add(packagesArray.getString(i))
            }
            BlockingState(
                sessionId = json.getLong("sessionId"),
                tagId = if (json.has("tagId") && !json.isNull("tagId")) json.getString("tagId") else null,
                blockedPackages = packages,
                strict = json.getBoolean("strict"),
                startedAt = json.getLong("startedAt"),
                plannedEndTime = if (json.has("plannedEndTime") && !json.isNull("plannedEndTime")) json.getLong("plannedEndTime") else null,
                blockedCount = json.optInt("blockedCount", 0)
            )
        } catch (e: Exception) {
            null
        }
    }

    @Synchronized
    fun recordAttempt(pkg: String, label: String, ts: Long) {
        val active = load() ?: return
        val attemptsJson = prefs.getString(KEY_ATTEMPTS, "[]")
        val attemptsArray = JSONArray(attemptsJson)
        val attemptObj = JSONObject().apply {
            put("sessionId", active.sessionId)
            put("packageName", pkg)
            put("label", label)
            put("createdAt", ts)
        }
        attemptsArray.put(attemptObj)
        val boundedAttempts = JSONArray()
        val firstIndex = maxOf(0, attemptsArray.length() - MAX_PENDING_ATTEMPTS)
        for (i in firstIndex until attemptsArray.length()) {
            boundedAttempts.put(attemptsArray.getJSONObject(i))
        }
        prefs.edit().putString(KEY_ATTEMPTS, boundedAttempts.toString()).apply()
        save(active.copy(blockedCount = active.blockedCount + 1))
    }

    fun savePendingCompletion(completion: SessionCompletion) {
        val json = JSONObject().apply {
            put("sessionId", completion.sessionId)
            put("endedVia", completion.endedVia)
            put("endTime", completion.endTime)
            put("durationSec", completion.durationSec)
        }
        prefs.edit().putString(KEY_PENDING_COMPLETION, json.toString()).commit()
    }

    fun loadPendingCompletion(): SessionCompletion? {
        val raw = prefs.getString(KEY_PENDING_COMPLETION, null) ?: return null
        return try {
            val json = JSONObject(raw)
            SessionCompletion(
                sessionId = json.getLong("sessionId"),
                endedVia = json.getString("endedVia"),
                endTime = json.getLong("endTime"),
                durationSec = json.getLong("durationSec")
            )
        } catch (e: Exception) {
            null
        }
    }

    fun clearPendingCompletion() {
        prefs.edit().remove(KEY_PENDING_COMPLETION).apply()
    }

    fun drainAttempts(): List<Attempt> {
        val attemptsJson = prefs.getString(KEY_ATTEMPTS, "[]")
        val attemptsArray = JSONArray(attemptsJson)
        val list = mutableListOf<Attempt>()
        for (i in 0 until attemptsArray.length()) {
            val obj = attemptsArray.getJSONObject(i)
            list.add(
                Attempt(
                    sessionId = obj.getLong("sessionId"),
                    packageName = obj.getString("packageName"),
                    label = obj.getString("label"),
                    createdAt = obj.getLong("createdAt")
                )
            )
        }
        prefs.edit().remove(KEY_ATTEMPTS).apply()
        return list
    }
}
