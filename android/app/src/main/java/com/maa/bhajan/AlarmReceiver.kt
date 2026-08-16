package com.maa.bhajan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * Fires at a scheduled aarti time. Wakes the phone with a full-screen alarm
 * notification (the alarm-clock pattern), which is allowed to launch the app
 * even from the background / a locked screen. Then re-arms the next occurrence.
 */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: "aarti"
        val type = intent.getStringExtra("type") ?: ""
        val value = intent.getStringExtra("value") ?: ""
        val label = intent.getStringExtra("label") ?: "आरती"

        // Hold the CPU awake long enough to post the notification / start the UI.
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "maa:aarti")
        try { wl.acquire(20_000L) } catch (e: Exception) {}

        try {
            val launch = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("play_type", type)
                putExtra("play_value", value)
                putExtra("play_label", label)
            }
            var piFlags = PendingIntent.FLAG_UPDATE_CURRENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags = piFlags or PendingIntent.FLAG_IMMUTABLE
            val fsPi = PendingIntent.getActivity(context, 1001, launch, piFlags)

            val chId = "maa_aarti"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val ch = NotificationChannel(chId, "Aarti alarm", NotificationManager.IMPORTANCE_HIGH)
                ch.description = "Plays aarti/bhajan at the scheduled time"
                context.getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
            }
            val notif: Notification = NotificationCompat.Builder(context, chId)
                .setContentTitle("🪔 $label")
                .setContentText("आरती का समय · tap to open")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setFullScreenIntent(fsPi, true)
                .setContentIntent(fsPi)
                .build()
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .notify(id.hashCode(), notif)

            // If the app is already in the foreground, this starts it directly too.
            try { context.startActivity(launch) } catch (e: Exception) {}

            // Schedule the next occurrence of this same aarti.
            AartiScheduler.armNext(context, id)
        } finally {
            try { if (wl.isHeld) wl.release() } catch (e: Exception) {}
        }
    }
}
