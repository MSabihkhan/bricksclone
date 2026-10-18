package com.bricks.app

import android.app.Activity
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import android.widget.Toast

class NfcUnlockActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        StateStore.init(applicationContext)

        val active = StateStore.load()
        if (active == null) {
            forwardToBricks()
            return
        }

        val scannedId = readTagId(intent)
        if (!active.tagId.isNullOrBlank() && scannedId == normalizeTagId(active.tagId)) {
            FocusCompletion.complete(applicationContext, active, "nfc")
            stopService(Intent(applicationContext, FocusBlockingService::class.java))
        } else {
            Toast.makeText(this, "Use the key that started this focus session", Toast.LENGTH_SHORT).show()
        }
        finish()
        overridePendingTransition(0, 0)
    }

    private fun forwardToBricks() {
        val launchIntent = Intent(intent).apply {
            setClass(this@NfcUnlockActivity, MainActivity::class.java)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        startActivity(launchIntent)
        finish()
        overridePendingTransition(0, 0)
    }

    private fun readTagId(source: Intent): String {
        val tag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            source.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
        } else {
            @Suppress("DEPRECATION")
            source.getParcelableExtra(NfcAdapter.EXTRA_TAG) as? Tag
        }
        return tag?.id?.joinToString("") { byte -> "%02X".format(byte.toInt() and 0xFF) } ?: ""
    }

    private fun normalizeTagId(raw: String): String = raw
        .trim()
        .removePrefix("0x")
        .removePrefix("0X")
        .replace(Regex("[:.\\-\\s]"), "")
        .uppercase()
}
