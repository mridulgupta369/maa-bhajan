package com.maa.bhajan

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Re-opens the app automatically after the phone restarts, so Grandma never
 * has to find and tap the icon again. Needs MIUI "Autostart" enabled for the
 * app (see the setup guide).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED || action == "android.intent.action.QUICKBOOT_POWERON") {
            // Re-arm all scheduled aarti alarms (they don't survive a reboot on their own).
            try { AartiScheduler.armAll(context) } catch (e: Exception) {}
            val launch = Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try { context.startActivity(launch) } catch (e: Exception) {}
        }
    }
}
