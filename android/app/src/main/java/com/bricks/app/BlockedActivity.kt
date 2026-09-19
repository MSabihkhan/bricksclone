package com.bricks.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.lang.ref.WeakReference

class BlockedActivity : Activity() {

    companion object {
        const val EXTRA_LABEL = "blocked_label"
        const val EXTRA_STRICT = "blocked_strict"

        @Volatile
        var isShowing = false

        private var activeActivity = WeakReference<BlockedActivity>(null)

        fun dismissAfterUnlock() {
            activeActivity.get()?.runOnUiThread {
                activeActivity.get()?.let { activity ->
                    activity.unlocking = true
                    activity.finish()
                }
            }
        }
    }

    private var subtitleView: TextView? = null
    private var leavingForHome = false
    private var unlocking = false
    private var backCallback: OnBackInvokedCallback? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        isShowing = true
        activeActivity = WeakReference(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backCallback = OnBackInvokedCallback { leaveToHome() }.also { callback ->
                onBackInvokedDispatcher.registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    callback
                )
            }
        }

        window.statusBarColor = Color.parseColor("#000000")
        window.navigationBarColor = Color.parseColor("#000000")

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.BLACK)
            setPadding(dp(24), dp(44), dp(24), dp(32))
        }

        val brand = TextView(this).apply {
            text = "BRICKS  ·  FOCUS"
            textSize = 11f
            setTextColor(Color.parseColor("#8E8E93"))
            letterSpacing = 0.16f
            gravity = Gravity.CENTER
        }
        layout.addView(brand, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            bottomMargin = dp(30)
        })

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(30), dp(24), dp(26))
            background = roundedBackground("#1C1C1E", 30f, "#303034")
            elevation = dp(12).toFloat()
        }

        val iconWell = LinearLayout(this).apply {
            gravity = Gravity.CENTER
            background = roundedBackground("#2C2C2E", 20f)
        }
        val lockIcon = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_lock_lock)
            setColorFilter(Color.WHITE)
            contentDescription = "Focus locked"
            setPadding(dp(17), dp(17), dp(17), dp(17))
        }
        iconWell.addView(lockIcon, LinearLayout.LayoutParams(dp(64), dp(64)))
        card.addView(iconWell, LinearLayout.LayoutParams(dp(72), dp(72)).apply { bottomMargin = dp(26) })

        val eyebrow = TextView(this).apply {
            text = "FOCUS IN PROGRESS"
            textSize = 11f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.parseColor("#64D2FF"))
            letterSpacing = 0.14f
            gravity = Gravity.CENTER
        }
        card.addView(eyebrow)

        val title = TextView(this).apply {
            text = "Stay with it."
            textSize = 34f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            letterSpacing = -0.025f
            gravity = Gravity.CENTER
            setPadding(0, dp(10), 0, dp(12))
        }
        card.addView(title)

        val subtitle = TextView(this).apply {
            textSize = 16f
            setTextColor(Color.parseColor("#AEAEB2"))
            gravity = Gravity.CENTER
            setLineSpacing(0f, 1.15f)
            setPadding(dp(4), 0, dp(4), dp(26))
        }
        subtitleView = subtitle
        card.addView(subtitle)

        val state = StateStore.load()
        val elapsedMin = state?.let { ((System.currentTimeMillis() / 1000 - it.startedAt).coerceAtLeast(0) / 60) } ?: 0
        val stats = TextView(this).apply {
            val attempts = state?.blockedCount ?: 0
            text = "$elapsedMin min focused   ·   $attempts blocked"
            textSize = 14f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.parseColor("#F2F2F7"))
            gravity = Gravity.CENTER
            setPadding(dp(12), dp(14), dp(12), dp(14))
            background = roundedBackground("#28282B", 14f)
        }
        card.addView(stats, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            bottomMargin = dp(24)
        })

        val button = Button(this).apply {
            text = "Return to Home"
            background = roundedBackground("#F5F5F7", 16f)
            setTextColor(Color.parseColor("#111113"))
            setAllCaps(false)
            textSize = 16f
            setTypeface(typeface, Typeface.BOLD)
            elevation = 0f
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56))
            setOnClickListener { leaveToHome() }
        }
        card.addView(button)

        val hint = TextView(this).apply {
            text = "Tap the same Brick to finish focus"
            textSize = 14f
            setTextColor(Color.parseColor("#8E8E93"))
            gravity = Gravity.CENTER
            setPadding(0, dp(22), 0, 0)
        }
        card.addView(hint)

        layout.addView(card, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        val scroll = ScrollView(this).apply {
            isFillViewport = true
            overScrollMode = View.OVER_SCROLL_NEVER
            addView(layout)
        }
        setContentView(scroll)
        applyIntent(intent)
        card.alpha = 0f
        card.translationY = dp(18).toFloat()
        card.animate().alpha(1f).translationY(0f).setDuration(280).start()
    }

    override fun onNewIntent(newIntent: Intent?) {
        super.onNewIntent(newIntent)
        newIntent?.let {
            setIntent(it)
            applyIntent(it)
        }
    }

    private fun applyIntent(source: Intent?) {
        val label = source?.getStringExtra(EXTRA_LABEL)
        subtitleView?.text = if (label.isNullOrBlank()) {
            "This app can wait. Your focus session is still active."
        } else {
            "$label can wait. Your focus session is still active."
        }
    }

    override fun onResume() {
        super.onResume()
        isShowing = true
        activeActivity = WeakReference(this)
    }

    override fun onPause() {
        super.onPause()
    }

    override fun onStop() {
        super.onStop()
        isShowing = false
        if (activeActivity.get() === this) activeActivity.clear()

        // If Android backgrounds or finishes this screen without invoking the legacy
        // Back callback, never reveal the blocked activity underneath it.
        if (!leavingForHome && !unlocking && !isChangingConfigurations && StateStore.load() != null) {
            leaveToHome()
        }
    }

    override fun onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backCallback?.let { onBackInvokedDispatcher.unregisterOnBackInvokedCallback(it) }
        }
        if (activeActivity.get() === this) activeActivity.clear()
        isShowing = false
        super.onDestroy()
    }

    /**
     * Finishing alone would drop the user straight back into the blocked app, which then
     * re-triggers the block — an infinite bounce. Send them to the launcher instead.
     */
    private fun leaveToHome() {
        if (leavingForHome) return
        leavingForHome = true
        val home = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        try {
            startActivity(home)
        } catch (e: Exception) {
            // If there is no resolvable launcher, closing is the best we can do.
        }
        finish()
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        leaveToHome()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun roundedBackground(fill: String, radiusDp: Float, stroke: String? = null): GradientDrawable =
        GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.parseColor(fill))
            cornerRadius = dp(radiusDp.toInt()).toFloat()
            if (stroke != null) setStroke(dp(1), Color.parseColor(stroke))
        }
}
