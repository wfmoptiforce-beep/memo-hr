// ═══════════════════════════════════
// 👥 AGENT TEAM ONLINE + NUDGE SYSTEM
// ═══════════════════════════════════

console.log('✅ team.js loaded');

// ✅ LOAD TEAM MEMBERS (SAFE – AFTER AUTH ONLY)
window.loadTeamOnline = async function () {
  // ✅ HARD GUARD
  if (!window.sb || !window.APP || !APP.CU) {
    // مش Error – ده طبيعي قبل Login
    return;
  }

  try {
    // Get all team members (exclude self)
    const { data: members, error } = await sb
      .from('profiles')
      .select('id, full_name, email, role, status')
      .neq('id', APP.CU.id);

    if (error) {
      console.warn('Team fetch error:', error);
      return;
    }

    if (!members) return;

    const online = members.filter(m => m.status && m.status !== 'offline');
    const offline = members.filter(m => !m.status || m.status === 'offline');
    const breakCount = members.filter(m => m.status === 'break').length;

    // ✅ Supervisor cards
    if (document.getElementById('sup-team-count')) {
      safeText('sup-team-count', String(members.length));
      safeText('sup-online-count', String(online.length));
      safeText('sup-break-count', String(breakCount));
      safeText('sup-offline-count', String(offline.length));
    }

    // ✅ Supervisor table
    const tbody = document.getElementById('sup-team-tbody');
    if (tbody) {
      if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No team members</td></tr>';
      } else {
        tbody.innerHTML = members.map(m => {
          const st = m.status || 'offline';
          const color = getStatusColor(st);
          const safeName = (m.full_name || 'User').replace(/'/g, "\\'");

          return `
            <tr>
              <td><strong>${m.full_name || 'Unknown'}</strong></td>
              <td><span style="color:${color};font-weight:600;">● ${st}</span></td>
              <td>${m.role || 'agent'}</td>
              <td>-</td>
              <td>
                <button class="btn-sm"
                  onclick="nudgeUser('${m.id}', '${safeName}')">
                  👋 Nudge
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // ✅ Agent timeline
    const agentTeam = document.getElementById('agent-timeline');
    if (agentTeam) {
      if (online.length === 0) {
        agentTeam.innerHTML =
          '<p style="color:#9ca3af;font-size:13px;">No team members online</p>';
      } else {
        agentTeam.innerHTML = `
          <h4 style="margin-bottom:8px;">👥 Team Online Now (${online.length})</h4>
          ${online.map(m => {
            const safeName = (m.full_name || 'User').replace(/'/g, "\\'");
            return `
              <div class="team-online-item"
                style="border-left:4px solid ${getStatusColor(m.status)};">
                <div>
                  <strong>${m.full_name || 'Unknown'}</strong><br>
                  <small>${m.role || 'agent'}</small>
                </div>
                <button class="btn-sm"
                  onclick="nudgeUser('${m.id}', '${safeName}')">👋</button>
              </div>
            `;
          }).join('')}
        `;
      }
    }

  } catch (e) {
    console.error('loadTeamOnline error:', e);
  }
};

// ✅ NUDGE USER
window.nudgeUser = async function (userId, name) {
  if (!window.sb || !APP.CU) return;

  try {
    const { error } = await sb.from('notifications').insert({
      user_id: userId,
      from_id: APP.CU.id,
      from_name: APP.CP?.full_name || 'Someone',
      type: 'nudge',
      message: '👋 ' + (APP.CP?.full_name || 'Someone') + ' nudged you!',
      read: false,
      created_at: new Date().toISOString()
    });

    if (!error) {
      showToast('✅ Nudge sent to ' + (name || 'user'), 'success');
    }
  } catch (e) {
    showToast('❌ Failed to send nudge', 'error');
  }
};

// ✅ STATUS COLOR HELPER
function getStatusColor(status) {
  return {
    online: '#16a34a',
    break: '#eab308',
    meeting: '#f97316',
    training: '#3b82f6',
    coaching: '#8b5cf6',
    offline: '#dc2626'
  }[status] || '#6b7280';
}

// ✅ AUTO REFRESH (SAFE – AFTER LOGIN ONLY)
setInterval(() => {
  if (APP.CU?.id) {
    loadTeamOnline();
  }
}, 30000);