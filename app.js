// ============================================================================
//  app.js  —  Grandma's PLAYER
//  - Shows big buttons (from Firebase live, or config.json fallback)
//  - One tap unlocks audio; after that YOU can play things remotely
//  - Reports status back so your control panel knows she's online
// ============================================================================
import { firebaseConfig, FAMILY_ID, isConfigured } from './firebase-config.js';

// ---- shared state ----------------------------------------------------------
let ytPlayer = null;
let ytReady = false;
let audioUnlocked = false;
let pendingCommand = null;       // command that arrived before first tap
let lastCommandTs = 0;
let currentButtons = [];
let schedules = [];              // scheduled aarti / bhajans
let wakeLock = null;
let fb = null;                   // firebase handles, if configured

const $ = (id) => document.getElementById(id);
const radio = $('radio');

// Native app loads the page with ?native=1 — there, browsers allow audio to
// start WITHOUT a tap, so we unlock immediately (true zero-tap for Grandma).
const NATIVE = new URLSearchParams(location.search).has('native');

// ---- YouTube API ready -----------------------------------------------------
function buildYtPlayer() {
  if (ytPlayer) return;
  ytPlayer = new YT.Player('yt-player', {
    height: '360', width: '640',
    playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => { ytReady = true; },
      onStateChange: (e) => {
        // reflect playing state on tiles
        if (e.data === YT.PlayerState.PLAYING) markPlayingByCurrent();
      }
    }
  });
}
// The API may load before OR after this module runs — handle both.
window.onYouTubeIframeAPIReady = buildYtPlayer;
if (window.YT && window.YT.Player) buildYtPlayer();

// ---- URL parsing -----------------------------------------------------------
function parseYouTube(url) {
  try {
    const u = new URL(url);
    const v = u.searchParams.get('v');
    const list = u.searchParams.get('list');
    if (u.hostname.includes('youtu.be')) return { videoId: u.pathname.slice(1), listId: list };
    return { videoId: v, listId: list };
  } catch { return { videoId: null, listId: null }; }
}

// ---- playback --------------------------------------------------------------
function stopAll() {
  try { radio.pause(); radio.currentTime = 0; } catch {}
  try { if (ytReady) ytPlayer.stopVideo(); } catch {}
  showYT(false);
  clearPlayingMarks();
  reportPlaying(null);
}

function play(item) {
  if (!item) return;
  // Everything below needs audio unlocked; caller ensures a tap happened.
  requestWakeLock();

  if (item.type === 'radio') {
    try { if (ytReady) ytPlayer.stopVideo(); } catch {}
    showYT(false);
    radio.src = item.value;
    radio.play().catch(err => setStatus('Radio नहीं चला — link check करें'));
  } else {
    // youtube / playlist / link(youtube) -> embed
    try { radio.pause(); } catch {}
    const { videoId, listId } = parseYouTube(item.value);
    showYT(true);
    if (!ytReady) { setStatus('Player लोड हो रहा है…'); setTimeout(()=>play(item), 700); return; }
    if (item.type === 'playlist' || listId) {
      if (listId) ytPlayer.loadPlaylist({ list: listId, listType: 'playlist' });
      else if (videoId) ytPlayer.loadVideoById(videoId);
    } else if (videoId) {
      ytPlayer.loadVideoById(videoId);
    } else {
      setStatus('Link सही नहीं है — control panel में ठीक करें');
      return;
    }
  }
  setStatus('▶ चल रहा है: ' + (item.label || ''));
  markPlaying(item.id);
  reportPlaying(item);
}

function showYT(visible) { $('yt-host').classList.toggle('visible', !!visible); }

// ---- tiles -----------------------------------------------------------------
function renderButtons(list) {
  currentButtons = Array.isArray(list) ? list : [];
  const grid = $('grid');
  grid.innerHTML = '';
  if (currentButtons.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">अभी कोई बटन नहीं — control panel से जोड़ें</p>';
    return;
  }
  currentButtons.forEach(item => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.style.background = item.color
      ? `linear-gradient(145deg, ${item.color}, ${shade(item.color,-30)})`
      : 'linear-gradient(145deg,#7c3aed,#4c1d95)';
    b.dataset.id = item.id;
    b.innerHTML =
      `<span class="emoji">${item.icon || '🎵'}</span>
       <span class="label">${escapeHtml(item.label || 'Play')}</span>
       ${item.subtitle ? `<span class="sub">${escapeHtml(item.subtitle)}</span>` : ''}`;
    b.addEventListener('click', () => {
      audioUnlocked = true; hideOverlay();
      play(item);
    });
    grid.appendChild(b);
  });
}

function markPlaying(id) {
  clearPlayingMarks();
  const el = document.querySelector(`.tile[data-id="${id}"]`);
  if (el) el.classList.add('playing');
}
function markPlayingByCurrent(){ /* placeholder for future state sync */ }
function clearPlayingMarks() {
  document.querySelectorAll('.tile.playing').forEach(e => e.classList.remove('playing'));
}

// ---- overlay & transport ---------------------------------------------------
function hideOverlay() { $('overlay').classList.add('hidden'); }
$('bigPlay').addEventListener('click', () => {
  audioUnlocked = true; hideOverlay();
  // silent unlock of audio element
  radio.play().then(()=>radio.pause()).catch(()=>{});
  if (pendingCommand) { const c = pendingCommand; pendingCommand = null; play(c); }
  else if (currentButtons[0]) play(currentButtons[0]);   // start first bhajan
});
$('btnStop').addEventListener('click', stopAll);
$('btnPause').addEventListener('click', () => {
  try { radio.pause(); } catch {}
  try { if (ytReady) ytPlayer.pauseVideo(); } catch {}
  setStatus('⏸️ रुका हुआ');
});

// ---- status text -----------------------------------------------------------
function setStatus(t) { $('statusStrip').textContent = t || ''; }

// ---- wake lock (keep screen on while playing) ------------------------------
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

// ---- helpers ---------------------------------------------------------------
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shade(hex, pct){
  try {
    const n = parseInt(hex.replace('#',''),16);
    let r=(n>>16)+pct, g=((n>>8)&255)+pct, b=(n&255)+pct;
    r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  } catch { return hex; }
}

// ============================================================================
//  NATIVE BRIDGE — the Android app calls this to play a scheduled aarti it woke
//  up for, and we push schedule changes to it so it can set OS-level alarms.
// ============================================================================
window.__nativePlay = function (type, value, label) {
  audioUnlocked = true;
  hideOverlay();
  play({ id: 'native', type, value, label, icon: '🪔' });
};
function syncSchedulesToNative() {
  try {
    if (window.AndroidBridge && typeof AndroidBridge.setSchedules === 'function') {
      AndroidBridge.setSchedules(JSON.stringify(schedules || []));
    }
  } catch (e) {}
}

// ============================================================================
//  SCHEDULER — plays aarti/bhajans automatically at set times.
//  In the browser this JS timer does the work (app must stay open). In the
//  native app, OS alarms handle it instead (fire even with the screen off).
// ============================================================================
function startScheduler() {
  runScheduleTick();
  setInterval(runScheduleTick, 30000);   // check every 30s
}
function runScheduleTick() {
  if (!Array.isArray(schedules) || !schedules.length) return;
  const now = new Date();
  const cur = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const dow = now.getDay();                          // 0=Sun … 6=Sat
  const today = now.getFullYear()+'-'+now.getMonth()+'-'+now.getDate();
  schedules.forEach(s => {
    if (!s || !s.enabled || s.time !== cur) return;
    if (Array.isArray(s.days) && s.days.length && !s.days.includes(dow)) return; // empty = daily
    const key = 'fired_' + s.id + '_' + today;
    if (localStorage.getItem(key)) return;           // already fired today
    localStorage.setItem(key, '1');
    const item = { id: s.id, label: s.label || 'आरती', type: s.type, value: s.value, icon: s.icon || '🪔' };
    if (audioUnlocked) { play(item); }
    else {                                            // need a tap first
      pendingCommand = item;
      $('overlayMsg').textContent = '🔔 ' + (s.label || 'आरती') + ' — tap to play';
      $('overlay').classList.remove('hidden');
    }
  });
}

// ============================================================================
//  DATA SOURCE:  Firebase live  OR  config.json fallback
// ============================================================================
async function boot() {
  if (isConfigured()) {
    await startFirebase();
  } else {
    setStatus('LOCAL MODE — Firebase अभी set नहीं है (README देखें)');
    await loadLocalConfig();
  }
  // In native mode, OS alarms own scheduling; the JS timer is a browser-only fallback.
  if (!NATIVE) startScheduler();
  if (NATIVE) {                         // native WebView: no tap needed
    audioUnlocked = true;
    hideOverlay();
    setStatus('तैयार · Ready');
    syncSchedulesToNative();            // push current schedules to OS alarms
  }
}

async function loadLocalConfig() {
  try {
    const res = await fetch('./config.json?ts=' + Date.now());
    const cfg = await res.json();
    if (cfg.title) $('title').textContent = cfg.title;
    renderButtons(cfg.buttons || []);
    if (Array.isArray(cfg.schedules)) { schedules = cfg.schedules; syncSchedulesToNative(); }
  } catch (e) {
    setStatus('config.json लोड नहीं हुआ');
  }
  // poll for silent updates from your repo every 20s
  setInterval(loadLocalConfig, 20000);
}

async function startFirebase() {
  const [{ initializeApp }, dbMod, authMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = dbMod.getDatabase(app);
  fb = { db, dbMod };

  try { await authMod.signInAnonymously(auth); } catch (e) { setStatus('Firebase auth error'); }

  const base = `families/${FAMILY_ID}`;
  const { ref, onValue, set, onDisconnect, serverTimestamp } = dbMod;

  // 1) live screen (buttons + title)
  onValue(ref(db, `${base}/screen`), (snap) => {
    const s = snap.val() || {};
    if (s.title) $('title').textContent = s.title;
    renderButtons(s.buttons || []);
  });

  // 2) live command channel — "play this now"
  onValue(ref(db, `${base}/command`), (snap) => {
    const c = snap.val();
    if (!c || !c.ts || c.ts <= lastCommandTs) return;
    lastCommandTs = c.ts;
    if (c.action === 'stop') { stopAll(); return; }
    if (c.action === 'pause') { $('btnPause').click(); return; }
    if (c.action === 'play') {
      if (audioUnlocked) play(c);
      else { pendingCommand = c; $('overlayMsg').textContent = '🔔 ' + (c.label||'') + ' — tap to play'; }
    }
  });

  // 2b) live schedules (aarti times)
  onValue(ref(db, `${base}/schedules`), (snap) => {
    const v = snap.val();
    schedules = !v ? [] : (Array.isArray(v) ? v.filter(Boolean) : Object.values(v));
    syncSchedulesToNative();
  });

  // 3) report presence + what's playing
  const statusRef = ref(db, `${base}/status`);
  set(statusRef, { online: true, lastSeen: serverTimestamp(), playing: null });
  onDisconnect(statusRef).update({ online: false, lastSeen: serverTimestamp() });
  fb.statusRef = statusRef; fb.set = set; fb.serverTimestamp = serverTimestamp; fb.update = dbMod.update; fb.ref = ref;
  setInterval(() => { try { dbMod.update(statusRef, { online: true, lastSeen: serverTimestamp() }); } catch {} }, 30000);

  // fallback: if firebase has no screen yet, seed from config.json so it's not empty
  onValue(ref(db, `${base}/screen`), (snap) => {
    if (!snap.exists()) loadLocalConfig();
  }, { onlyOnce: true });
}

function reportPlaying(item) {
  if (!fb || !fb.statusRef) return;
  try {
    fb.update(fb.statusRef, {
      online: true,
      lastSeen: fb.serverTimestamp(),
      playing: item ? { label: item.label || '', type: item.type || '', value: item.value || '' } : null
    });
  } catch {}
}

boot();
