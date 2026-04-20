// ═══════════════════════════════════
// ⏱️ AUX SYSTEM
// ═══════════════════════════════════

let AUX_INTERVAL = null;
let AUX_START = null;
let AUX_CURRENT = 'offline';

const AUX_META = {
  online:   { label: '🟢 Online',   color: '#16a34a' },
  break:    { label: '🟡 Break',    color: '#eab308' },
  meeting:  { label: '🟠 Meeting',  color: '#f97316' },
  training: { label: '🔵 Training', color: '#3b82f6' },
  coaching: { label: '🟣 Coaching', color: '#8b5cf6' },
  offline:  { label: '🔴 Offline',  color: '#dc2626' }
};

window.initAux = async function() {
  if (!APP.CU?.id) return;
  const today = todayISO();

  try {
    const { data } = await sb.from('aux_log')
      .select('*').eq('user_id', APP.CU.id).eq('date', today)
      .is('end_time', null).order('start_time', { ascending: false })
      .limit(1).maybeSingle();

    if (data) {
      AUX_CURRENT = data.aux_type;
      AUX_START = new Date(data.start_time);
      hlBtn(AUX_CURRENT);
      startTimer();
      setStatus(AUX_META[AUX_CURRENT]?.label + ' since ' + AUX_START.toLocaleTimeString(), AUX_META[AUX_CURRENT]?.color);
    } else {
      AUX_CURRENT = 'offline';
      AUX_START = null;
      hlBtn('offline');
      timerText('00:00:00');
      setStatus('Ready to start your day', '#6b7280');
    }
  } catch (e) {
    console.warn('initAux:', e);
    setStatus('Ready to start your day', '#6b7280');
  }

  await loadSummary();
};

window.punchAux = async function(aux) {
  if (!APP.CU?.id) return;
  if (aux === AUX_CURRENT && AUX_START) return;

  const now = new Date();
  const today = todayISO();

  try {
    // close current
    if (AUX_CURRENT !== 'offline' && AUX_START) {
      const dur = ((now - AUX_START) / 60000).toFixed(2);
      await sb.from('aux_log')
        .update({ end_time: now.toISOString(), duration_min: parseFloat(dur) })
        .eq('user_id', APP.CU.id).eq('date', today)
        .eq('aux_type', AUX_CURRENT).is('end_time', null);
    }

    // punch out
    if (aux === 'offline') {
      AUX_CURRENT = 'offline'; AUX_START = null;
      stopTimer(); hlBtn('offline');
      setStatus('🔴 Punched Out at ' + now.toLocaleTimeString(), '#dc2626');

      await sb.from('profiles').update({
        status: 'offline', current_aux: 'offline',
        aux_since: null, last_seen: now.toISOString()
      }).eq('id', APP.CU.id);

      await sb.from('attendance')
        .update({ punch_out: now.toISOString() })
        .eq('user_id', APP.CU.id).eq('date', today).is('punch_out', null);

      await loadSummary();
      if (typeof loadTeamOnline === 'function') loadTeamOnline();
      return;
    }

    // insert new aux
    const { error } = await sb.from('aux_log').insert({
      user_id: APP.CU.id, date: today,
      aux_type: aux, start_time: now.toISOString()
    });
    if (error) { alert('❌ ' + error.message); return; }

    // first punch → attendance
    if (AUX_CURRENT === 'offline') {
      const { data: att } = await sb.from('attendance')
        .select('id').eq('user_id', APP.CU.id).eq('date', today).maybeSingle();
      if (!att) {
        await sb.from('attendance').insert({
          user_id: APP.CU.id, date: today, punch_in: now.toISOString()
        });
      }
    }

    AUX_CURRENT = aux; AUX_START = now;
    hlBtn(aux); startTimer();
    setStatus(AUX_META[aux]?.label + ' since ' + now.toLocaleTimeString(), AUX_META[aux]?.color);

    await sb.from('profiles').update({
      status: aux, current_aux: aux,
      aux_since: now.toISOString(), last_seen: now.toISOString()
    }).eq('id', APP.CU.id);

    await loadSummary();
    if (typeof loadTeamOnline === 'function') loadTeamOnline();

  } catch (e) { console.warn('punchAux:', e); }
};

// Timer
function startTimer() {
  stopTimer(); tick();
  AUX_INTERVAL = setInterval(tick, 1000);
}
function stopTimer() {
  if (AUX_INTERVAL) clearInterval(AUX_INTERVAL);
  AUX_INTERVAL = null; timerText('00:00:00');
}
function tick() {
  if (!AUX_START) return;
  const d = Math.floor((Date.now() - AUX_START.getTime()) / 1000);
  timerText(pad2(Math.floor(d/3600)) + ':' + pad2(Math.floor((d%3600)/60)) + ':' + pad2(d%60));
}
function timerText(t) {
  const el = document.getElementById('aux-timer');
  if (el) { el.textContent = t; el.style.color = AUX_META[AUX_CURRENT]?.color || '#2563eb'; }
}
function hlBtn(a) {
  document.querySelectorAll('.aux-btn').forEach(b => {
    b.classList.toggle('aux-active', b.dataset.aux === a);
  });
}
function setStatus(t, c) {
  const el = document.getElementById('punch-status');
  if (el) { el.textContent = t; el.style.color = c || '#6b7280'; }
}

// Summary
async function loadSummary() {
  if (!APP.CU?.id) return;
  try {
    const { data: logs } = await sb.from('aux_log')
      .select('aux_type, duration_min')
      .eq('user_id', APP.CU.id).eq('date', todayISO());

    let t = { online: 0, break: 0, meeting: 0, training: 0, coaching: 0 };
    (logs || []).forEach(l => {
      if (t[l.aux_type] !== undefined) t[l.aux_type] += (parseFloat(l.duration_min) || 0);
    });

    const loginH = (t.online + t.meeting + t.coaching + t.training) / 60;
    const breakH = t.break / 60;
    const missH = Math.max(0, 8 - loginH);

    safeText('agent-hours', loginH.toFixed(1) + 'h');
    safeText('agent-break', breakH.toFixed(1) + 'h');
    safeText('agent-missing', missH.toFixed(1) + 'h');
    safeText('agent-meeting', ((t.meeting + t.coaching) / 60).toFixed(1) + 'h');

    const me = document.getElementById('agent-missing');
    if (me) me.style.color = missH > 2 ? '#dc2626' : missH > 0 ? '#f59e0b' : '#16a34a';

    const s = document.getElementById('aux-summary');
    if (s) s.innerHTML = `
      <div class="aux-summary-row"><span>🟢 Online:</span><strong>${(t.online/60).toFixed(1)}h</strong></div>
      <div class="aux-summary-row"><span>🟡 Break:</span><strong>${(t.break/60).toFixed(1)}h</strong> / 1h</div>
      <div class="aux-summary-row"><span>🟠 Meeting:</span><strong>${(t.meeting/60).toFixed(1)}h</strong></div>
      <div class="aux-summary-row"><span>🔵 Training:</span><strong>${(t.training/60).toFixed(1)}h</strong></div>
      <div class="aux-summary-row"><span>🟣 Coaching:</span><strong>${(t.coaching/60).toFixed(1)}h</strong></div>
      <div class="aux-summary-row total"><span>📊 Login:</span><strong>${loginH.toFixed(1)}h</strong> / 8h</div>
      <div class="aux-summary-row ${missH > 0 ? 'warn' : 'good'}"><span>⏳ Missing:</span><strong>${missH.toFixed(1)}h</strong></div>`;
  } catch (e) { console.warn('loadSummary:', e); }
}