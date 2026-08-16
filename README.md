# 🙏 Maa ke Bhajan — remote-controlled bhajan player

A tiny **web app** for your grandmother's Poco F1. She opens one icon, taps one
big button, and bhajans play. **You** control — from your own phone or laptop —
which buttons appear on her screen and can **play any song/video/radio on her
phone live**, from anywhere.

- **Auto-updates silently** — it's a website. Push to your repo → her app shows the new version on next open. No app store, no reinstalling.
- **You decide her screen** — add/remove/reorder the big tiles from a private control panel.
- **Play now, remotely** — push a YouTube video, playlist, or radio stream to her phone instantly.
- **Content** — YouTube, YouTube Music, internet radio, or any link.

> **Important honest note about "zero taps":** Web browsers refuse to start sound
> with *no* user tap (an anti-spam rule nobody can bypass). So her flow is:
> open app → **one** tap on the big "▶ Start" → after that, *you* can switch what
> plays on her phone remotely with **no further taps from her**. That one tap is
> the floor for any web app. (If you ever want true zero-tap, that needs a native
> app or a full remote-control tool like RustDesk — ask and I'll add it.)

---

## What each file is

| File | What it does |
|------|--------------|
| `index.html`, `app.js` | **Grandma's player** (the big buttons) |
| `control.html`, `control.js` | **Your control panel** (password-protected) |
| `firebase-config.js` | Where you paste your Firebase keys + set the control password |
| `config.json` | Fallback buttons (used before Firebase is set up) |
| `styles.css`, `icon.svg`, `manifest.json`, `sw.js` | Looks, app icon, offline + auto-update |
| `database.rules.json` | Security rules to paste into Firebase |

---

## Setup — three parts

### 1. Put it online (GitHub Pages — free)

1. Create a **GitHub repo** and upload all these files (or push this folder).
2. Repo → **Settings → Pages** → Source: **Deploy from branch** → `main` / root → Save.
3. After ~1 minute your app is live at:
   `https://<your-username>.github.io/<repo-name>/`

That URL is **the app**. Editing files in the repo = updating her app automatically.

> ✅ At this point it already works in **LOCAL MODE** — open the URL, you'll see the
> buttons from `config.json`. Live remote control comes next.

### 2. Firebase — the "remote control brain" (free, ~10 min)

1. Go to <https://console.firebase.google.com> → **Add project** (any name).
2. In the project, left menu → **Build → Realtime Database → Create Database**
   → choose a location → start in **locked mode**.
3. Open the **Rules** tab, paste the contents of `database.rules.json`, **Publish**.
4. Left menu → **Build → Authentication → Get started → Sign-in method →
   Anonymous → Enable**. (This is how the app quietly signs in — no login for Grandma.)
5. Project **⚙ Settings → General →** scroll to **Your apps → Web app (`</>`)** →
   register an app → copy the `firebaseConfig` values.
6. Paste them into **`firebase-config.js`**, and set your own **`CONTROL_PASSWORD`**.
7. Commit/push. Done — live control is now on.

### 3. Install on her phone (with your on-call helper)

You have **two ways** to install. The **native app is recommended** — it removes
the one-tap requirement (bhajans and scheduled aarti auto-play with *zero* taps)
and survives MIUI better.

#### Option A — Native app (recommended) 📲
1. After you push to GitHub, GitHub Actions builds the APK automatically. Get the
   permanent download link (see **Native app** section below):
   `https://github.com/<you>/<repo>/releases/latest/download/maa-bhajan.apk`
2. Send that link to the helper. On the Poco F1: open it → **Download** → tap the
   file → allow **"Install unknown apps"** for the browser → **Install**.
3. Open **Maa ke Bhajan** (ॐ diya icon). It loads straight into the buttons.

#### Option B — Web shortcut (no APK) 🌐
1. Open **Chrome**, go to your GitHub Pages URL.
2. Chrome menu (⋮) → **Add to Home screen** → Add. Now there's an icon.
3. Open it once. Tap the big **▶ Start**. A bhajan should play. (Web can't skip
   that first tap — that's why Option A exists.)
4. **Keep it alive on MIUI (important — MIUI kills background apps):**
   - Settings → **Apps → Manage apps → Chrome** (and the added shortcut) →
     **Battery saver → No restrictions**.
   - Settings → **Battery → App battery saver → Chrome → No restrictions**.
   - In Recent-apps view, **lock** the app (pull it down / tap the lock icon) so
     MIUI doesn't clear it.
   - Settings → **Display → Sleep** → set a long time (the app also keeps the
     screen awake while playing).

That's it. From now on you use **`…github.io/<repo>/control.html`** on your own
device to run everything.

---

## How you use it day-to-day

Open `control.html`, enter your password. You can:

- **See if her phone is online** and what's playing.
- **Play now** — tap any existing button to fire it on her phone, or paste a
  one-off link and hit "▶ Play this now". Also ⏸️ Pause / ⏹️ Stop her phone.
- **Edit her screen** — add a button (label in Hindi, emoji, colour, and a link),
  drag ☰ to reorder, ✏️ edit, 🗑️ delete. Her screen updates **instantly**.

### What links to paste
- **YouTube video:** the normal share link, e.g. `https://youtu.be/XXXX` — type **YouTube video**.
- **YouTube / YouTube Music playlist:** the playlist link containing `list=...` — type **YouTube playlist** (plays non-stop).
- **Radio / audio stream:** a direct stream URL ending in `.mp3`, `.aac`, or `.m3u8` — type **Radio**.
- **Anything else:** type **Other link** (opens in a new tab).

> ℹ️ YouTube Music *app* links don't embed; use the **youtube.com** version of the
> same song/playlist and it plays inside the app.

---

## Auto-update (what you asked for)

- **App itself:** push any change to the repo → GitHub Pages redeploys → the
  service worker fetches the new version → her app runs the new features next
  time it's opened. **Silent, no prompts.** (True on any normal phone — because
  it's a web app, not an installed APK. Silent updates of a *native* APK are the
  thing Android blocks; a web app sidesteps that entirely.)
- **Content/buttons:** change them from the control panel → her screen updates
  **live**, no push, no reload.

---

## Security notes (please read)

- The control password only gates the control **screen**. Real protection comes
  from the Firebase rules + keeping your repo/config private-ish.
- Anonymous auth means anyone who has **both** your Firebase config **and** knows
  the app exists could technically read/write the data. For a family bhajan app
  this is a low risk. If you want it tighter, tell me and I'll switch it to a
  single Google-login gate on the control panel.
- This app is for helping a family member who benefits from it — keep it that way.

---

## Native app (the downloadable APK)

The `android/` folder is a tiny native wrapper around this web app. You don't need
Android Studio — **GitHub Actions compiles it for you** (`.github/workflows/build-apk.yml`):

1. Push this repo to GitHub (done in step 1).
2. The workflow runs automatically and creates a **release tagged `latest`** with
   the file **`maa-bhajan.apk`** attached.
3. Permanent download link to share with the helper:
   `https://github.com/<you>/<repo>/releases/latest/download/maa-bhajan.apk`
4. Watch/re-run the build under the repo's **Actions** tab. To rebuild manually:
   Actions → *Build Android APK* → **Run workflow**.

Why native: it sets the WebView to allow audio **without a tap**, keeps the screen
on, runs a foreground service, and auto-starts on boot — so scheduled aarti and your
remote "play now" work even if she never touches the phone. It still loads the web
content live, so **your repo edits still auto-update it** with no reinstall. Only rare
changes to the native shell itself need a fresh APK (one tap, from the same link).

> If your Pages URL isn't `https://<you>.github.io/<repo>/`, update `app_url` in
> `android/app/src/main/res/values/strings.xml` and push.

## Scheduled aarti ⏰

In the control panel, the **"Scheduled aarti / bhajans"** card lets you set times
(e.g. 07:00 and 19:00), pick days (empty = daily), and choose what plays. It fires
automatically on her phone.

- **Native app:** the schedule is handed to Android's **alarm system**, which wakes
  the phone and plays the aarti **even if the screen has been off for hours or the
  app was closed** — then shows a full-screen "🪔 Aarti" and starts playing, zero taps.
  Alarms re-arm themselves after each fire and after a reboot.
- **Web version:** the app must be open and she must have tapped ▶ once; the in-page
  timer then triggers it.

> For the native alarms to survive MIUI, keep **Autostart ON** and **battery = No
> restrictions** (same steps as the install checklist). On Android 12+ phones you'd
> also allow "Alarms & reminders" — but her Poco F1 (Android ≤11) needs nothing extra.

## Full phone control 🖥️

For anything beyond media (settings, WhatsApp, fixing Wi-Fi…), see
**[RUSTDESK-SETUP.md](./RUSTDESK-SETUP.md)** — set up RustDesk once and control her
entire screen remotely.

## Want more later? (easy add-ons)
- **Bigger "SOS / Call me" button** on her screen.
- **Volume control** from your panel.

Just ask and I'll wire it in.
