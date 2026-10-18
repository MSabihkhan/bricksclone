package com.bricks.app

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager

/**
 * Shared decision logic for "the user just brought a blocked app to the front".
 *
 * Two independent detectors feed into this: the accessibility service (fast, event driven)
 * and the foreground service's usage-stats poll (fallback, ~2s). Both can fire for the same
 * switch, so this object de-duplicates only while an overlay launch is in flight.
 */
object BlockGuard {

    private const val LAUNCH_WINDOW_MS = 500L

    @Volatile
    private var lastLaunchAtMs = 0L

    /**
     * @param beforeLaunch runs just before the lock screen is started. The accessibility
     * service uses it to send Back, which closes a blocked app opened in a floating /
     * pop-up window — otherwise that window can stay on top of the full-screen lock.
     */
    fun handleForegroundPackage(context: Context, pkg: String, beforeLaunch: (() -> Unit)? = null) {
        val state = StateStore.load() ?: return
        if (pkg !in state.blockedPackages) return
        if (pkg == context.packageName) return
        if (pkg == "com.android.systemui") return
        if (pkg == launcherPackageName(context)) return
        if (BlockedActivity.isShowing) return

        val now = System.currentTimeMillis()
        synchronized(this) {
            if (now - lastLaunchAtMs < LAUNCH_WINDOW_MS) return
            lastLaunchAtMs = now
        }

        val label = labelFor(context, pkg)
        // Seconds, to match the unix-second timestamps the JS layer stores everywhere else.
        val ts = now / 1000
        StateStore.recordAttempt(pkg, label, ts)
        BricksBlockingModule.emitAttempt(Attempt(state.sessionId, pkg, label, ts))

        val intent = Intent(context, BlockedActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
            )
            putExtra(BlockedActivity.EXTRA_LABEL, label)
            putExtra(BlockedActivity.EXTRA_STRICT, state.strict)
            putExtra(BlockedActivity.EXTRA_PACKAGE, pkg)
        }
        beforeLaunch?.invoke()
        context.startActivity(intent)
    }

    /** Called when a session ends so the next session starts with a clean slate. */
    fun reset() {
        synchronized(this) {
            lastLaunchAtMs = 0L
        }
    }

    fun labelFor(context: Context, pkg: String): String = try {
        val ai = context.packageManager.getApplicationInfo(pkg, 0)
        context.packageManager.getApplicationLabel(ai).toString()
    } catch (e: Exception) {
        pkg
    }

    fun launcherPackageName(context: Context): String {
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val resolveInfo = context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        return resolveInfo?.activityInfo?.packageName ?: ""
    }
}
