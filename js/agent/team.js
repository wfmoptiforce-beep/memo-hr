// ═══════════════════════════════════
// 👥 AGENT TEAM ONLINE + NUDGE SYSTEM
// ═══════════════════════════════════

console.log('✅ team.js loaded');

// ✅ LOAD TEAM MEMBERS (Simplified)
window.loadTeamOnline = async function () {
  try {
    if (!window.sb || !window.APP?.CU) {
      console.warn('Auth not ready');
      return;
    }

    // Get all team members (exclude self)
    const { data: members } = await sb
      .from('profiles')
      .select('id, full_name, email, role, status')
      .neq('id', APP.CU.id);

    if (!members) return;

    const online = members.filter(m => m.status && m.status !== 'offline');
    const offline = members.filter(m => !m.status || m.status === 'offline');
    const breakCount = members.filter(m => m.status === 'break').length;

    // Update supervisor cards (if exists)
    if (document.getElementById('sup-team-count')) {
      safeText('sup-team-count', String(members.length));
      safeText('sup-online-count', String(online.length));
      safeText('sup-break-count', String(breakCount));
      safeText('sup-offline-count', String(offline.length));
    }

    // Team table (supervisor view)
    const tbody = document.getElementById('sup-team-tbody');
    if (tbody) {
      if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No team members</td></tr>';
        return;
      }

      tbody.innerHTML = members.map(m => {
        const st = m.status || 'offline';
        const color = getStatusColor(st);

        return `
          <tr>
            <td><strong>${m.full_name || 'Unknown'}</strong></td>
            <td><span style="color:${color};font-weight:600;">● ${st}</span></td>
            <td>${m.role || 'agent'}</td>
            <td>-</td>
            <td>
              <button 
                class="btn-sm" 
                onclick="nudgeUser('${m.id}', '${(m.full_name || '').replace(/'/g, "\\'")}')">
                👋 Nudge
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Agent team online widget
    const agentTeam = document.getElementById('agent-timeline');
    if (agentTeam && online.length > 0) {
      agentTeam.innerHTML = `
        <h4 style="margin-bottom:8px;">👥 Team Online Now (${online.length})</h4>
        ${online.map(m => `
          <div class="team-online-item" 
            style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f0fdf4;border-radius:8px;margin-bottom:6px;border-left:4px solid ${getStatusColor(m.status)};">
            <div>
              <strong>${m.full_name || 'Unknown'}</strong>
              <br>
              <small style="color:#6b7280;">${m.role || 'agent'}</small>
            </div>
            <button 
              class="btn-sm" 
              onclick="nudgeUser('${m.id}', '${(m.full_name || '').replace(/'/g, "\\'")}')">
              👋
            </button>
          </div>
        `).join('')}
      `;
    }

    // Empty state
    if (agentTeam && online.length === 0) {
      agentTeam.innerHTML = '<p style="color:#9ca3af;font-size:13px;">No team members online</p>';
    }

  } catch (e) {
    console.warn('loadTeamOnline error:', e);
  }
};

// ✅ NUDGE FUNCTION
window.nudgeUser = async function (userId, name) {
  try {
    if (!window.sb || !window.APP?.CU) return;

    // Insert notification
    const { error } = await sb.from('notifications').insert({
      user_id: userId,
      from_id: APP.CU.id,
      from_name: APP.CP?.full_name || 'Someone',
      type: 'nudge',
      message: '👋 ' + (APP.CP?.full_name || 'Someone') + ' nudged you!',
      read: false,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.warn('Nudge insert error:', error);
      return;
    }

    // Success feedback (no alert)
    showToast('✅ Nudge sent to ' + (name || 'user'));

  } catch (e) {
    console.warn('nudgeUser error:', e);
    showToast('❌ Failed to send nudge');
  }
};

// ✅ HELPER: Get Status Color
function getStatusColor(status) {
  const colors = {
    online: '#16a34a',
    break: '#eab308',
    meeting: '#f97316',
    training: '#3b82f6',
    coaching: '#8b5cf6',
    offline: '#dc2626'
  };
  return colors[status] || '#6b7280';
}

// ✅ HELPER: Toast Notification
function showToast(message) {
  // Simple toast (optional - can be enhanced)
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: #111827; color: #fff; padding: 12px 16px;
    border-radius: 8px; font-size: 13px; z-index: 9999;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ✅ AUTO-REFRESH (every 30 seconds)
setInterval(() => {
  if (window.APP?.CU?.id && typeof loadTeamOnline === 'function') {
    loadTeamOnline();
  }
}, 30000);

// ✅ LOAD ON INIT
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadTeamOnline, 500);
});