package com.maa.bhajan

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * Thin native shell around the web app hosted on GitHub Pages.
 * - Keeps the screen on; allows media auto-play without a tap.
 * - Exposes AndroidBridge.setSchedules() so the web app can hand schedules to
 *   the native alarm system (fires even with the screen off).
 * - Can be launched by an alarm with play_* extras to play a specific aarti.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private var pageLoaded = false
    private var pendingPlay: Triple<String, String, String>? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Show over the lock screen + turn the screen on when an alarm launches us.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = WebView(this)
        web.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false          // autoplay, no tap
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
        }
        web.addJavascriptInterface(Bridge(), "AndroidBridge")
        web.webChromeClient = WebChromeClient()
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                pageLoaded = true
                pendingPlay?.let { runPlay(it.first, it.second, it.third); pendingPlay = null }
            }
        }

        if (savedInstanceState == null) {
            web.loadUrl(getString(R.string.app_url))
        } else {
            web.restoreState(savedInstanceState)
        }

        val svc = Intent(this, KeepAliveService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc) else startService(svc)

        // Re-arm alarms from anything already persisted (e.g. after a cold start).
        AartiScheduler.armAll(this)

        handlePlayIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handlePlayIntent(intent)
    }

    private fun handlePlayIntent(intent: Intent?) {
        val value = intent?.getStringExtra("play_value") ?: return
        if (value.isEmpty()) return
        val type = intent.getStringExtra("play_type") ?: ""
        val label = intent.getStringExtra("play_label") ?: "Aarti"
        if (pageLoaded) runPlay(type, value, label) else pendingPlay = Triple(type, value, label)
    }

    private fun runPlay(type: String, value: String, label: String) {
        val js = "window.__nativePlay && window.__nativePlay(${jsStr(type)},${jsStr(value)},${jsStr(label)})"
        web.evaluateJavascript(js, null)
    }

    /** Safely quote a string for injection into evaluateJavascript. */
    private fun jsStr(s: String): String {
        val sb = StringBuilder("\"")
        for (c in s) when (c) {
            '\\' -> sb.append("\\\\")
            '"' -> sb.append("\\\"")
            '\n' -> sb.append("\\n")
            '\r' -> sb.append("\\r")
            else -> sb.append(c)
        }
        sb.append("\"")
        return sb.toString()
    }

    /** Exposed to the web app as window.AndroidBridge */
    inner class Bridge {
        @JavascriptInterface
        fun setSchedules(json: String) {
            AartiScheduler.saveAndArm(applicationContext, json)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    override fun onPause() { super.onPause(); web.onPause() }
    override fun onResume() { super.onResume(); web.onResume() }
}
