# 🖥️ RustDesk — full remote control of her whole phone

The bhajan app plays media. **RustDesk** lets you do *everything else* — see her
screen live and tap/type on it from your own phone or laptop, anywhere:
fix a setting, open WhatsApp, adjust volume, reconnect Wi-Fi, whatever. It's
free and open-source.

> Use this for genuine caregiving on a device she can't operate herself. Set it
> up with her knowledge and keep access private.

---

## What you'll end up with
- Her phone runs RustDesk with a **fixed ID** and a **permanent password** you set.
- From your device you type her ID + password → you're controlling her screen.
- **Unattended**: you don't need her to tap "accept" each time.

---

## On HER phone (do this with your on-call helper)

1. **Install RustDesk**
   - Open the browser → go to **https://rustdesk.com/download** → download the
     **Android APK** (or install "RustDesk" from a store if available).
   - Install it (allow "install unknown apps" if asked).

2. **Grant the two permissions that matter**
   Open RustDesk → it will prompt for:
   - **Screen capture / recording** → Allow (this is what lets you *see* the screen).
   - **Accessibility service** → turn ON RustDesk (this is what lets you *tap/control*).
     - Path if you need it: Settings → Additional settings → **Accessibility** →
       RustDesk → Enable. (On MIUI it may be under Settings → Accessibility.)
   - Also allow **Display over other apps** if prompted.

3. **Set a permanent password (for unattended access)**
   - RustDesk → menu (☰) → **Settings → Security**.
   - Set **"Unlock with password" / Permanent password** → choose a strong password
     you'll remember. This is what you'll type from your side.
   - Enable **"Start on boot"** / **"Start service"** so it's always ready.

4. **Note her ID**
   - The big 9-digit **ID** on RustDesk's main screen — write it down. It stays the same.

5. **Stop MIUI from killing it** (critical on Poco F1)
   - Settings → **Apps → Manage apps → RustDesk**:
     - **Autostart** → ON
     - **Battery saver → No restrictions**
   - In Recent apps, **lock** RustDesk so it isn't cleared.
   - Settings → **Battery → App battery saver → RustDesk → No restrictions**.

---

## On YOUR phone / laptop

1. Install RustDesk from **https://rustdesk.com/download** (Windows / Android / Mac / iOS).
2. Open it → in **"Control Remote Desktop"**, type her **ID** → **Connect**.
3. Enter the **permanent password** you set → you're now seeing and controlling her phone.

That's it. You can now drive her entire phone remotely, on top of the bhajan app.

---

## Tips & troubleshooting
- **Can't connect?** Make sure her phone is on Wi-Fi/data and RustDesk's service is
  running (green status). MIUI autostart + battery settings above are the usual fix.
- **Black screen but you can't tap?** The Accessibility service isn't enabled — redo step 2.
- **Want zero setup per session?** The permanent password + "start on boot" gives you
  unattended access; you never need her to accept.
- **Privacy:** Only you have her ID + password. Keep them private. If you ever want to
  revoke access, uninstall RustDesk from her phone or change the password.
- **Self-hosting (optional, advanced):** RustDesk can run through its public relay
  (default, easiest) or your own server for extra privacy. The public relay is fine
  for family use.

---

### Which tool for which job?
| Want to… | Use |
|---|---|
| Play bhajans/aarti, playlists, radio, scheduled aarti | **The Bhajan app** (this repo) |
| Change any setting, open any app, fix anything on her phone | **RustDesk** |
