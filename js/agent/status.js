// ═══════════════════════════════════
// ⏰ AGENT STATUS & AUX SYSTEM
// ═══════════════════════════════════

console.log('✅ status.js loaded');

// Global state for current aux session
window.AuxState = {
  currentAux: null,
  startTime: null,
  timerInterval: null,
  sessions: []
};

// ✅ MAIN PUNCH FUNCTION
window.punchAux = async function (aux) {
  try {
    if (!window.sb || !APP.CU) return;

    const userId = APP.CU.id;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Stop current timer if running
    if (AuxState.timerInterval) {
      clearInterval(AuxState.timerInterval);
      AuxState.timerInterval = null;
    }

    // If same aux clicked again = punch out
    if (AuxState.currentAux === aux) {
      const duration = Math.round((now - AuxState.startTime) / 1000);

      await sb.from('aux_sessions').insert({
        user_id: userId,
        aux_type: aux,
        start_time: AuxState.startTime.toISOString(),
        end_time: now.toISOString(),
        duration_seconds: duration,
        date: today
      });

      AuxState.currentAux = null;
      AuxState.startTime = null;
      updatePunchUI();
      await loadDailySummary();
      return;
    }

    // Start new aux
    AuxState.currentAux = aux;
    AuxState.startTime = now;
    updatePunchUI();
    startTimer();

    await sb.from('aux_logs').insert({
      user_id: userId,
      aux_type: aux,
      action: 'start',
      timestamp: now.toISOString(),
      date: today
    });

  } catch (e) {
    console.error('punchAux error:', e);
  }
};

// ✅ UPDATE UI
function updatePunchUI() {
  const status = document.getElementById('punch-status');
  const buttons = document.querySelectorAll('.aux-btn');

  buttons.forEach(b => b.classList.remove('aux-active'));

  if (AuxState.currentAux) {
    const activeBtn = document.querySelector(`[data-aux="${AuxState.currentAux}"]`);
    if (activeBtn) activeBtn.classList.add('aux-active');

    if (status) {
      status.textContent = '🔴 Active: ' + AuxState.currentAux.toUpperCase();
      status.style.color = getAuxColor(AuxState.currentAux);
    }
  } else {
    if (status) {
      status.textContent = '🟢 Ready to punch';
      status.style.color = '#16a34a';
    }
  }
}

// ✅ TIMER
function startTimer() {
  const timerEl = document.getElementById('aux-timer');
  if (!timerEl) return;

  if (AuxState.timerInterval) clearInterval(AuxState.timerInterval);

  AuxState.timerInterval = setInterval(() => {
    if (!AuxState.startTime) {
      clearInterval(AuxState.timerInterval);
      return;
    }

    const elapsed = Math.floor((new Date() - AuxState.startTime) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;

    timerEl.textContent =
      String(h).padStart(2, '0') + ':' +
      String(m).padStart(2, '0') + ':' +
      String(s).padStart(2, '0');
  }, 1000);
}

// ✅ LOAD DAILY SUMMARY
window.loadDailySummary = async function () {
  if (!window.sb || !APP.CU) return;

  try {
    const userId = APP.CU.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: sessions } = await sb
      .from('aux_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);

    AuxState.sessions = sessions || [];

    const totals = {
      online: 0,
      break: 0,
      meeting: 0,
      training: 0,
      coaching: 0,
      offline: 0
    };

    AuxState.sessions.forEach(s => {
      const hours = (s.duration_seconds || 0) / 3600;
      if (totals[s.aux_type] !== undefined) {
        totals[s.aux_type] += hours;
      }
    });

    const summaryDiv = document.getElementById('aux-summary');
    if (summaryDiv) {
      const loginHours = Object.values(totals).reduce((a, b) => a + b, 0);
      const missingHours = Math.max(0, 8 - loginHours);

      summaryDiv.innerHTML = `
        <div class="aux-summary-row"><span>🟢 Online:</span><strong>${totals.online.toFixed(1)}h</strong></div>
        <div class="aux-summary-row"><span>🟡 Break:</span><strong>${totals.break.toFixed(1)}h</strong> / 1h</div>
        <div class="aux-summary-row"><span>🟠 Meeting:</span><strong>${totals.meeting.toFixed(1)}h</strong></div>
        <div class="aux-summary-row"><span>🔵 Training:</span><strong>${totals.training.toFixed(1)}h</strong></div>
        <div class="aux-summary-row"><span>🟣 Coaching:</span><strong>${totals.coaching.toFixed(1)}h</strong></div>
        <div class="aux-summary-row total"><span>📊 Login Time:</span><strong>${loginHours.toFixed(1)}h</strong> / 8h</div>
        <div class="aux-summary-row ${missingHours > 0 ? 'warn' : 'good'}"><span>⏳ Missing:</span><strong>${missingHours.toFixed(1)}h</strong></div>
      `;
    }

    safeText('agent-hours', totals.online.toFixed(1) + 'h');
    safeText('agent-break', totals.break.toFixed(1) + 'h');
    safeText('agent-missing', Math.max(0, 8 - Object.values(totals).reduce((a, b) => a + b, 0)).toFixed(1) + 'h');
    safeText('agent-meeting', (totals.meeting + totals.training + totals.coaching).toFixed(1) + 'h');

  } catch (e) {
    console.warn('loadDailySummary:', e);
  }
};

// ✅ HELPER
function getAuxColor(aux) {
  return {
    online: '#16a34a',
    break: '#eab308',
    meeting: '#f97316',
    training: '#3b82f6',
    coaching: '#8b5cf6',
    offline: '#dc2626'
  }[aux] || '#6b7280';
}

// ✅ AUTO REFRESH (SAFE - AFTER LOGIN ONLY)
setInterval(() => {
  if (APP.CU?.id) {
    loadDailySummary();
  }
}, 30000);