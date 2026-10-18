package com.bricks.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import android.view.ViewOutlineProvider

/**
 * The printed Brick card for the native lock screen, matching the app's BrickCard component:
 * the card's own artwork, its white PVC edge, and the persona's blocked_app_opened face
 * (a sideways glance and a half-smile — a nudge, never a scold). Geometry mirrors
 * src/features/persona.ts: a 100 × 63.6 card, face drawn at 80% around (50, 20).
 */
class BrickCardView(context: Context, private val showFace: Boolean) : View(context) {

    private val art: Bitmap? = runCatching { BitmapFactory.decodeResource(resources, R.drawable.brick_card_front) }.getOrNull()
    private val artPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val edgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#E9E9E4") }
    private val fallbackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#E31E24") }
    private val inkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#0B0B0C")
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    private val clip = Path()
    private val face = Path()

    init {
        outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View, outline: Outline) {
                outline.setRoundRect(0, 0, view.width, view.height, view.width * RADIUS)
            }
        }
        clipToOutline = false
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val w = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(w, (w * ASPECT + edgeFor(w.toFloat())).toInt())
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = w * ASPECT
        val r = w * RADIUS
        val edge = edgeFor(w)

        canvas.drawRoundRect(RectF(0f, edge, w, h + edge), r, r, edgePaint)

        clip.reset()
        clip.addRoundRect(RectF(0f, 0f, w, h), r, r, Path.Direction.CW)
        canvas.save()
        canvas.clipPath(clip)
        if (art != null) canvas.drawBitmap(art, null, RectF(0f, 0f, w, h), artPaint) else canvas.drawRect(0f, 0f, w, h, fallbackPaint)
        canvas.restore()

        if (!showFace) return
        val u = w / 100f
        // Eyes glance sideways (toward the app they were pulled to).
        inkPaint.strokeWidth = 5.2f * u
        for (cx in floatArrayOf(45.2f, 61.2f)) {
            face.reset()
            face.moveTo(cx * u, 12.8f * u)
            face.quadTo(cx * u, 16.8f * u, cx * u, 20.8f * u)
            canvas.drawPath(face, inkPaint)
        }
        inkPaint.strokeWidth = 3.2f * u
        face.reset()
        face.moveTo(46.4f * u, 30.4f * u)
        face.quadTo(50f * u, 32.4f * u, 53.6f * u, 29.2f * u)
        canvas.drawPath(face, inkPaint)
    }

    private fun edgeFor(w: Float) = maxOf(1f, w * EDGE)

    companion object {
        const val ASPECT = 0.636f   // 54.10 × 85.08 mm
        const val RADIUS = 0.0373f  // 3.18 mm corners
        const val EDGE = 0.009f     // 0.76 mm white core
    }
}
