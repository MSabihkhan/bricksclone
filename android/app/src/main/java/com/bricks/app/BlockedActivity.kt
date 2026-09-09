package com.bricks.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class BlockedActivity : Activity() {

    companion object {
        const val EXTRA_LABEL = "blocked_label"
        const val EXTRA_STRICT = "blocked_strict"

        @Volatile
        var isShowing = false
    }

    private var subtitleView: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0F1115"))
            setPadding(dp(32), dp(32), dp(32), dp(32))
        }

        val lockIcon = TextView(this).apply {
            text = "🔒"
            textSize = 64f
            setTextColor(Color.parseColor("#E82127"))
            gravity = Gravity.CENTER
        }
        layout.addView(lockIcon)

        val title = TextView(this).apply {
            text = "FOCUS LOCKED"
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            letterSpacing = 0.1f
            gravity = Gravity.CENTER
            setPadding(0, dp(24), 0, dp(12))
        }
        layout.addView(title)

        val subtitle = TextView(this).apply {
            textSize = 16f
            setTextColor(Color.parseColor("#8A9099"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(40))
        }
        subtitleView = subtitle
        layout.addView(subtitle)

        val button = Button(this).apply {
            text = "Back to focus"
            setBackgroundColor(Color.parseColor("#E82127"))
            setTextColor(Color.WHITE)
            setAllCaps(false)
            textSize = 16f
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56))
            setOnClickListener { leaveToHome() }
        }
        layout.addView(button)

        val hint = TextView(this).apply {
            text = "Tap your Brick to end the session."
            textSize = 13f
            setTextColor(Color.parseColor("#5A6069"))
            gravity = Gravity.CENTER
            setPadding(0, dp(18), 0, 0)
        }
        layout.addView(hint)

        setContentView(layout)
        applyIntent(intent)
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
            "This app is blocked during your focus session."
        } else {
            "$label is blocked during your focus session."
        }
    }

    override fun onResume() {
        super.onResume()
        isShowing = true
    }

    override fun onPause() {
        super.onPause()
        isShowing = false
    }

    /**
     * Finishing alone would drop the user straight back into the blocked app, which then
     * re-triggers the block — an infinite bounce. Send them to the launcher instead.
     */
    private fun leaveToHome() {
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
}
