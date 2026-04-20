// ═══════════════════════════════════
// 👥 TEAM ONLINE + NUDGE
// ═══════════════════════════════════

window.loadTeamOnline = async function() {
  try {
    const { data: members } = await sb.from('profiles')
      .select('id, full_name, status, current_aux, aux_since, last_seen')
      .neq('id', APP.CU?.id || '');

    if (!members) return;

    const online = members.filter(m => m.status && m.status !== 'offline');
    const offline = members.filter(m => !m.status || m.status === 'offline');

    // Update supervisor cards
    safeText('sup-team-count', String(members.length));
    safeText('sup-online-count', String(online.length));
    safeText('sup-break-count', String(members.filter(m => m.status === 'break').length));
    safeText('sup-offline-count', String(offline.length));

    // Team table
    const tbody = document.getElementById('sup-team-tbody');
    if (tbody) {
      if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No team members</td></tr>';
        return;
      }
      tbody.innerHTML = members.map(m => {
        const st = m.status || 'offline';
        const color = st === 'online' ? '#16a34a' : st === 'break' ? '#eab308' :
                      st === 'meeting' ? '#f97316' : st === 'training' ? '#3b82f6' :
                      st === 'coaching' ? '#8b5cf6' : '#dc2626';
        const since = m.aux_since ? new Date(m.aux_since).toLocaleTimeString() : '-';
        const seen = m.last_seen ? new Date(m.last_seen).toLocaleTimeString() : '-';
        return `<tr>
          <td><strong>${m.full_name || 'Unknown'}</strong></td>
          <td><span style="color:${color};font-weight:600;">● ${st}</span></td>
          <td>${since}</td>
          <td>-</td>
          <td><button class="btn-sm" onclick="nudgeUser('${m.id}','${m.full_name || ''}')">👋 Nudge</button></td>
        </tr>`;
      }).join('');
    }

    // Agent team online widget
    const agentTeam = document.getElementById('agent-timeline');
    if (agentTeam && online.length > 0) {
      agentTeam.innerHTML = '<h4 style="margin-bottom:8px;">👥 Team Online Now</h4>' +
        online.map(m => `<div class="team-online-item" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f0fdf4;border-radius:8px;margin-bottom:6px;">
          <span><strong>${m.full_name || 'Unknown'}</strong> — <span style="color:${m.status === 'break' ? '#eab308' : '#16a34a'}">${m.current_aux || m.status}</span></span>
          <button class="btn-sm" onclick="nudgeUser('${m.id}','${m.full_name || ''}')">👋</button>
        </div>`).join('');
    }

  } catch (e) { console.warn('loadTeamOnline:', e); }
};

window.nudgeUser = async function(userId, name) {
  try {
    await sb.from('notifications').insert({
      user_id: userId,
      from_id: APP.CU.id,
      type: 'nudge',
      message: (APP.CP?.full_name || 'Someone') + ' nudged you! 👋',
      read: false,
      created_at: new Date().toISOString()
    });
    alert('👋 Nudge sent to ' + name);
  } catch (e) {
    console.warn('nudge error:', e);
    alert('❌ Nudge failed');
  }
};

// Auto refresh
setInterval(() => {
  if (APP.CU?.id && typeof loadTeamOnline === 'function') loadTeamOnline();
}, 30000);