// ═══════════════════════════════════
// ⭐ QUALITY MONITORING & QA SYSTEM
// ═══════════════════════════════════

console.log('✅ monitoring.js loaded');

// ✅ SUBMIT EVALUATION
window.submitEval = async function () {
  try {
    // Permission check
    if (!isQuality()) {
      showToast('❌ You don\'t have permission', 'error');
      return;
    }

    // Get inputs
    const agentId = document.getElementById('eval-agent')?.value?.trim();
    const score = document.getElementById('eval-score')?.value?.trim();
    const notes = document.getElementById('eval-notes')?.value?.trim();
    const msg = document.getElementById('eval-msg');

    // Validate
    if (!agentId || !score) {
      if (msg) {
        msg.textContent = '⚠️ Select agent and score';
        msg.style.color = '#dc2626';
      }
      return;
    }

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      if (msg) {
        msg.textContent = '⚠️ Score must be 0-100';
        msg.style.color = '#dc2626';
      }
      return;
    }

    if (!window.sb || !APP.CU) {
      showToast('❌ Not authenticated', 'error');
      return;
    }

    // Show loading
    if (msg) {
      msg.textContent = '⏳ Submitting...';
      msg.style.color = '#6b7280';
    }

    // Generate monitor ID
    const monitorId = 'MON-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    // Insert quality score
    const { error: scoreError } = await sb.from('quality_scores').insert({
      agent_id: agentId,
      evaluator_id: APP.CU.id,
      monitor_id: monitorId,
      score: scoreNum,
      notes: notes || '',
      date: todayISO(),
      created_at: new Date().toISOString()
    });

    if (scoreError) {
      throw scoreError;
    }

    // Notify agent
    try {
      await sb.from('notifications').insert({
        user_id: agentId,
        from_id: APP.CU.id,
        from_name: APP.CP?.full_name || 'QA Monitor',
        type: 'quality',
        message: `📋 New QA Monitor: ${monitorId} — Score: ${scoreNum}%`,
        read: false,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Notification failed:', e);
    }

    // Success
    if (msg) {
      msg.textContent = '✅ Evaluation submitted! ID: ' + monitorId;
      msg.style.color = '#16a34a';
    }

    showToast('✅ Quality score recorded', 'success');

    // Clear form
    if (document.getElementById('eval-agent')) {
      document.getElementById('eval-agent').value = '';
    }
    if (document.getElementById('eval-score')) {
      document.getElementById('eval-score').value = '';
    }
    if (document.getElementById('eval-notes')) {
      document.getElementById('eval-notes').value = '';
    }

    // Close modal after 1s
    setTimeout(() => {
      closeModal('new-eval');
      loadQualityMonitoring();
    }, 1000);

  } catch (e) {
    const msg = document.getElementById('eval-msg');
    if (msg) {
      msg.textContent = '❌ ' + (e.message || 'Submission failed');
      msg.style.color = '#dc2626';
    }
    console.error('submitEval error:', e);
    showToast('❌ Failed to submit evaluation', 'error');
  }
};

// ✅ LOAD QUALITY MONITORING PANEL
window.loadQualityMonitoring = async function () {
  try {
    if (!window.sb) {
      console.warn('Supabase not ready');
      return;
    }

    // ─── Load Agents for Dropdown ───
    const { data: agents, error: agentsError } = await sb
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'agent')
      .order('full_name');

    const sel = document.getElementById('eval-agent');
    if (sel && agents && agents.length > 0) {
      sel.innerHTML = '<option value="">Select agent...</option>' +
        agents.map(a => `<option value="${a.id}">${a.full_name || a.id}</option>`).join('');
    }

    // ─── Load Quality Scores ───
    const { data: evals, error: evalsError } = await sb
      .from('quality_scores')
      .select(`
        id,
        agent_id,
        score,
        notes,
        date,
        monitor_id,
        created_at,
        profiles:agent_id(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (evalsError) {
      console.warn('Load evals error:', evalsError);
      return;
    }

    if (!evals || evals.length === 0) {
      safeText('qa-total-evals', '0');
      safeText('qa-avg-score', '—');
      safeText('qa-pass-rate', '—');
      safeText('qa-fail-count', '0');

      const tbody = document.getElementById('qa-evals-tbody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No evaluations yet</td></tr>';
      }
      return;
    }

    // ─── Calculate Stats ───
    const totalEvals = evals.length;
    const avgScore = Math.round(evals.reduce((sum, e) => sum + (e.score || 0), 0) / totalEvals);
    const passCount = evals.filter(e => (e.score || 0) >= 80).length;
    const failCount = totalEvals - passCount;
    const passRate = Math.round((passCount / totalEvals) * 100);

    // ─── Update Stat Cards ───
    safeText('qa-total-evals', String(totalEvals));
    safeText('qa-avg-score', avgScore + '%');
    safeText('qa-pass-rate', passRate + '%');
    safeText('qa-fail-count', String(failCount));

    // ─── Calculate Agent Performance ───
    const agentScores = {};
    evals.forEach(e => {
      if (!agentScores[e.agent_id]) {
        agentScores[e.agent_id] = {
          name: e.profiles?.full_name || 'Unknown',
          scores: [],
          avg: 0
        };
      }
      agentScores[e.agent_id].scores.push(e.score);
    });

    // Calculate averages
    Object.keys(agentScores).forEach(agentId => {
      const scores = agentScores[agentId].scores;
      agentScores[agentId].avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    });

    // ─── Update Evaluations Table ───
    const tbody = document.getElementById('qa-evals-tbody');
    if (tbody) {
      tbody.innerHTML = evals.map(e => {
        const isPassed = (e.score || 0) >= 80;
        const statusClass = isPassed ? 'good' : 'warn';
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

    // ─── Agent Performance Summary ───
    const agentPerfDiv = document.getElementById('qa-agent-perf');
    if (agentPerfDiv) {
      const sortedAgents = Object.entries(agentScores)
        .sort((a, b) => b[1].avg - a[1].avg);

      agentPerfDiv.innerHTML = `
        <h4 style="margin-bottom:12px;">Agent Performance (Avg Scores)</h4>
        ${sortedAgents.map(([agentId, data]) => {
          const isPassed = data.avg >= 80;
          return `
            <div class="aux-summary-row ${isPassed ? 'good' : 'warn'}" style="margin-bottom:8px;">
              <div>
                <strong>${data.name}</strong>
                <br>
                <small style="color:#6b7280;">${data.scores.length} evaluation(s)</small>
              </div>
              <strong style="font-size:18px;">${data.avg}%</strong>
            </div>
          `;
        }).join('')}
      `;
    }

    console.log('✅ Quality monitoring loaded:', {
      totalEvals,
      avgScore,
      passRate
    });

  } catch (e) {
    console.error('loadQualityMonitoring error:', e);
    showToast('❌ Failed to load quality data', 'error');
  }
};

// ✅ AUTO-REFRESH
setInterval(() => {
  if (APP.CU?.id && isQuality() && typeof loadQualityMonitoring === 'function') {
    loadQualityMonitoring();
  }
}, 60000); // Every 60 seconds

// ✅ INITIALIZE ON DOM LOAD
document.addEventListener('DOMContentLoaded', () => {
  if (isQuality()) {
    loadQualityMonitoring();
  }
});

console.log('✅ monitoring.js fully loaded');