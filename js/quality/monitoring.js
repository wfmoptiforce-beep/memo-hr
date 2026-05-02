// ═══════════════════════════════════
// 🎯 QUALITY MONITORING (monitoring.js)
// ═══════════════════════════════════
console.log('✅ quality/monitoring.js loaded');

// ─── تحميل الوكلاء في فورم التقييم ───────────────────────
window.loadAgentsIntoEvalForm = async function () {
  const sel = document.getElementById('eval-agent');
  if (!sel) return;

  try {
    const { data: users, error } = await window.sb
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['agent', 'leader', 'supervisor'])
      .order('full_name', { ascending: true });

    if (error) throw error;

    if (!users || users.length === 0) {
      sel.innerHTML = '<option value="">No agents found</option>';
      return;
    }

    sel.innerHTML = '<option value="">— Select Agent —</option>' +
      users.map(u => `<option value="${u.id}">${u.full_name || u.email} (${u.role})</option>`).join('');
  } catch (e) {
    console.error('loadAgentsIntoEvalForm error:', e);
    sel.innerHTML = '<option value="">Error loading agents</option>';
  }
};

// ─── إرسال تقييم جديد ───────────────────────────────────
window.submitEvaluation = async function () {
  const agentId = document.getElementById('eval-agent')?.value;
  const date = document.getElementById('eval-date')?.value;
  const score = parseFloat(document.getElementById('eval-score')?.value);
  const notes = document.getElementById('eval-notes')?.value?.trim();
  const msg = document.getElementById('eval-msg');

  if (!agentId || !date || isNaN(score)) {
    if (msg) { msg.textContent = '⚠️ Please fill Agent, Date and Score'; msg.style.color = '#dc2626'; }
    return;
  }

  if (score < 0 || score > 100) {
    if (msg) { msg.textContent = '⚠️ Score must be between 0 and 100'; msg.style.color = '#dc2626'; }
    return;
  }

  if (msg) { msg.textContent = '⏳ Submitting...'; msg.style.color = '#6b7280'; }

  try {
    const monitorId = 'MON-' + Date.now().toString(36).toUpperCase();
    const passed = score >= 70;

    const { error } = await window.sb.from('quality_evaluations').insert({
      agent_id: agentId,
      evaluator_id: APP.CU.id,
      evaluator_name: APP.CP?.full_name || 'QA',
      date: date,
      score: score,
      passed: passed,
      notes: notes || '',
      monitor_id: monitorId,
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    // إشعار للموظف
    try {
      await window.sb.from('notifications').insert({
        user_id: agentId,
        from_id: APP.CU.id,
        from_name: APP.CP?.full_name || 'Quality Team',
        type: 'qa_evaluation',
        message: `🎯 New QA Evaluation: ${score}/100 (${passed ? 'Pass ✅' : 'Fail ❌'}) - ID: ${monitorId}`,
        read: false,
        created_at: new Date().toISOString()
      });
    } catch (notifErr) {
      console.warn('Notification error (non-blocking):', notifErr);
    }

    if (msg) { msg.textContent = '✅ Evaluation submitted! Monitor ID: ' + monitorId; msg.style.color = '#16a34a'; }

    setTimeout(() => {
      if (window.closeModal) window.closeModal('new-eval');
      if (msg) msg.textContent = '';
      document.getElementById('eval-agent').value = '';
      document.getElementById('eval-date').value = '';
      document.getElementById('eval-score').value = '';
      document.getElementById('eval-notes').value = '';
      window.loadQAReports();
    }, 2000);

  } catch (e) {
    if (msg) { msg.textContent = '❌ Error: ' + e.message; msg.style.color = '#dc2626'; }
  }
};

// ─── طلب ميتينج بعد التقييم ───────────────────────────
window.requestMeeting = async function (agentId, monitorId) {
  try {
    // إرسال إشعار بطلب الميتينج
    await window.sb.from('notifications').insert({
      user_id: agentId,
      from_id: APP.CU.id,
      from_name: APP.CP?.full_name || 'Quality Team',
      type: 'meeting_request',
      message: `📞 Meeting Requested: Your QA Evaluation (ID: ${monitorId}) requires a discussion. Please acknowledge.`,
      read: false,
      created_at: new Date().toISOString()
    });
    
    alert('✅ Meeting request sent to the employee!');
  } catch (e) {
    console.error('Request meeting error:', e);
    alert('❌ Failed to send meeting request');
  }
};

// ─── تحميل تقارير الجودة في الجدول ─────────────────────
window.loadQAReports = async function () {
  try {
    const { data: evals, error } = await window.sb
      .from('quality_evaluations')
      .select(`
        *,
        agent:profiles!agent_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const tbody = document.getElementById('qa-evals-tbody');

    if (!evals || evals.length === 0) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:gray;">No evaluations yet.</td></tr>';
      window.safeText?.('qa-total-evals', '0');
      window.safeText?.('qa-avg-score', '—');
      window.safeText?.('qa-pass-rate', '—');
      window.safeText?.('qa-fail-count', '0');
      return;
    }

    // ─ KPI Cards ─
    const total = evals.length;
    const avgScore = (evals.reduce((s, e) => s + (e.score || 0), 0) / total).toFixed(1);
    const passed = evals.filter(e => e.passed).length;
    const failed = total - passed;
    const passRate = ((passed / total) * 100).toFixed(0) + '%';

    window.safeText?.('qa-total-evals', String(total));
    window.safeText?.('qa-avg-score', avgScore);
    window.safeText?.('qa-pass-rate', passRate);
    window.safeText?.('qa-fail-count', String(failed));

    // ─ Rows ─
    if (tbody) {
      tbody.innerHTML = evals.map(e => {
        const agentName = e.agent?.full_name || 'Unknown';
        const score = e.score ?? '—';
        const statusColor = e.passed ? '#16a34a' : '#dc2626';
        const statusText = e.passed ? '✅ Pass' : '❌ Fail';

        return `
          <tr>
            <td><strong>${agentName}</strong></td>
            <td>${e.date || '—'}</td>
            <td><strong style="font-size:16px;">${score}</strong>/100</td>
            <td><span style="color:${statusColor};font-weight:600;">${statusText}</span></td>
            <td><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">${e.monitor_id || '—'}</code></td>
          </tr>`;
      }).join('');
    }

    // ─ تقييمات الموظف نفسه (للداشبورد) ─
    if (APP.CP?.role === 'agent') {
      const myEvals = evals.filter(e => e.agent_id === APP.CU?.id);
      const agentQAList = document.getElementById('agent-qa-list');
      if (agentQAList) {
        if (myEvals.length === 0) {
          agentQAList.innerHTML = '<p style="text-align:center;color:gray;">No recent evaluations.</p>';
        } else {
          agentQAList.innerHTML = myEvals.slice(0, 5).map(e => {
            const c = e.passed ? '#16a34a' : '#dc2626';
            const bg = e.passed ? '#bbf7d0' : '#fecaca';
            return `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-left:4px solid ${c};border-radius:6px;margin-bottom:8px;background:var(--bg);">
                <div>
                  <strong>${e.date}</strong>
                  <div style="font-size:12px;color:gray;margin-top:2px;">ID: ${e.monitor_id || '—'}</div>
                </div>
                <div style="background:${bg};color:${c};padding:4px 12px;border-radius:20px;font-weight:700;">${e.score}/100</div>
              </div>`;
          }).join('');
        }
      }
    }

  } catch (e) {
    console.error('loadQAReports error:', e);
    const tbody = document.getElementById('qa-evals-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error loading data.</td></tr>';
  }
};

// ─── فتح مودال التقييم وتحميل الوكلاء ──────────────────
const _origOpenModal = window.openModal;
window.openModal = function (id) {
  if (typeof _origOpenModal === 'function') _origOpenModal(id);
  if (id === 'new-eval') {
    window.loadAgentsIntoEvalForm();
  }
};

// ─── تشغيل عند جهوزية التطبيق ───────────────────────────
document.addEventListener('APP_READY', () => {
  const role = APP.CP?.role;
  if (['admin', 'supervisor', 'quality', 'owner'].includes(role)) {
    window.loadQAReports();
  }
  if (role === 'agent') {
    window.loadQAReports();
  }
});
