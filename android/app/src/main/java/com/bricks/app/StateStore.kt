package com.bricks.app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

data class BlockingState(
    val sessionId: Long,
    val blockedPackages: List<String>,
    val strict: Boolean,
    val startedAt: Long
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
                val packagesArray = JSONArray()
                active.blockedPackages.forEach { packagesArray.put(it) }
                put("blockedPackages", packagesArray)
                put("strict", active.strict)
                put("startedAt", active.startedAt)
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
                blockedPackages = packages,
                strict = json.getBoolean("strict"),
                startedAt = json.getLong("startedAt")
            )
        } catch (e: Exception) {
            null
        }
    }

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
        prefs.edit().putString(KEY_ATTEMPTS, attemptsArray.toString()).apply()
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
