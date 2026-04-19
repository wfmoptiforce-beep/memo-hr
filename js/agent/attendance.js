// ═════════════════════════════════════
// 🧩 AGENT – ATTENDANCE (PUNCH / BREAK / TIMERS)
// ═════════════════════════════════════

window.loadAgentPanel = async function loadAgentPanel() {
  renderAgentGreeting();

  // Load punch state first (never block UI)
  try { await checkTodayPunch(); } catch (e) { console.warn('checkTodayPunch', e); }

  // Other widgets will be implemented in their files; keep safe calls
  try { await window.loadAgentSchedule?.(); } catch (e) { console.warn('loadAgentSchedule', e); }
  try { await window.loadAgentOnline?.(); } catch (e) { console.warn('loadAgentOnline', e); }
  try { await window.loadAgentBreaks?.(); } catch (e) { console.warn('loadAgentBreaks', e); }
  try { await window.loadAgentQuality?.(); } catch (e) { console.warn('loadAgentQuality', e); }
  try { await window.loadAgentPerformance?.(); } catch (e) { console.warn('loadAgentPerformance', e); }
  try { await window.loadAgentLeaves?.(); } catch (e) { console.warn('loadAgentLeaves', e); }

  // Keep online list refreshing (later)
  if (APP.intervals.teamOnline) clearInterval(APP.intervals.teamOnline);
  APP.intervals.teamOnline = setInterval(() => {
    window.loadAgentOnline?.();
  }, 30000);

  refreshPunchButtons();
};

function renderAgentGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good Morning' :
    hour < 17 ? 'Good Afternoon' :
    'Good Evening';

  safeText('a-greeting', greeting + '! 👋');
  safeText('a-date', now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }));
}

function refreshPunchButtons() {
  const inBtn  = document.getElementById('a-btn-in');
  const brkBtn = document.getElementById('a-btn-brk');
  const outBtn = document.getElementById('a-btn-out');

  if (!inBtn || !brkBtn || !outBtn) return;

  // default enable/disable
  inBtn.disabled  = APP.isPunchedIn;
  brkBtn.disabled = !APP.isPunchedIn;
  outBtn.disabled = !APP.isPunchedIn;

  // break UI
  if (APP.isOnBreak) {
    brkBtn.textContent = '⏸️ End Break';
    brkBtn.classList.add('active');
  } else {
    brkBtn.textContent = '☕ Break';
    brkBtn.classList.remove('active');
  }
}

// ─────────────────────────────────────
// DB: Check today punch
// ─────────────────────────────────────
async function checkTodayPunch() {
  const today = todayISO();

  const { data, error } = await sb
    .from('punches')
    .select('*')
    .eq('user_id', APP.CU.id)
    .eq('date', today)
    .maybeSingle();

  if (error) {
    console.warn('punches select error:', error);
    // do not block UI; allow user to try punch in
    APP.isPunchedIn = false;
    APP.isOnBreak = false;
    APP.punchInTime = null;
    refreshPunchButtons();
    return;
  }

  if (!data) {
    resetTodayStateUI();
    return;
  }

  APP.totalBreakSec = (data.total_break_seconds || 0);

  if (data.punch_in && !data.punch_out) {
    APP.punchInTime = new Date(data.punch_in);
    APP.isPunchedIn = true;
    APP.isOnBreak = false;

    safeText('a-punch-in-time', APP.punchInTime.toLocaleTimeString());
    startWorkTimer();
    refreshPunchButtons();

    // best effort
    setProfileStatusSafe('online');
    return;
  }

  if (data.punch_in && data.punch_out) {
    stopTimers();
    APP.isPunchedIn = false;
    APP.isOnBreak = false;

    const ms = new Date(data.punch_out) - new Date(data.punch_in) - APP.totalBreakSec * 1000;
    renderWorkedFromMs(ms);

    // lock after done
    lockPunchButtons();
    checkMissing(ms / 3600000);
    setProfileStatusSafe('offline');
  }
}

function resetTodayStateUI() {
  stopTimers();

  APP.isPunchedIn = false;
  APP.isOnBreak = false;
  APP.punchInTime = null;
  APP.breakStartTime = null;

  APP.totalBreakSec = 0;
  APP.breakCount = 0;
  APP.todayBreaks = [];

  safeText('a-punch-in-time', '—');
  safeText('a-work-timer', '00:00:00');
  safeText('a-break-timer', '00:00:00');
  safeText('a-break-count', '0');
  safeText('a-stat-breaks', '0');
  safeText('a-stat-hours', '0h 0m');

  const miss = document.getElementById('a-miss-alert');
  if (miss) miss.classList.remove('show');

  refreshPunchButtons();
}

function lockPunchButtons() {
  const inBtn  = document.getElementById('a-btn-in');
  const brkBtn = document.getElementById('a-btn-brk');
  const outBtn = document.getElementById('a-btn-out');
  if (inBtn) inBtn.disabled = true;
  if (brkBtn) brkBtn.disabled = true;
  if (outBtn) outBtn.disabled = true;
}

// ─────────────────────────────────────
// Actions: Punch In / Out
// ─────────────────────────────────────
window.punchIn = async function punchIn() {
  const now = new Date();
  const today = todayISO();

  const { error } = await sb
    .from('punches')
    .upsert({
      user_id: APP.CU.id,
      date: today,
      punch_in: now.toISOString(),
      status: 'present'
    }, { onConflict: 'user_id,date' });

  if (error) {
    alert('Punch in failed: ' + error.message);
    console.error(error);
    return;
  }

  APP.punchInTime = now;
  APP.isPunchedIn = true;
  APP.isOnBreak = false;

  APP.totalBreakSec = 0;
  APP.breakCount = 0;
  APP.todayBreaks = [];

  safeText('a-punch-in-time', now.toLocaleTimeString());
  safeText('a-break-count', '0');
  safeText('a-stat-breaks', '0');
  safeText('a-break-timer', '00:00:00');

  startWorkTimer();
  refreshPunchButtons();
  setProfileStatusSafe('online');

  window.loadAgentOnline?.();
};

window.punchOut = async function punchOut() {
  if (!confirm('Punch out now?')) return;

  const now = new Date();
  const today = todayISO();

  if (!APP.punchInTime) {
    alert('No punch in time found.');
    return;
  }

  if (APP.isOnBreak) await endBreakLocal();

  const ms = now - APP.punchInTime - APP.totalBreakSec * 1000;

  const { error } = await sb
    .from('punches')
    .update({
      punch_out: now.toISOString(),
      total_break_seconds: APP.totalBreakSec,
      total_work_seconds: Math.floor(ms / 1000),
      status: 'present'
    })
    .eq('user_id', APP.CU.id)
    .eq('date', today);

  if (error) {
    alert('Punch out failed: ' + error.message);
    console.error(error);
    return;
  }

  stopTimers();
  APP.isPunchedIn = false;
  APP.isOnBreak = false;

  renderWorkedFromMs(ms);
  lockPunchButtons();

  checkMissing(ms / 3600000);
  setProfileStatusSafe('offline');

  window.loadAgentOnline?.();
};

// ─────────────────────────────────────
// Break: toggle / local timer
// ─────────────────────────────────────
window.toggleBreak = async function toggleBreak() {
  if (!APP.isPunchedIn) return;

  if (APP.isOnBreak) await endBreakLocal();
  else await startBreakLocal();

  refreshPunchButtons();
};

async function startBreakLocal() {
  APP.breakStartTime = new Date();
  APP.isOnBreak = true;
  APP.breakCount += 1;

  safeText('a-break-count', String(APP.breakCount));
  safeText('a-stat-breaks', String(APP.breakCount));

  startBreakTimer();
  setProfileStatusSafe('break');
}

async function endBreakLocal() {
  if (!APP.breakStartTime) return;

  const now = new Date();
  const durSec = Math.floor((now - APP.breakStartTime) / 1000);

  APP.totalBreakSec += durSec;
  APP.isOnBreak = false;
  APP.breakStartTime = null;

  if (APP.breakTimer) clearInterval(APP.breakTimer);
  APP.breakTimer = null;

  safeText('a-break-timer', '00:00:00');
  setProfileStatusSafe('online');
}

function startWorkTimer() {
  stopTimers();

  APP.workTimer = setInterval(() => {
    if (!APP.punchInTime) return;

    const elapsedMs = new Date() - APP.punchInTime - APP.totalBreakSec * 1000;
    renderRunningWorkFromMs(elapsedMs);
  }, 1000);
}

function startBreakTimer() {
  if (APP.breakTimer) clearInterval(APP.breakTimer);

  APP.breakTimer = setInterval(() => {
    if (!APP.isOnBreak || !APP.breakStartTime) return;

    const el = new Date() - APP.breakStartTime;
    const h = Math.floor(el / 3600000);
    const m = Math.floor((el % 3600000) / 60000);
    const s = Math.floor((el % 60000) / 1000);

    safeText('a-break-timer', `${pad2(h)}:${pad2(m)}:${pad2(s)}`);
  }, 1000);
}

function stopTimers() {
  if (APP.workTimer) clearInterval(APP.workTimer);
  if (APP.breakTimer) clearInterval(APP.breakTimer);
  APP.workTimer = null;
  APP.breakTimer = null;
}

// ─────────────────────────────────────
// Rendering: work/bars/missing
// ─────────────────────────────────────
function renderRunningWorkFromMs(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  safeText('a-work-timer', `${pad2(h)}:${pad2(m)}:${pad2(s)}`);
  safeText('a-stat-hours', `${h}h ${m}m`);

  const pct = Math.min((ms / 1000) / APP.RULES.requiredWorkSeconds * 100, 100);
  const bar = document.getElementById('a-hours-bar');
  if (bar) bar.style.width = pct + '%';
  safeText('a-hours-val', Math.round(pct) + '%');
}

function renderWorkedFromMs(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);

  safeText('a-work-timer', `${pad2(h)}:${pad2(m)}:00`);
  safeText('a-stat-hours', `${h}h ${m}m`);

  const pct = Math.min((ms / 1000) / APP.RULES.requiredWorkSeconds * 100, 100);
  const bar = document.getElementById('a-hours-bar');
  if (bar) bar.style.width = pct + '%';
  safeText('a-hours-val', Math.round(pct) + '%');
}

function checkMissing(workedH) {
  const requiredH = APP.RULES.requiredWorkSeconds / 3600;

  if (workedH < requiredH) {
    const miss = requiredH - workedH;
    const mH = Math.floor(miss);
    const mM = Math.floor((miss - mH) * 60);

    const box = document.getElementById('a-miss-alert');
    if (box) box.classList.add('show');

    safeText('a-miss-text', `You are missing ${mH}h ${mM}m today`);
  }
}

// ─────────────────────────────────────
// Profile status (best effort)
// ─────────────────────────────────────
async function setProfileStatusSafe(status) {
  try {
    await sb.from('profiles')
      .update({ status, last_seen: new Date().toISOString() })
      .eq('id', APP.CU.id);
  } catch (e) {
    console.warn('setProfileStatusSafe failed', e);
  }
}