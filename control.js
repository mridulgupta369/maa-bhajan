// ============================================================================
//  control.js  —  YOUR control panel
//  Manage the buttons on her screen + push "play now" live to her phone.
// ============================================================================
import { firebaseConfig, FAMILY_ID, CONTROL_PASSWORD, isConfigured } from './firebase-config.js';

const $ = (id) => document.getElementById(id);
let db, dbMod, base, buttons = [], screenTitle = '', schedules = [];

// ---- password gate ---------------------------------------------------------
$('pwBtn').addEventListener('click', tryUnlock);
$('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });

function tryUnlock() {
  if ($('pw').value === CONTROL_PASSWORD) {
    sessionStorage.setItem('ctrl_ok', '1');
    openPanel();
  } else {
    $('pwHint').textContent = 'Wrong password.';
  }
}
if (sessionStorage.getItem('ctrl_ok') === '1') openPanel();

async function openPanel() {
  $('gate').style.display = 'none';
  $('panel').style.display = 'block';
  if (!isConfigured()) {
    $('saveState').textContent = '⚠️ Firebase not set up yet — live control is OFF. See README section 2.';
    return;
  }
  await initFirebase();
}

// ---- firebase --------------------------------------------------------------
async function initFirebase() {
  const [{ initializeApp }, database, authMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
  ]);
  dbMod = database;
  const app = initializeApp(firebaseConfig);
  try { await authMod.signInAnonymously(authMod.getAuth(app)); } catch {}
  db = dbMod.getDatabase(app);
  base = `families/${FAMILY_ID}`;

  // live: current screen
  dbMod.onValue(dbMod.ref(db, `${base}/screen`), (snap) => {
    const s = snap.val() || {};
    buttons = s.buttons || [];
    screenTitle = s.title || '';
    $('fTitle').value = screenTitle;
    renderButtonList();
    renderPlayNow();
    renderPickOptions();
  });

  // live: schedules
  dbMod.onValue(dbMod.ref(db, `${base}/schedules`), (snap) => {
    const v = snap.val();
    schedules = !v ? [] : (Array.isArray(v) ? v.filter(Boolean) : Object.values(v));
    renderScheduleList();
  });

  // live: her phone status
  dbMod.onValue(dbMod.ref(db, `${base}/status`), (snap) => renderPresence(snap.val()));
}

// ---- presence --------------------------------------------------------------
function renderPresence(st) {
  const el = $('presence');
  if (!st) { el.innerHTML = '<span class="pill off">No data yet</span> — she hasn\'t opened the app.'; return; }
  const online = st.online ? '<span class="pill on">● Online</span>' : '<span class="pill off">○ Offline</span>';
  const playing = st.playing ? `<br>▶ Now playing: <b>${escapeHtml(st.playing.label || st.playing.type)}</b>` : '<br>Nothing playing right now.';
  el.innerHTML = online + playing;
}

// ---- play now --------------------------------------------------------------
function pushCommand(cmd) {
  if (!db) return warnNoFb();
  cmd.ts = Date.now();
  dbMod.set(dbMod.ref(db, `${base}/command`), cmd);
  flash('Sent → her phone');
}
$('pnPlay').addEventListener('click', () => {
  const value = $('pnValue').value.trim();
  if (!value) return;
  pushCommand({ action: 'play', type: $('pnType').value, value, label: 'Quick play' });
});
$('pnStop').addEventListener('click', () => pushCommand({ action: 'stop' }));
$('pnPause').addEventListener('click', () => pushCommand({ action: 'pause' }));

function renderPlayNow() {
  const wrap = $('playNowButtons');
  wrap.innerHTML = '';
  buttons.forEach(b => {
    const el = document.createElement('button');
    el.className = 'ghost';
    el.textContent = `${b.icon || '🎵'} ${b.label || ''}`;
    el.onclick = () => pushCommand({ action: 'play', type: b.type, value: b.value, label: b.label });
    wrap.appendChild(el);
  });
  if (!buttons.length) wrap.innerHTML = '<span class="hint">Add buttons below first.</span>';
}

// ---- button list + reorder + edit/delete -----------------------------------
function renderButtonList() {
  const list = $('buttonList');
  list.innerHTML = '';
  buttons.forEach((b, i) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.draggable = true;
    row.dataset.i = i;
    row.innerHTML =
      `<span class="grab">☰</span>
       <span class="swatch" style="background:${b.color || '#7c3aed'}"></span>
       <span class="meta"><b>${b.icon||''} ${escapeHtml(b.label||'')}</b><small>${escapeHtml(b.type)} · ${escapeHtml(b.value||'')}</small></span>
       <button class="ghost" data-edit="${i}">✏️</button>
       <button class="danger" data-del="${i}">🗑️</button>`;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => { buttons.splice(+btn.dataset.del,1); saveScreen(); });
  list.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => editButton(+btn.dataset.edit));
  enableDrag(list);
}

function enableDrag(list) {
  let dragI = null;
  list.querySelectorAll('.list-item').forEach(row => {
    row.addEventListener('dragstart', () => dragI = +row.dataset.i);
    row.addEventListener('dragover', (e) => e.preventDefault());
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      const dropI = +row.dataset.i;
      if (dragI === null || dragI === dropI) return;
      const [m] = buttons.splice(dragI, 1);
      buttons.splice(dropI, 0, m);
      saveScreen();
    });
  });
}

function editButton(i) {
  const b = buttons[i];
  $('fLabel').value = b.label || '';
  $('fSub').value = b.subtitle || '';
  $('fIcon').value = b.icon || '';
  $('fType').value = b.type || 'youtube';
  $('fColor').value = /^#/.test(b.color||'') ? b.color : '#7c3aed';
  $('fValue').value = b.value || '';
  $('fEditId').value = b.id;
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

$('fSave').addEventListener('click', () => {
  const label = $('fLabel').value.trim();
  const value = $('fValue').value.trim();
  if (!label || !value) { flash('Need a label and a link'); return; }
  const item = {
    id: $('fEditId').value || 'b' + Date.now(),
    label, subtitle: $('fSub').value.trim(), icon: $('fIcon').value.trim() || '🎵',
    type: $('fType').value, color: $('fColor').value, value
  };
  const editId = $('fEditId').value;
  const idx = editId ? buttons.findIndex(x => x.id === editId) : -1;
  if (idx >= 0) buttons[idx] = item; else buttons.push(item);
  saveScreen();
  clearForm();
});
$('fClear').addEventListener('click', clearForm);
function clearForm() {
  ['fLabel','fSub','fIcon','fValue','fEditId'].forEach(id => $(id).value = '');
  $('fType').value = 'youtube'; $('fColor').value = '#7c3aed';
}

$('fTitleSave').addEventListener('click', () => { screenTitle = $('fTitle').value; saveScreen(); });

// ---- schedules -------------------------------------------------------------
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderPickOptions() {
  const sel = $('sPick');
  if (!sel) return;
  const keep = sel.value;
  sel.innerHTML = buttons.map(b => `<option value="btn:${b.id}">${escapeHtml((b.icon||'')+' '+(b.label||''))}</option>`).join('')
    + '<option value="custom">➕ Custom link…</option>';
  if (keep) sel.value = keep;
  toggleCustom();
}
function toggleCustom() {
  const isCustom = $('sPick').value === 'custom' || buttons.length === 0;
  $('sCustom').style.display = isCustom ? 'block' : 'none';
}
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'sPick') toggleCustom(); });

function renderScheduleList() {
  const list = $('scheduleList');
  if (!list) return;
  list.innerHTML = '';
  if (!schedules.length) { list.innerHTML = '<p class="hint">No schedules yet.</p>'; return; }
  schedules.forEach((s, i) => {
    const days = (Array.isArray(s.days) && s.days.length) ? s.days.map(d => DAY_NAMES[d]).join(' ') : 'Daily';
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML =
      `<span class="pill ${s.enabled?'on':'off'}">${s.enabled?'ON':'OFF'}</span>
       <span class="meta"><b>${escapeHtml(s.time)} · ${escapeHtml(s.label||'')}</b><small>${days} · ${escapeHtml(s.type)} · ${escapeHtml(s.value||'')}</small></span>
       <button class="ghost" data-tog="${i}">${s.enabled?'Pause':'Enable'}</button>
       <button class="ghost" data-sedit="${i}">✏️</button>
       <button class="danger" data-sdel="${i}">🗑️</button>`;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => { const i=+b.dataset.tog; schedules[i].enabled=!schedules[i].enabled; saveSchedules(); });
  list.querySelectorAll('[data-sdel]').forEach(b => b.onclick = () => { schedules.splice(+b.dataset.sdel,1); saveSchedules(); });
  list.querySelectorAll('[data-sedit]').forEach(b => b.onclick = () => editSchedule(+b.dataset.sedit));
}

function editSchedule(i) {
  const s = schedules[i];
  $('sTime').value = s.time || '07:00';
  $('sEditId').value = s.id;
  $('sDays').querySelectorAll('input').forEach(cb => cb.checked = Array.isArray(s.days) && s.days.includes(+cb.value));
  // set content: match an existing button by value, else custom
  const match = buttons.find(b => b.value === s.value && b.type === s.type);
  if (match) { $('sPick').value = 'btn:' + match.id; }
  else { $('sPick').value = 'custom'; $('sType').value = s.type||'youtube'; $('sValue').value = s.value||''; $('sLabel').value = s.label||''; }
  toggleCustom();
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function clearSchedForm() {
  $('sTime').value = '07:00'; $('sEditId').value = '';
  $('sDays').querySelectorAll('input').forEach(cb => cb.checked = false);
  $('sValue').value = ''; $('sLabel').value = ''; if (buttons.length) $('sPick').value = 'btn:'+buttons[0].id;
  toggleCustom();
}

document.addEventListener('click', (e) => {
  if (!e.target) return;
  if (e.target.id === 'sClear') clearSchedForm();
  if (e.target.id === 'sSave') saveSchedule();
});

function saveSchedule() {
  const days = Array.from($('sDays').querySelectorAll('input:checked')).map(cb => +cb.value);
  let type, value, label, icon = '🪔';
  const pick = $('sPick').value;
  if (pick && pick.startsWith('btn:')) {
    const b = buttons.find(x => x.id === pick.slice(4));
    if (!b) { flash('Pick something to play'); return; }
    type = b.type; value = b.value; label = b.label; icon = b.icon || '🪔';
  } else {
    type = $('sType').value; value = $('sValue').value.trim(); label = $('sLabel').value.trim() || 'आरती';
    if (!value) { flash('Custom needs a link'); return; }
  }
  const item = { id: $('sEditId').value || 's' + Date.now(), time: $('sTime').value, days, enabled: true, type, value, label, icon };
  const editId = $('sEditId').value;
  const idx = editId ? schedules.findIndex(x => x.id === editId) : -1;
  if (idx >= 0) schedules[idx] = { ...schedules[idx], ...item }; else schedules.push(item);
  saveSchedules();
  clearSchedForm();
}

function saveSchedules() {
  if (!db) return warnNoFb();
  dbMod.set(dbMod.ref(db, `${base}/schedules`), schedules);
  flash('Schedule saved ✓');
}

// ---- save ------------------------------------------------------------------
function saveScreen() {
  if (!db) return warnNoFb();
  dbMod.set(dbMod.ref(db, `${base}/screen`), { title: screenTitle, buttons });
  flash('Saved ✓ (her screen updates instantly)');
}

// ---- utils -----------------------------------------------------------------
function warnNoFb() { flash('Firebase not set up — see README section 2.'); }
function flash(t) { $('saveState').textContent = t; }
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
