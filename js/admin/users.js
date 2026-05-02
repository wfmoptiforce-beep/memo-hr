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

    const { data: users } = await sb.from('profiles').select('*');
    if (!users) return;

    const online = users.filter(u => u.status && u.status !== 'offline');
    const today = todayISO();

    safeText('admin-total-users', String(users.length));
    safeText('admin-online-count', String(online.length));

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

    // ✅ تحميل الإجازات المعلقة (بدون تعريف processLeave هنا - موجودة في leaves.js)
    if (typeof window.loadPendingLeaves === 'function') {
      window.loadPendingLeaves();
    }

  } catch (e) {
    console.warn('loadAdminPanel error:', e);
  }
};

window.addUser = async function () {
  const name = document.getElementById('mu-name')?.value?.trim();
  const email = document.getElementById('mu-email')?.value?.trim();
  const phone = document.getElementById('mu-phone')?.value?.trim();
  const pass = document.getElementById('mu-pass')?.value;
  const position = document.getElementById('mu-position')?.value;
  const role = document.getElementById('mu-role')?.value;
  const status = document.getElementById('mu-status')?.value;
  const firstDate = document.getElementById('mu-first-date')?.value || null;
  const lastDate = document.getElementById('mu-last-date')?.value || null;
  const msg = document.getElementById('mu-msg');

  if (!name || !email || !pass) {
    if (msg) { msg.textContent = '⚠️ Fill Name, Email & Password'; msg.style.color = '#dc2626'; }
    return;
  }

  if (pass.length < 6) {
    if (msg) { msg.textContent = '⚠️ Password must be at least 6 characters.'; msg.style.color = '#dc2626'; }
    return;
  }

  if (msg) { msg.textContent = '⏳ Creating account...'; msg.style.color = '#6b7280'; }

  try {
    const { data, error } = await window.sb.auth.signUp({ email, password: pass });
    if (error) {
      if (msg) { msg.textContent = '❌ ' + error.message; msg.style.color = '#dc2626'; }
      return;
    }

    await window.sb.from('profiles').upsert({
      id: data.user.id,
      email: email,
      full_name: name,
      phone: phone,
      position: position,
      role: role,
      status: status,
      join_date: firstDate,
      last_working_date: lastDate,
      created_at: new Date().toISOString()
    });

    if (msg) {
      msg.textContent = '✅ Employee added successfully!';
      msg.style.color = '#16a34a';
    }

    document.getElementById('mu-name').value = '';
    document.getElementById('mu-email').value = '';
    document.getElementById('mu-phone').value = '';
    document.getElementById('mu-pass').value = '';
    document.getElementById('mu-first-date').value = '';
    document.getElementById('mu-last-date').value = '';

    setTimeout(() => {
      if (window.closeModal) closeModal('add-user');
      if (msg) msg.textContent = '';
      if (typeof loadAdminPanel === 'function') loadAdminPanel();
    }, 1500);

  } catch (e) {
    if (msg) { msg.textContent = '❌ ' + e.message; msg.style.color = '#dc2626'; }
  }
};

window.changeUserRole = async function (userId, newRole) {
  try {
    await window.sb.from('profiles').update({ role: newRole }).eq('id', userId);
    console.log('✅ Role updated');
    if (typeof loadAdminPanel === 'function') loadAdminPanel();
  } catch (e) {
    console.warn('changeUserRole:', e);
  }
};
