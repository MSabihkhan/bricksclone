package com.bricks.app

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class BlockedActivity : Activity() {

    companion object {
        var isShowing = false
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        isShowing = true

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0F1115"))
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
            setPadding(0, 32, 0, 16)
        }
        layout.addView(title)

        val subtitle = TextView(this).apply {
            text = "Distraction blocked"
            textSize = 16f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 64)
        }
        layout.addView(subtitle)

        val button = Button(this).apply {
            text = "OK, back to focus"
            setBackgroundColor(Color.parseColor("#E82127"))
            setTextColor(Color.WHITE)
            setOnClickListener { finish() }
        }
        layout.addView(button)

        setContentView(layout)
    }

    override fun onDestroy() {
        super.onDestroy()
        isShowing = false
    }

    override fun onBackPressed() {
        // Do nothing to prevent escaping
    }
}
