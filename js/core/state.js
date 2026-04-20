// ═══════════════════════════════════
// ⏱️ AUX SYSTEM — Punch per Status
// ═══════════════════════════════════

let AUX_TIMER_INTERVAL = null;
let AUX_START = null;
let AUX_CURRENT = 'offline';

const AUX_COLORS = {
  online:   { bg: '#16a34a', label: '🟢 Online',   color: '#16a34a' },
  break:    { bg: '#eab308', label: '🟡 Break',    color: '#eab308' },
  meeting:  { bg: '#f97316', label: '🟠 Meeting',  color: '#f97316' },
  training: { bg: '#3b82f6', label: '🔵 Training', color: '#3b82f6' },
  coaching: { bg: '#8b5cf6', label: '🟣 Coaching', color: '#8b5cf6' },
  offline:  { bg: '#dc2626', label: '🔴 Offline',  color: '#dc2626' }
};

// ═══ INIT ON LOGIN ═══
window.initAux = async function() {
  if (!APP.CU?.id) return;

  const today = todayISO();

  try {
    const { data: openAux } = await sb
      .from('aux_log')
      .select('*')
      .eq('user_id', APP.CU.id)
      .eq('date', today)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openAux) {
      AUX_CURRENT = openAux.aux_type;
      AUX_START = new Date(openAux.start_time);
      highlightAuxBtn(AUX_CURRENT);
      startAuxTimer();
      updatePunchStatus(AUX_COLORS[AUX_CURRENT]?.label + ' since ' + AUX_START.toLocaleTimeString(), AUX_COLORS[AUX_CURRENT]?.color);
    } else {
      AUX_CURRENT = 'offline';
      AUX_START = null;
      highlightAuxBtn('offline');
      updateAuxTimerDisplay('00:00:00');
      updatePunchStatus('Ready to start your day', '#6b7280');
    }
  } catch (e) {
    console.warn('initAux error:', e);
  }

  await loadDailySummary();
};

// ═══ PUNCH AUX ═══
window.punchAux = async function(newAux) {
  if (!APP.CU?.id) return;
  if (newAux === AUX_CURRENT && AUX_START) return;

  const now = new Date();
  const today = todayISO();

  try {
    // 1) Close current open aux
    if (AUX_CURRENT !== 'offline' && AUX_START) {
      const durationMin = ((now - AUX_START) / 60000).toFixed(2);

      await sb
        .from('aux_log')
        .update({ end_time: now.toISOString(), duration_min: parseFloat(durationMin) })
        .eq('user_id', APP.CU.id)
        .eq('date', today)
        .eq('aux_type', AUX_CURRENT)
        .is('end_time', null);
    }

    // 2) If offline — just stop
    if (newAux === 'offline') {
      AUX_CURRENT = 'offline';
      AUX_START = null;
      stopAuxTimer();
      highlightAuxBtn('offline');
      updatePunchStatus('🔴 Punched Out at ' + now.toLocaleTimeString(), '#dc2626');

      await sb.from('profiles').update({
        status: 'offline', current_aux: 'offline',
        aux_since: null, last_seen: now.toISOString()
      }).eq('id', APP.CU.id);

      // Close attendance
      await sb.from('attendance')
        .update({ punch_out: now.toISOString() })
        .eq('user_id', APP.CU.id)
        .eq('date', today)
        .is('punch_out', null);

      await loadDailySummary();
      return;
    }

    // 3) Insert new aux
    const { error } = await sb.from('aux_log').insert({
      user_id: APP.CU.id,
      date: today,
      aux_type: newAux,
      start_time: now.toISOString()
    });

    if (error) {
      alert('❌ Punch failed: ' + error.message);
      return;
    }

    // 4) First punch today → create attendance
    if (AUX_CURRENT === 'offline') {
      const { data: att } = await sb.from('attendance')
        .select('id')
        .eq('user_id', APP.CU.id)
        .eq('date', today)
        .maybeSingle();

      if (!att) {
        await sb.from('attendance').insert({
          user_id: APP.CU.id,
          date: today,
          punch_in: now.toISOString()
        });
      }
    }

    // 5) Update state
    AUX_CURRENT = newAux;
    AUX_START = now;
    highlightAuxBtn(newAux);
    startAuxTimer();
    updatePunchStatus(AUX_COLORS[newAux]?.label + ' since ' + now.toLocaleTimeString(), AUX_COLORS[newAux]?.color);

    // 6) Update profile
    await sb.from('profiles').update({
      status: newAux, current_aux: newAux,
      aux_since: now.toISOString(), last_seen: now.toISOString()
    }).eq('id', APP.CU.id);

    await loadDailySummary();

  } catch (e) {
    console.warn('punchAux error:', e);
  }
};

// ═══ AUX TIMER ═══
function startAuxTimer() {
  stopAuxTimer();
  tickAuxTimer();
  AUX_TIMER_INTERVAL = setInterval(tickAuxTimer, 1000);
}

function stopAuxTimer() {
  if (AUX_TIMER_INTERVAL) clearInterval(AUX_TIMER_INTERVAL);
  AUX_TIMER_INTERVAL = null;
  updateAuxTimerDisplay('00:00:00');
}

function tickAuxTimer() {
  if (!AUX_START) return;
  const diff = Math.floor((Date.now() - AUX_START.getTime()) / 1000);
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  updateAuxTimerDisplay(h + ':' + m + ':' + s);
}

function updateAuxTimerDisplay(text) {
  const el = document.getElementById('aux-timer');
  if (el) {
    el.textContent = text;
    el.style.color = AUX_COLORS[AUX_CURRENT]?.color || '#2563eb';
  }
}

// ═══ UI ═══
function highlightAuxBtn(active) {
  document.querySelectorAll('.aux-btn').forEach(btn => {
    btn.classList.remove('aux-active');
    if (btn.dataset.aux === active) btn.classList.add('aux-active');
  });
}

function updatePunchStatus(text, color) {
  const el = document.getElementById('punch-status');
  if (el) { el.textContent = text; el.style.color = color || '#6b7280'; }
}

// ═══ DAILY SUMMARY ═══
async function loadDailySummary() {
  if (!APP.CU?.id) return;

  const today = todayISO();
  const { data: logs } = await sb
    .from('aux_log')
    .select('aux_type, duration_min')
    .eq('user_id', APP.CU.id)
    .eq('date', today);

  if (!logs) return;

  let totals = { online: 0, break: 0, meeting: 0, training: 0, coaching: 0 };

  logs.forEach(l => {
    const mins = parseFloat(l.duration_min) || 0;
    if (totals[l.aux_type] !== undefined) totals[l.aux_type] += mins;
  });

  const loginMin = totals.online + totals.meeting + totals.coaching + totals.training;
  const loginH = loginMin / 60;
  const breakH = totals.break / 60;
  const missingH = Math.max(0, 8 - loginH);
  const meetCoachH = (totals.meeting + totals.coaching) / 60;

  safeText('agent-hours', loginH.toFixed(1) + 'h');
  safeText('agent-break', breakH.toFixed(1) + 'h');
  safeText('agent-missing', missingH.toFixed(1) + 'h');
  safeText('agent-meeting', meetCoachH.toFixed(1) + 'h');

  const missingEl = document.getElementById('agent-missing');
  if (missingEl) {
    missingEl.style.color = missingH > 2 ? '#dc2626' : missingH > 0 ? '#f59e0b' : '#16a34a';
  }

  const summaryEl = document.getElementById('aux-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="aux-summary-row"><span>🟢 Online:</span><strong>${(totals.online/60).toFixed(1)}h</strong></div>
      <div class="aux-summary-row"><span>🟡 Break:</span><strong>${(totals.break/60).toFixed(1)}h</strong> / 1h</div>
      <div class="aux-summary-row"><span>🟠 Meeting:</span><strong>${(totals.meeting/60).toFixed(1)}h</strong></div>
      <div class="aux-summary-row"><span>🔵 Training:</span><strong>${(totals.training/60).toFixed(1)}h</strong></div>
      <div class="aux-summary-row"><span>🟣 Coaching:</span><strong>${(totals.coaching/60).toFixed(1)}h</strong></div>
      <div class="aux-summary-row total"><span>📊 Login Time:</span><strong>${loginH.toFixed(1)}h</strong> / 8h</div>
      <div class="aux-summary-row ${missingH > 0 ? 'warn' : 'good'}"><span>⏳ Missing:</span><strong>${missingH.toFixed(1)}h</strong></div>
    `;
  }
}