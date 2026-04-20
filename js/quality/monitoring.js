// ═══════════════════════════════════
// ⭐ QUALITY MONITORING
// ═══════════════════════════════════

window.submitEval = async function() {
  const agentId = document.getElementById('eval-agent')?.value;
  const score = document.getElementById('eval-score')?.value;
  const notes = document.getElementById('eval-notes')?.value;
  const msg = document.getElementById('eval-msg');

  if (!agentId || !score) {
    if (msg) msg.textContent = '⚠️ Select agent and score';
    return;
  }

  try {
    const monitorId = 'MON-' + Date.now();

    await sb.from('quality_scores').insert({
      agent_id: agentId,
      evaluator_id: APP.CU.id,
      monitor_id: monitorId,
      score: parseInt(score),
      notes: notes || '',
      date: todayISO(),
      created_at: new Date().toISOString()
    });

    // Notify agent
    await sb.from('notifications').insert({
      user_id: agentId,
      from_id: APP.CU.id,
      type: 'quality',
      message: `📋 New QA Monitor: ${monitorId} — Score: ${score}%`,
      read: false,
      created_at: new Date().toISOString()
    });

    if (msg) { msg.textContent = '✅ Evaluation submitted! ID: ' + monitorId; msg.style.color = '#16a34a'; }
    closeModal('new-eval');
    loadQualityPanel();
  } catch (e) {
    if (msg) msg.textContent = '❌ ' + e.message;
  }
};

window.loadQualityPanel = async function() {
  try {
    // Load agents for dropdown
    const { data: agents } = await sb.from('profiles').select('id, full_name, role')
      .in('role', ['agent']);
    const sel = document.getElementById('eval-agent');
    if (sel && agents) {
      sel.innerHTML = '<option value="">Select agent...</option>' +
        agents.map(a => `<option value="${a.id}">${a.full_name || a.id}</option>`).join('');
    }

    // Load evaluations
    const { data: evals } = await sb.from('quality_scores')
      .select('*, profiles!quality_scores_agent_id_fkey(full_name)')
      .order('created_at', { ascending: false }).limit(50);

    if (evals) {
      safeText('qa-total-evals', String(evals.length));
      const avg = evals.length > 0 ? Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length) : 0;
      safeText('qa-avg-score', avg + '%');
      const pass = evals.filter(e => e.score >= 80);
      safeText('qa-pass-rate', evals.length > 0 ? Math.round((pass.length / evals.length) * 100) + '%' : '0%');
      safeText('qa-fail-count', String(evals.length - pass.length));

      const tbody = document.getElementById('qa-evals-tbody');
      if (tbody) {
        tbody.innerHTML = evals.map(e => `<tr>
          <td>${e.profiles?.full_name || '-'}</td>
          <td>${e.date}</td>
          <td><strong>${e.score}%</strong></td>
          <td>${e.score >= 80 ? '✅ Pass' : '❌ Fail'}</td>
          <td>${e.monitor_id || '-'}</td>
        </tr>`).join('');
      }
    }
  } catch (e) { console.warn('loadQualityPanel:', e); }
};