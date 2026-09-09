package com.bricks.app

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

class BricksBlockingModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BricksBlocking"

    init {
        StateStore.init(reactContext)
        reactContextRef = WeakReference(reactContext)
    }

    @ReactMethod
    fun startBlocking(sessionId: Double, blockedPackages: ReadableArray, strict: Boolean, startedAt: Double, plannedEndTime: Double?, promise: Promise) {
        try {
            val packages = mutableListOf<String>()
            for (i in 0 until blockedPackages.size()) {
                packages.add(blockedPackages.getString(i)!!)
            }
            val state = BlockingState(
                sessionId = sessionId.toLong(),
                blockedPackages = packages,
                strict = strict,
                startedAt = startedAt.toLong(),
                plannedEndTime = plannedEndTime?.toLong()
            )
            StateStore.save(state)
            BlockGuard.reset()

            val intent = Intent(reactContext, FocusBlockingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            StateStore.save(null)
            promise.reject(e)
        }
    }

    @ReactMethod
    fun stopBlocking(promise: Promise) {
        try {
            // Clear the state first: the polling loop reads it every second and shuts
            // itself down once it is gone, so a race cannot resurrect the block screen.
            StateStore.save(null)
            BlockGuard.reset()
            val intent = Intent(reactContext, FocusBlockingService::class.java)
            reactContext.stopService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun isBlockingActive(promise: Promise) {
        promise.resolve(StateStore.load() != null)
    }

    @ReactMethod
    fun getActiveBlocking(promise: Promise) {
        val state = StateStore.load()
        if (state == null) {
            promise.resolve(null)
        } else {
            val map = Arguments.createMap()
            map.putDouble("sessionId", state.sessionId.toDouble())
            val array = Arguments.createArray()
            state.blockedPackages.forEach { array.pushString(it) }
            map.putArray("blockedPackages", array)
            map.putBoolean("strict", state.strict)
                map.putDouble("startedAt", state.startedAt.toDouble())
                if (state.plannedEndTime != null) map.putDouble("plannedEndTime", state.plannedEndTime.toDouble()) else map.putNull("plannedEndTime")
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun hasUsageAccess(promise: Promise) {
        try {
            val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.packageName)
            } else {
                appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.packageName)
            }
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun requestUsageAccess(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try {
            val enabledServices = Settings.Secure.getString(reactContext.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
            promise.resolve(enabledServices?.contains(reactContext.packageName + "/" + BlockingAccessibilityService::class.java.name) == true)
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun requestAccessibility(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun getForegroundPackage(promise: Promise) {
        try {
            val usageStatsManager = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
            val now = System.currentTimeMillis()
            val stats = usageStatsManager.queryUsageStats(android.app.usage.UsageStatsManager.INTERVAL_BEST, now - 5000, now)
            if (stats != null && stats.isNotEmpty()) {
                val recentStat = stats.maxByOrNull { it.lastTimeUsed }
                promise.resolve(recentStat?.packageName)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun getPendingBlockedAttempts(promise: Promise) {
        try {
            val attempts = StateStore.drainAttempts()
            val array = Arguments.createArray()
            attempts.forEach { attempt ->
                val map = Arguments.createMap()
                map.putDouble("sessionId", attempt.sessionId.toDouble())
                map.putString("packageName", attempt.packageName)
                map.putString("label", attempt.label)
                map.putDouble("createdAt", attempt.createdAt.toDouble())
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun getManufacturer(promise: Promise) {
        promise.resolve(Build.MANUFACTURER)
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            promise.resolve(Settings.canDrawOverlays(reactContext))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * "Display over other apps" is the second exemption (besides an enabled accessibility
     * service) that lets the block screen launch from the background on Android 10+.
     */
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                android.net.Uri.parse("package:" + reactContext.packageName)
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            intent.data = android.net.Uri.parse("package:" + reactContext.packageName)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            try {
                val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(fallback)
                promise.resolve(null)
            } catch (e2: Exception) {
                promise.reject(e2)
            }
        }
    }

    @ReactMethod
    fun hasIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openOemSettings(oem: String, screen: String, promise: Promise) {
        try {
            var intent: Intent? = Intent()
            intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            if (oem == "xiaomi" || oem == "redmi" || oem == "poco") {
                if (screen == "autostart") {
                    intent?.action = "miui.intent.action.OP_AUTO_START"
                    intent?.setPackage("com.miui.securitycenter")
                } else if (screen == "battery") {
                    intent?.action = "miui.intent.action.OP_BATTERY_SAVER"
                    intent?.setPackage("com.miui.securitycenter")
                }
            } else if (oem == "oppo" || oem == "realme") {
                if (screen == "autostart") {
                    intent?.setClassName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")
                } else if (screen == "battery") {
                    intent?.setClassName("com.oplus.safe", "com.oplus.safe.view.manage.BatteryOptimizationActivity")
                }
            } else if (oem == "vivo") {
                if (screen == "autostart") {
                    intent?.setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
                } else if (screen == "battery") {
                    intent?.setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.PurgeManagerActivity")
                }
            } else if (oem == "samsung") {
                if (screen == "battery") {
                    intent = reactContext.packageManager.getLaunchIntentForPackage("com.samsung.android.lool")
                    intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                } else {
                    intent = null
                }
            } else {
                intent = null
            }

            var resolved = false
            if (intent != null && intent.resolveActivity(reactContext.packageManager) != null) {
                reactContext.startActivity(intent)
                resolved = true
            }

            if (!resolved) {
                val fallbackIntent = Intent(if (screen == "autostart") Settings.ACTION_SETTINGS else Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(fallbackIntent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            try {
                val fallbackIntent = Intent(if (screen == "autostart") Settings.ACTION_SETTINGS else Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(fallbackIntent)
            } catch (e2: Exception) {
                // Ignore
            }
            promise.resolve(null)
        }
    }
    
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = Intent(Intent.ACTION_MAIN, null)
            intent.addCategory(Intent.CATEGORY_LAUNCHER)
            val activities = pm.queryIntentActivities(intent, 0)
            
            val launcherPackages = activities.map { it.activityInfo.packageName }.toSet()
            
            val apps = pm.getInstalledApplications(android.content.pm.PackageManager.GET_META_DATA)
            val array = Arguments.createArray()
            
            for (ai in apps) {
                if (ai.packageName == reactContext.packageName) continue
                if (!launcherPackages.contains(ai.packageName)) continue
                
                val map = Arguments.createMap()
                map.putString("packageName", ai.packageName)
                val label = pm.getApplicationLabel(ai).toString()
                map.putString("label", if (label.isNotEmpty()) label else ai.packageName)
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject(e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    companion object {
        var reactContextRef: WeakReference<ReactApplicationContext>? = null

        fun emitAttempt(attempt: Attempt) {
            val context = reactContextRef?.get() ?: return
            val map = Arguments.createMap()
            map.putString("packageName", attempt.packageName)
            map.putString("label", attempt.label)
            map.putDouble("createdAt", attempt.createdAt.toDouble())
            try {
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("BlockedAttempt", map)
            } catch (e: Exception) {
                // Ignore if JS not ready
            }
        }
    }
}
