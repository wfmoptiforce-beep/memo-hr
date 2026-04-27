// ═══════════════════════════════════
// ⭐ QUALITY MONITORING & QA SYSTEM
// ═══════════════════════════════════

console.log('✅ monitoring.js loaded with fixes');

function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

// ✅ تم تصحيح اسم الدالة لتتطابق مع زرار الـ HTML
window.submitEvaluation = async function () {
  try {
    if (!isQuality()) {
      showToast('❌ You don\'t have permission', 'error');
      return;
    }

    const agentId = document.getElementById('eval-agent')?.value?.trim();
    const selectedDate = document.getElementById('eval-date')?.value;
    const score = document.getElementById('eval-score')?.value?.trim();
    const notes = document.getElementById('eval-notes')?.value?.trim();
    const msg = document.getElementById('eval-msg');

    if (!agentId || !score) {
      if (msg) { msg.textContent = '⚠️ Please select an agent and enter a score'; msg.style.color = '#dc2626'; }
      return;
    }

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      if (msg) { msg.textContent = '⚠️ Score must be between 0 and 100'; msg.style.color = '#dc2626'; }
      return;
    }

    if (!window.sb || !APP.CU) return;

    if (msg) { msg.textContent = '⏳ Submitting...'; msg.style.color = '#6b7280'; }

    const monitorId = 'MON-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const evalDate = selectedDate ? selectedDate : todayISO(); // يستخدم التاريخ المختار أو تاريخ اليوم

    const { error: scoreError } = await window.sb.from('quality_scores').insert({
      agent_id: agentId,
      evaluator_id: APP.CU.id,
      monitor_id: monitorId,
      score: scoreNum,
      notes: notes || '',
      date: evalDate,
      created_at: new Date().toISOString()
    });

    if (scoreError) throw scoreError;

    try {
      await window.sb.from('notifications').insert({
        user_id: agentId,
        from_id: APP.CU.id,
        from_name: APP.CP?.full_name || 'QA Monitor',
        type: 'quality',
        message: `📋 New QA Monitor: ${monitorId} — Score: ${scoreNum}%`,
        read: false,
        created_at: new Date().toISOString()
      });
    } catch (e) { console.warn('Notification failed:', e); }

    if (msg) { msg.textContent = '✅ Evaluation submitted! ID: ' + monitorId; msg.style.color = '#16a34a'; }

    if (document.getElementById('eval-agent')) document.getElementById('eval-agent').value = '';
    if (document.getElementById('eval-score')) document.getElementById('eval-score').value = '';
    if (document.getElementById('eval-notes')) document.getElementById('eval-notes').value = '';
    if (document.getElementById('eval-date')) document.getElementById('eval-date').value = '';

    setTimeout(() => {
      closeModal('new-eval');
      if (msg) msg.textContent = '';
      loadQualityMonitoring();
    }, 1500);

  } catch (e) {
    const msg = document.getElementById('eval-msg');
    if (msg) { msg.textContent = '❌ ' + (e.message || 'Submission failed'); msg.style.color = '#dc2626'; }
  }
};

window.loadQualityMonitoring = async function () {
  try {
    if (!window.sb) return;

    // تحميل أسماء الأيجنتس في القائمة المنسدلة
    const { data: agents } = await window.sb.from('profiles').select('id, full_name').eq('role', 'agent').order('full_name');
    const sel = document.getElementById('eval-agent');
    if (sel && agents && agents.length > 0) {
      sel.innerHTML = '<option value="">Select agent...</option>' + agents.map(a => `<option value="${a.id}">${a.full_name || a.id}</option>`).join('');
    }

    const { data: evals, error: evalsError } = await window.sb
      .from('quality_scores')
      .select(`id, agent_id, score, notes, date, monitor_id, created_at, profiles:agent_id(full_name)`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (evalsError) {
      console.warn('⚠️ Table quality_scores may not exist yet.');
      return; 
    }

    if (!evals || evals.length === 0) {
      safeText('qa-total-evals', '0'); safeText('qa-avg-score', '—'); safeText('qa-pass-rate', '—'); safeText('qa-fail-count', '0');
      const tbody = document.getElementById('qa-evals-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No evaluations yet</td></tr>';
      return;
    }

    const totalEvals = evals.length;
    const avgScore = Math.round(evals.reduce((sum, e) => sum + (e.score || 0), 0) / totalEvals);
    const passCount = evals.filter(e => (e.score || 0) >= 80).length;
    const failCount = totalEvals - passCount;
    const passRate = Math.round((passCount / totalEvals) * 100);

    safeText('qa-total-evals', String(totalEvals));
    safeText('qa-avg-score', avgScore + '%');
    safeText('qa-pass-rate', passRate + '%');
    safeText('qa-fail-count', String(failCount));

    const tbody = document.getElementById('qa-evals-tbody');
    if (tbody) {
      tbody.innerHTML = evals.map(e => {
        const isPassed = (e.score || 0) >= 80;
        const statusText = isPassed ? '✅ Pass' : '❌ Fail';
        return `
          <tr>
            <td><strong>${e.profiles?.full_name || 'Unknown'}</strong></td>
            <td>${e.date || '-'}</td>
            <td><strong style="color:${isPassed ? '#16a34a' : '#dc2626'}">${e.score || 0}%</strong></td>
            <td><span style="padding:4px 8px;border-radius:6px;background:${isPassed ? '#dcfce7' : '#fef3c7'};color:${isPassed ? '#166534' : '#92400e'};font-size:12px;font-weight:600;">${statusText}</span></td>
            <td><small style="color:#6b7280;">${e.monitor_id || '-'}</small></td>
          </tr>
        `;
      }).join('');
    }
  } catch (e) { console.error('loadQualityMonitoring error:', e); }
};

window.loadAgentQualityEvaluations = async function() {
    if (!window.sb || !APP.CU) return;
    try {
        const { data: myEvals, error } = await window.sb
            .from('quality_scores')
            .select('*')
            .eq('agent_id', APP.CU.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const listDiv = document.getElementById('agent-qa-list');
        if (!listDiv) return;

        if (error || !myEvals || myEvals.length === 0) {
            listDiv.innerHTML = '<p style="text-align:center; color:gray;">No recent evaluations found.</p>';
            return;
        }

        listDiv.innerHTML = myEvals.map(e => {
            const isPassed = e.score >= 80;
            const color = isPassed ? '#16a34a' : '#dc2626';
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:8px; margin-bottom:8px;">
                    <div>
                        <strong style="display:block; color:#374151;">ID: ${e.monitor_id}</strong>
                        <span style="font-size:13px; color:#6b7280;">Date: ${e.date}</span>
                    </div>
                    <div style="text-align:right;">
                        <strong style="font-size:18px; color:${color};">${e.score}%</strong>
                        <br>
                        <button class="btn-secondary btn-sm" onclick="requestQaMeeting('${e.monitor_id}')" style="margin-top:5px; padding:2px 6px; font-size:11px;">Request Meeting</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch(e) { console.error("Error loading agent QA:", e); }
};

window.requestQaMeeting = async function(monitorId) {
    if (!confirm(`Are you sure you want to request a meeting for monitor ${monitorId}?`)) return;
    try {
        const { data: evalData } = await window.sb.from('quality_scores').select('evaluator_id').eq('monitor_id', monitorId).single();
        
        if (evalData && evalData.evaluator_id) {
            await window.sb.from('notifications').insert({
                user_id: evalData.evaluator_id,
                from_id: APP.CU.id,
                from_name: APP.CP?.full_name || 'Agent',
                type: 'meeting_request',
                message: `📅 ${APP.CP?.full_name} is requesting a meeting regarding Monitor ID: ${monitorId}`,
                read: false,
                created_at: new Date().toISOString()
            });
            alert('Meeting request sent successfully to the QA who evaluated you.');
        } else {
            alert('Could not find the evaluator. Please contact your supervisor.');
        }
    } catch(e) {
        console.error("Meeting request error:", e);
        alert('Failed to send request.');
    }
};

document.addEventListener('APP_READY', () => {
  if (isQuality()) {
    loadQualityMonitoring();
  }
  if (APP.CP?.role === 'agent') {
      loadAgentQualityEvaluations();
  }
});