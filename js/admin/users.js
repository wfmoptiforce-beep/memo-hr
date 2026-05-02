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

    const thead = document.querySelector('#panel-users thead tr');
    if (thead) {
      thead.innerHTML = '<th>Name</th><th>Email</th><th>Position</th><th>Access Level</th><th>Status</th><th>Actions</th>';
    }

    const tbody = document.getElementById('admin-users-tbody');
    if (tbody) {
      tbody.innerHTML = users.map(u => {
        const st = u.status || 'offline';
        const stColor = st === 'offline' ? '#dc2626' : '#16a34a';
        const displayName = u.full_name || '—';
        const position = u.position || '—';

        return `
          <tr>
            <td>
              <strong>${displayName}</strong>
              ${!u.full_name ? '<br><small style="color:#f59e0b;">⚠️ Name missing</small>' : ''}
            </td>
            <td style="font-size:13px;color:#6b7280;">${u.email || '-'}</td>
            <td>${position}</td>
            <td>
              <span style="background:#f3f4f6;padding:2px 8px;border-radius:10px;font-size:12px;">
                ${u.role || 'agent'}
              </span>
            </td>
            <td><span style="color:${stColor};font-weight:600;">● ${st}</span></td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              <button
                onclick="window.openEditUser('${u.id}')"
                style="padding:4px 10px;border-radius:6px;border:1px solid #6366f1;background:#eef2ff;color:#6366f1;cursor:pointer;font-size:12px;font-weight:600;">
                ✏️ Edit
              </button>
              <select
                onchange="window.changeUserRole('${u.id}', this.value)"
                style="padding:4px 8px;border-radius:6px;border:1px solid #d1d5db;font-size:12px;">
                <option value="agent"            ${u.role === 'agent'            ? 'selected' : ''}>Agent</option>
                <option value="leader"           ${u.role === 'leader'           ? 'selected' : ''}>Leader</option>
                <option value="supervisor"       ${u.role === 'supervisor'       ? 'selected' : ''}>Supervisor</option>
                <option value="quality"          ${u.role === 'quality'          ? 'selected' : ''}>Quality</option>
                <option value="upper_management" ${u.role === 'upper_management' ? 'selected' : ''}>Upper Mgmt</option>
                <option value="admin"            ${u.role === 'admin'            ? 'selected' : ''}>Admin</option>
                <option value="owner"            ${u.role === 'owner'            ? 'selected' : ''}>Owner</option>
                <option value="suspended"        ${u.role === 'suspended'        ? 'selected' : ''}>⛔ Suspended</option>
                <option value="inactive"         ${u.role === 'inactive'         ? 'selected' : ''}>🔒 Inactive</option>
                <option value="long_leave"       ${u.role === 'long_leave'       ? 'selected' : ''}>🏖️ Long Leave</option>
              </select>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (typeof window.loadPendingLeaves === 'function') {
      window.loadPendingLeaves();
    }

  } catch (e) {
    console.warn('loadAdminPanel error:', e);
  }
};

// ✅ فتح مودال التعديل وتعبئة البيانات — آمن مع أي نسخة من المودال
window.openEditUser = async function (userId) {
  try {
    const { data: u, error } = await window.sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !u) { alert('Could not load user data.'); return; }

    // استخدام ?. عشان لو أي عنصر مش موجود في المودال ما يكسرش
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    set('edit-u-id',       u.id);
    set('edit-u-name',     u.full_name || '');
    set('edit-u-email',    u.email || '');
    set('edit-u-phone',    u.phone || '');
    set('edit-u-position', u.position || 'Agent');
    set('edit-u-role',     u.role || 'agent');
    set('edit-u-status',   u.account_status || u.status || 'offline');
    set('edit-u-join',     u.join_date || '');
    set('edit-u-last',     u.last_working_date || '');

    // تأكد إن المودال عنده الحقول الجديدة — لو لأ بيفتح مودال بديل
    const hasNewModal = !!document.getElementById('edit-u-phone');
    if (!hasNewModal) {
      // المودال القديم: نفتحه بنفس الـ IDs الموجودة
      const nameEl = document.getElementById('edit-u-name');
      if (nameEl) nameEl.removeAttribute('readonly');
      if (nameEl) nameEl.style.cssText = 'border:2px solid #6366f1; background:white; cursor:text;';
    }

    if (window.openModal) window.openModal('edit-user');

  } catch (e) {
    alert('Error loading user: ' + e.message);
  }
};

// ✅ حفظ التعديلات
window.saveUserEdit = async function () {
  const id       = document.getElementById('edit-u-id')?.value;
  const name     = document.getElementById('edit-u-name')?.value?.trim();
  const phone    = document.getElementById('edit-u-phone')?.value?.trim();
  const position = document.getElementById('edit-u-position')?.value;
  const role     = document.getElementById('edit-u-role')?.value;
  const accStatus = document.getElementById('edit-u-status')?.value;
  const joinDate = document.getElementById('edit-u-join')?.value || null;
  const lastDate = document.getElementById('edit-u-last')?.value || null;
  const msg      = document.getElementById('edit-u-msg');

  if (!id) { alert('No user selected.'); return; }
  if (!name) {
    if (msg) { msg.textContent = '⚠️ Name is required.'; msg.style.color = '#dc2626'; }
    return;
  }

  if (msg) { msg.textContent = '⏳ Saving...'; msg.style.color = '#6b7280'; }

  try {
    const { error } = await window.sb
      .from('profiles')
      .update({
        full_name:         name,
        phone:             phone || null,
        position:          position || null,
        role:              role,
        account_status:    accStatus,
        join_date:         joinDate,
        last_working_date: lastDate,
        updated_at:        new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    if (msg) { msg.textContent = '✅ Saved successfully!'; msg.style.color = '#16a34a'; }

    setTimeout(() => {
      if (window.closeModal) window.closeModal('edit-user');
      if (msg) msg.textContent = '';
      if (typeof loadAdminPanel === 'function') loadAdminPanel();
    }, 1200);

  } catch (e) {
    if (msg) { msg.textContent = '❌ ' + e.message; msg.style.color = '#dc2626'; }
  }
};

window.addUser = async function () {
  const name      = document.getElementById('mu-name')?.value?.trim();
  const email     = document.getElementById('mu-email')?.value?.trim();
  const phone     = document.getElementById('mu-phone')?.value?.trim();
  const pass      = document.getElementById('mu-pass')?.value;
  const position  = document.getElementById('mu-position')?.value;
  const role      = document.getElementById('mu-role')?.value;
  const status    = document.getElementById('mu-status')?.value;
  const firstDate = document.getElementById('mu-first-date')?.value || null;
  const lastDate  = document.getElementById('mu-last-date')?.value || null;
  const msg       = document.getElementById('mu-msg');

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

    const userId = data?.user?.id;
    if (!userId) {
      if (msg) { msg.textContent = '❌ Could not get user ID.'; msg.style.color = '#dc2626'; }
      return;
    }

    if (msg) { msg.textContent = '⏳ Saving profile...'; msg.style.color = '#6b7280'; }

    await window.sb.from('profiles').upsert({
      id: userId, email, full_name: name,
      phone: phone || null, position: position || null,
      role: role || 'agent', status: status || 'offline',
      join_date: firstDate, last_working_date: lastDate,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    // ضمان حفظ الاسم لو الـ trigger كتب عليه
    await new Promise(r => setTimeout(r, 600));
    await window.sb.from('profiles').update({
      full_name: name, phone: phone || null,
      position: position || null, role: role || 'agent',
      status: status || 'offline', join_date: firstDate,
      last_working_date: lastDate, updated_at: new Date().toISOString()
    }).eq('id', userId);

    if (msg) { msg.textContent = '✅ Employee added successfully!'; msg.style.color = '#16a34a'; }

    ['mu-name','mu-email','mu-phone','mu-pass','mu-first-date','mu-last-date']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

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
    if (typeof loadAdminPanel === 'function') loadAdminPanel();
  } catch (e) {
    console.warn('changeUserRole:', e);
  }
};
