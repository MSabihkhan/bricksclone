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
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.lang.ref.WeakReference

class BlockedActivity : Activity() {

    companion object {
        const val EXTRA_LABEL = "blocked_label"
        const val EXTRA_STRICT = "blocked_strict"
        const val EXTRA_PACKAGE = "blocked_package"

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
    private var eyebrowView: TextView? = null
    private var intentionView: TextView? = null
    private var intentionContainer: View? = null
    private var focusedPill: TextView? = null
    private var triesPill: TextView? = null
    private var hintView: TextView? = null
    private var leavingForHome = false
    private var unlocking = false
    private var backCallback: OnBackInvokedCallback? = null

    // Fasla Redesign v2, "Not right now".
    private val bg = Color.parseColor("#0B0B0D")
    private val ink = Color.parseColor("#F5F5F2")
    private val faint = Color.parseColor("#85858C")

    private fun font(name: String): Typeface? = runCatching { Typeface.createFromAsset(assets, "fonts/$name.ttf") }.getOrNull()

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

        window.statusBarColor = Color.parseColor("#160B0C")
        window.navigationBarColor = bg

        val display = font("Archivo-Black")
        val displayBold = font("Archivo-ExtraBold")
        val body = font("Geist-Regular")
        val bodySemi = font("Geist-SemiBold")
        val mono = font("JetBrainsMono-Regular")

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(40), dp(24), dp(28))
        }

        eyebrowView = TextView(this).apply {
            textSize = 11f
            letterSpacing = 0.2f
            setTextColor(Color.parseColor("#FF8A8D"))
            typeface = mono
            gravity = Gravity.CENTER
        }
        content.addView(eyebrowView, matchWrap())

        // The printed key, tilted -6°; with the card character on, it has its face.
        StateStore.init(applicationContext)
        val card = BrickCardView(this, showFace = StateStore.isPersonaEnabled()).apply {
            elevation = dp(14).toFloat()
            contentDescription = "Your fasla key"
        }
        content.addView(card, LinearLayout.LayoutParams(dp(264), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(44)
            gravity = Gravity.CENTER_HORIZONTAL
        })
        card.post {
            card.pivotX = card.width / 2f
            card.pivotY = card.height / 2f
            card.scaleX = 0.92f
            card.scaleY = 0.92f
            // Android's "Remove animations" setting makes this instant.
            card.animate().rotation(-6f).scaleX(1f).scaleY(1f).setDuration(500).start()
        }

        content.addView(TextView(this).apply {
            text = "Not right now."
            textSize = 44f
            typeface = display
            letterSpacing = -0.035f
            setTextColor(ink)
            gravity = Gravity.CENTER
            includeFontPadding = false
        }, matchWrap().apply { topMargin = dp(56) })

        subtitleView = TextView(this).apply {
            textSize = 17f
            typeface = body
            setTextColor(Color.parseColor("#B4B4BA"))
            gravity = Gravity.CENTER
        }
        content.addView(subtitleView, matchWrap().apply { topMargin = dp(10) })

        val pills = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER }
        fun pill(): TextView = TextView(this).apply {
            textSize = 12f
            typeface = mono
            setTextColor(Color.parseColor("#D8D8DC"))
            gravity = Gravity.CENTER
            setPadding(dp(14), 0, dp(14), 0)
            background = rounded("#0FFFFFFF", 17f)
        }
        focusedPill = pill()
        triesPill = pill()
        pills.addView(focusedPill, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(34)).apply { marginEnd = dp(4) })
        pills.addView(triesPill, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(34)).apply { marginStart = dp(4) })
        content.addView(pills, matchWrap().apply { topMargin = dp(26) })

        // Pushes the intention and the button to the bottom on tall screens.
        content.addView(View(this), LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f).apply { topMargin = dp(28) })

        // The user's own words are the strongest reason to put the phone down.
        val intentionBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(16), dp(20), dp(16))
            background = rounded("#990B0B0D", 22f, "#2A1A1B")
        }
        intentionBox.addView(TextView(this).apply {
            text = "YOU’RE HERE TO"
            textSize = 11f
            letterSpacing = 0.14f
            setTextColor(Color.parseColor("#FF5A5F"))
            typeface = mono
        })
        intentionView = TextView(this).apply {
            textSize = 19f
            letterSpacing = -0.01f
            setTextColor(ink)
            typeface = displayBold
            setPadding(0, dp(4), 0, 0)
        }
        intentionBox.addView(intentionView)
        intentionContainer = intentionBox
        content.addView(intentionBox, matchWrap())

        // Back into fasla's focus screen, and how the session really ends.
        content.addView(Button(this).apply {
            text = "Back to focus"
            isAllCaps = false
            textSize = 16f
            typeface = bodySemi
            setTextColor(bg)
            background = rounded("#F5F5F2", 29f)
            stateListAnimator = null
            elevation = 0f
            setOnClickListener { backToFocus() }
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(58)).apply { topMargin = dp(12) })
        hintView = TextView(this).apply {
            textSize = 13f
            setTextColor(faint)
            typeface = body
            gravity = Gravity.CENTER
        }
        content.addView(hintView, matchWrap().apply { topMargin = dp(14) })

        val scroll = ScrollView(this).apply {
            isFillViewport = true
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            addView(content)
        }

        // radial-gradient(80% 50% at 50% 30%, #3A1214, #160B0C 55%, #0B0B0D)
        val glow = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(
            Color.parseColor("#3A1214"), Color.parseColor("#160B0C"), bg,
        )).apply {
            gradientType = GradientDrawable.RADIAL_GRADIENT
            setGradientCenter(0.5f, 0.3f)
            gradientRadius = resources.displayMetrics.heightPixels * 0.5f
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = glow
            addView(scroll, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }
        setContentView(root)
        applyIntent(intent)
        content.alpha = 0f
        content.animate().alpha(1f).setDuration(300).start()
    }

    override fun onNewIntent(newIntent: Intent?) {
        super.onNewIntent(newIntent)
        newIntent?.let {
            setIntent(it)
            applyIntent(it)
        }
    }

    /** Refreshed on every launch: singleTask reuses this activity across blocked opens. */
    private fun applyIntent(source: Intent?) {
        val label = source?.getStringExtra(EXTRA_LABEL)
        val pkg = source?.getStringExtra(EXTRA_PACKAGE)
        val state = StateStore.load()
        val appName = label?.takeIf { it.isNotBlank() } ?: "This app"

        subtitleView?.text = "$appName can wait."
        eyebrowView?.text = listOfNotNull(state?.ritual?.uppercase(), "FOCUS IN PROGRESS").joinToString(" · ")

        val intention = state?.intention
        intentionContainer?.visibility = if (intention.isNullOrBlank()) View.GONE else View.VISIBLE
        intentionView?.text = intention ?: ""

        val now = System.currentTimeMillis() / 1000
        val focusedMin = state?.let { ((now - it.startedAt).coerceAtLeast(0)) / 60 } ?: 0
        focusedPill?.text = "$focusedMin min focused"
        val tries = (pkg?.let { state?.attemptCounts?.get(it) } ?: 0).coerceAtLeast(1)
        triesPill?.text = "${ordinal(tries)} try this session"

        val key = state?.keyName?.takeIf { it.isNotBlank() } ?: "the same card"
        hintView?.text = "Tap $key to end the session"
    }

    private fun ordinal(n: Int): String {
        val suffix = if (n % 100 in 11..13) "th" else when (n % 10) { 1 -> "st"; 2 -> "nd"; 3 -> "rd"; else -> "th" }
        return "$n$suffix"
    }

    /** Open fasla on its focus screen. The blocked app stays underneath, behind fasla. */
    private fun backToFocus() {
        if (leavingForHome) return
        leavingForHome = true
        val open = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        try {
            startActivity(open)
        } catch (e: Exception) {
            leavingForHome = false
            leaveToHome()
            return
        }
        finish()
    }

    private fun matchWrap() = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)

    override fun onResume() {
        super.onResume()
        // In split-screen or a pop-up window the blocked app would stay usable beside the
        // lock, so treat that like leaving.
        if (isInMultiWindowMode && StateStore.load() != null) {
            leaveToHome()
            return
        }
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

    private fun rounded(fill: String, radiusDp: Float, stroke: String? = null): GradientDrawable =
        GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.parseColor(fill))
            cornerRadius = dp(radiusDp.toInt()).toFloat()
            if (stroke != null) setStroke(dp(1), Color.parseColor(stroke))
        }
}
