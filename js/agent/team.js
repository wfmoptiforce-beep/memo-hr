// ═══════════════════════════════════
// 👥 AGENT TEAM ONLINE + NUDGE SYSTEM
// ═══════════════════════════════════

console.log('✅ team.js loaded');

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

// ✅ LOAD TEAM MEMBERS
window.loadTeamOnline = async function () {
  if (!window.sb || !window.APP || !APP.CU) return;

  try {
    const { data: members, error } = await window.sb
      .from('profiles')
      .select('id, full_name, email, role, status')
      .neq('id', APP.CU.id); // استبعاد الشخص نفسه من القائمة

    if (error || !members) return;

    const online = members.filter(m => m.status && m.status !== 'offline' && m.status !== 'long_leave' && m.status !== 'suspended');
    const offline = members.filter(m => !m.status || m.status === 'offline');
    const breakCount = members.filter(m => m.status === 'break').length;

    // ─── تحديث لوحة السوبرفايزر (Attendance Panel) ───
    if (document.getElementById('sup-team-count')) {
      document.getElementById('sup-team-count').textContent = members.length;
      document.getElementById('sup-online-count').textContent = online.length;
      document.getElementById('sup-break-count').textContent = breakCount;
      document.getElementById('sup-offline-count').textContent = offline.length;
    }

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
              <td><span style="color:${color};font-weight:600;">● ${st.toUpperCase()}</span></td>
              <td>${m.role || 'agent'}</td>
              <td>-</td>
              <td>
                <button class="btn-primary btn-sm" style="background:#3b82f6; border:none;" onclick="nudgeUser('${m.id}', '${safeName}')">👋 Nudge</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // ─── تحديث قائمة الأونلاين للأيجنت في الداشبورد ───
    const agentTeamList = document.getElementById('online-team-list');
    if (agentTeamList) {
      if (online.length === 0) {
        agentTeamList.innerHTML = '<p style="color:#9ca3af;font-size:13px; text-align:center;">No one else is online right now.</p>';
      } else {
        agentTeamList.innerHTML = online.map(m => {
          const safeName = (m.full_name || 'User').replace(/'/g, "\\'");
          const color = getStatusColor(m.status);
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid #eee;">
              <div style="display:flex; align-items:center; gap:10px;">
                 <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${color}; box-shadow: 0 0 5px ${color};"></span>
                 <div>
                    <strong style="color:#374151;">${m.full_name || 'Unknown'}</strong>
                    <span style="font-size:11px; color:#6b7280; display:block; text-transform: uppercase;">${m.status}</span>
                 </div>
              </div>
              <button class="btn-primary btn-sm" style="background:#3b82f6; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;"
                onclick="nudgeUser('${m.id}', '${safeName}')">
                👉 Nudge
              </button>
            </div>
          `;
        }).join('');
      }
    }

  } catch (e) { console.error('loadTeamOnline error:', e); }
};

// ✅ NUDGE USER
window.nudgeUser = async function (userId, name) {
  if (!window.sb || !APP.CU) return;

  try {
    const { error } = await window.sb.from('notifications').insert({
      user_id: userId,
      from_id: APP.CU.id,
      from_name: APP.CP?.full_name || 'A teammate',
      type: 'nudge',
      message: `👉 ${APP.CP?.full_name || 'A teammate'} is nudging you! They might need your help.`,
      read: false,
      created_at: new Date().toISOString()
    });

    if (!error) {
      alert(`✅ Nudge sent successfully to ${name}!`);
    } else {
        throw error;
    }
  } catch (e) {
    alert('❌ Failed to send nudge. Please try again.');
    console.error(e);
  }
};

// تحديث القائمة تلقائياً
document.addEventListener('APP_READY', () => {
    window.loadTeamOnline();
});

setInterval(() => {
  if (APP.CU?.id) window.loadTeamOnline();
}, 30000);