package com.maa.bhajan

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Sets exact wake-up alarms for each enabled schedule, so aarti fires even when
 * the screen is off / the app is asleep. Schedules are pushed from the web app
 * via the JS bridge and persisted, so we can also re-arm after a reboot.
 */
object AartiScheduler {
    private const val PREFS = "maa_prefs"
    private const val KEY = "schedules_json"

    /** Called from the JS bridge whenever the schedule list changes. */
    fun saveAndArm(ctx: Context, json: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
        armAll(ctx)
    }

    /** Arm alarms for every enabled schedule from the persisted list. */
    fun armAll(ctx: Context) {
        val json = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return
        val arr = try { JSONArray(json) } catch (e: Exception) { return }
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (!o.optBoolean("enabled", false)) continue
            val trigger = nextTrigger(o) ?: continue
            setExact(am, trigger, piFor(ctx, o))
        }
    }

    /** After an alarm fires, arm that schedule's NEXT occurrence. */
    fun armNext(ctx: Context, id: String) {
        val json = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return
        val arr = try { JSONArray(json) } catch (e: Exception) { return }
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (o.optString("id") != id) continue
            if (!o.optBoolean("enabled", false)) return
            val trigger = nextTrigger(o) ?: return
            val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            setExact(am, trigger, piFor(ctx, o))
            return
        }
    }

    private fun nextTrigger(o: JSONObject): Long? {
        val time = o.optString("time", "")
        val parts = time.split(":")
        val hh = parts.getOrNull(0)?.toIntOrNull() ?: return null
        val mm = parts.getOrNull(1)?.toIntOrNull() ?: return null
        val days = mutableListOf<Int>()   // 0=Sun .. 6=Sat ; empty = daily
        o.optJSONArray("days")?.let { d -> for (k in 0 until d.length()) days.add(d.optInt(k)) }

        val now = Calendar.getInstance()
        for (offset in 0..7) {
            val c = Calendar.getInstance()
            c.add(Calendar.DAY_OF_YEAR, offset)
            c.set(Calendar.HOUR_OF_DAY, hh)
            c.set(Calendar.MINUTE, mm)
            c.set(Calendar.SECOND, 0)
            c.set(Calendar.MILLISECOND, 0)
            if (c.timeInMillis <= now.timeInMillis) continue
            val webDay = c.get(Calendar.DAY_OF_WEEK) - 1  // Calendar SUNDAY=1 -> 0
            if (days.isEmpty() || days.contains(webDay)) return c.timeInMillis
        }
        return null
    }

    private fun piFor(ctx: Context, o: JSONObject): PendingIntent {
        val id = o.optString("id", "aarti")
        val i = Intent(ctx, AlarmReceiver::class.java).apply {
            action = "com.maa.bhajan.AARTI"
            putExtra("id", id)
            putExtra("type", o.optString("type"))
            putExtra("value", o.optString("value"))
            putExtra("label", o.optString("label", "आरती"))
        }
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags = flags or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(ctx, id.hashCode(), i, flags)
    }

    private fun setExact(am: AlarmManager, triggerAt: Long, pi: PendingIntent) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            }
        } catch (se: SecurityException) {
            // Android 12+ without exact-alarm permission -> best-effort inexact.
            am.set(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        }
    }
}
