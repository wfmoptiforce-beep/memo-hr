// ═══════════════════════════════════
// 👥 ADMIN: USER MANAGEMENT & LEAVES
// ═══════════════════════════════════

console.log('✅ users.js loaded');

window.loadAdminPanel = async function () {
  try {
    if (!window.sb || !window.safeText || !window.todayISO) {
      console.warn('Admin core not ready');
      return;
    }

    // 1. جلب بيانات الموظفين
    const { data: users } = await sb.from('profiles').select('*');
    if (!users) return;

    const online = users.filter(u => u.status && u.status !== 'offline');
    const today = todayISO();

    safeText('admin-total-users', String(users.length));
    safeText('admin-online-count', String(online.length));

    // 2. نسبة الحضور (Attendance rate)
    const { data: att } = await sb
      .from('attendance')
      .select('user_id')
      .eq('date', today);

    const attended = att?.length || 0;
    const attRate = users.length > 0
      ? Math.round((attended / users.length) * 100)
      : 0;

    safeText('admin-att-rate', attRate + '%');
    safeText('admin-absent-count', String(users.length - attended));

    // 3. جدول الموظفين (User Management)
    const tbody = document.getElementById('admin-users-tbody');
    if (tbody) {
      tbody.innerHTML = users.map(u => {
        const st = u.status || 'offline';
        const stColor = st === 'offline' ? '#dc2626' : '#16a34a';

        return `
          <tr>
            <td><strong>${u.full_name || '-'}</strong></td>
            <td>${u.email || '-'}</td>
            <td>${u.role || 'agent'}</td>
            <td><span style="color:${stColor};font-weight:600;">● ${st}</span></td>
            <td>
              <select
                onchange="changeUserRole('${u.id}', this.value)"
                style="padding:4px 8px;border-radius:6px;border:1px solid #d1d5db;">
                <option value="agent" ${u.role === 'agent' ? 'selected' : ''}>Agent</option>
                <option value="supervisor" ${u.role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                <option value="quality" ${u.role === 'quality' ? 'selected' : ''}>Quality</option>
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="suspended" ${u.role === 'suspended' ? 'selected' : ''}>⛔ Suspended</option>
                <option value="inactive" ${u.role === 'inactive' ? 'selected' : ''}>🔒 Inactive</option>
                <option value="long_leave" ${u.role === 'long_leave' ? 'selected' : ''}>🏖️ Long Leave</option>
              </select>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 4. ✅ جديد: جدول طلبات الإجازات المعلقة (Pending Leaves)
    // ده اللي هيخليكي تشوفي الطلب وتوافقي عليه
    const { data: pendingLeaves } = await sb
      .from('leaves')
      .select('*')
      .eq('status', 'Pending');

    const leavesTbody = document.getElementById('admin-leaves-tbody');
    if (leavesTbody) {
      if (!pendingLeaves || pendingLeaves.length === 0) {
        leavesTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:gray;">No pending requests</td></tr>';
      } else {
        leavesTbody.innerHTML = pendingLeaves.map(l => `
          <tr>
            <td><strong>${l.agent_name || 'Agent'}</strong></td>
            <td>${l.leave_type}</td>
            <td><small>${l.start_date} to ${l.end_date}</small></td>
            <td>
              <button onclick="processLeave('${l.id}', 'Approved')" style="background:#16a34a;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">Approve</button>
              <button onclick="processLeave('${l.id}', 'Rejected')" style="background:#dc2626;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:5px;">Reject</button>
            </td>
          </tr>
        `).join('');
      }
    }

  } catch (e) {
    console.warn('loadAdminPanel error:', e);
  }
};

// ✅ دالة معالجة الإجازة (موافقة أو رفض)
window.processLeave = async function (leaveId, newStatus) {
  try {
    const { error } = await sb.from('leaves').update({ status: newStatus }).eq('id', leaveId);
    if (error) throw error;
    alert('Leave ' + newStatus);
    loadAdminPanel(); // ريفريش للداتا
  } catch (e) {
    console.error('processLeave error:', e);
  }
};

window.addUser = async function () {
  const name = document.getElementById('mu-name')?.value?.trim();
  const email = document.getElementById('mu-email')?.value?.trim();
  const role = document.getElementById('mu-role')?.value;
  const pass = document.getElementById('mu-pass')?.value;
  const msg = document.getElementById('mu-msg');

  if (!name || !email || !pass) {
    if (msg) msg.textContent = '⚠️ Fill all fields';
    return;
  }

  try {
    const { data, error } = await sb.auth.signUp({ email, password: pass });
    if (error) {
      if (msg) msg.textContent = '❌ ' + error.message;
      return;
    }

    await sb.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: name,
      role,
      status: 'offline',
      created_at: new Date().toISOString()
    });

    if (msg) {
      msg.textContent = '✅ User created!';
      msg.style.color = '#16a34a';
    }

    if (window.closeModal) closeModal('add-user');
    loadAdminPanel();

  } catch (e) {
    if (msg) msg.textContent = '❌ ' + e.message;
  }
};

window.changeUserRole = async function (userId, newRole) {
  try {
    await sb.from('profiles').update({ role: newRole }).eq('id', userId);
    console.log('✅ Role updated');
    loadAdminPanel();
  } catch (e) {
    console.warn('changeUserRole:', e);
  }
};