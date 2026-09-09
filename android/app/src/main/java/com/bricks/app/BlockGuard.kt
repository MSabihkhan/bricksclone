package com.bricks.app

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager

/**
 * Shared decision logic for "the user just brought a blocked app to the front".
 *
 * Two independent detectors feed into this: the accessibility service (fast, event driven)
 * and the foreground service's usage-stats poll (fallback, ~2s). Both can fire for the same
 * switch, so this object de-duplicates by package within a short window.
 */
object BlockGuard {

    private const val REPEAT_WINDOW_MS = 3000L

    @Volatile
    private var lastPackage: String? = null

    @Volatile
    private var lastAtMs = 0L

    fun handleForegroundPackage(context: Context, pkg: String) {
        val state = StateStore.load() ?: return
        if (pkg !in state.blockedPackages) return
        if (pkg == context.packageName) return
        if (pkg == "com.android.systemui") return
        if (pkg == launcherPackageName(context)) return

        val now = System.currentTimeMillis()
        synchronized(this) {
            if (pkg == lastPackage && now - lastAtMs < REPEAT_WINDOW_MS) return
            lastPackage = pkg
            lastAtMs = now
        }
        if (BlockedActivity.isShowing) return

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
        }
        context.startActivity(intent)
    }

    /** Called when a session ends so the next session starts with a clean slate. */
    fun reset() {
        synchronized(this) {
            lastPackage = null
            lastAtMs = 0L
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
