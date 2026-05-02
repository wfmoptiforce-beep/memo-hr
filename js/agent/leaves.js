// ═══════════════════════════════════
// 🏖️ LEAVES MANAGEMENT (leaves.js)
// ═══════════════════════════════════
console.log('✅ leaves.js loaded');

window.submitLeaveRequest = async function () {
  const type = document.getElementById('leave-type').value;
  const start = document.getElementById('leave-start').value;
  const end = document.getElementById('leave-end').value;
  const msg = document.getElementById('leave-msg');

  if (!start || !end) {
    if (msg) { msg.textContent = '⚠️ Please select start and end dates'; msg.style.color = '#dc2626'; }
    return;
  }

  if (new Date(end) < new Date(start)) {
    if (msg) { msg.textContent = '⚠️ End date cannot be before start date'; msg.style.color = '#dc2626'; }
    return;
  }

  if (msg) { msg.textContent = '⏳ Submitting...'; msg.style.color = '#6b7280'; }

  try {
    const { error } = await window.sb.from('leaves').insert({
      user_id: APP.CU.id,
      agent_name: APP.CP?.full_name || 'Agent',
      leave_type: type,
      start_date: start,
      end_date: end,
      status: 'Pending',
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    if (msg) { msg.textContent = '✅ Request submitted successfully!'; msg.style.color = '#16a34a'; }

    setTimeout(() => {
      if (typeof closeModal === 'function') closeModal('request-leave');
      if (msg) msg.textContent = '';
      window.loadMyLeaves();
    }, 1500);

  } catch (e) {
    if (msg) { msg.textContent = '❌ Error: ' + e.message; msg.style.color = '#dc2626'; }
  }
};

window.loadMyLeaves = async function () {
  const container = document.getElementById('agent-leaves-list');
  if (!container || !APP.CU) return;

  try {
    const { data: leaves, error } = await window.sb
      .from('leaves')
      .select('*')
      .eq('user_id', APP.CU.id)
      .order('created_at', { ascending: false });

    if (error) { console.warn(error); return; }

    if (!leaves || leaves.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:gray;">No leaves requested yet.</p>';
      return;
    }

    container.innerHTML = leaves.map(l => {
      // ✅ الحل: تحديد اللون والنص بناءً على status الفعلي
      let color = '#eab308';
      let bgLight = '#fef08a';
      let text = 'Pending';

      const st = (l.status || '').trim();

      if (st === 'Approved') { color = '#16a34a'; bgLight = '#bbf7d0'; text = 'Approved ✅'; }
      else if (st === 'Rejected') { color = '#dc2626'; bgLight = '#fecaca'; text = 'Rejected ❌'; }
      else if (st === 'Pending') { color = '#eab308'; bgLight = '#fef08a'; text = 'Pending ⏳'; }
      else {
        // أي قيمة غير متوقعة (مثل UUID قديم) — نعاملها كـ Pending
        color = '#eab308'; bgLight = '#fef08a'; text = 'Pending ⏳';
        console.warn('⚠️ Unexpected leave status value:', st);
      }

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid #eee; border-left:4px solid ${color}; border-radius:6px; margin-bottom:10px; background:var(--bg);">
          <div>
            <strong style="font-size:15px; color:var(--dark);">${l.leave_type || 'Leave'}</strong>
            <div style="color:var(--text-light); font-size:12px; margin-top:4px;">🗓️ ${l.start_date} ➔ ${l.end_date}</div>
          </div>
          <div style="background:${bgLight}; color:${color}; padding:4px 12px; border-radius:20px; font-weight:600; font-size:12px;">
            ${text}
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('Error loading my leaves:', e);
  }
};

window.loadPendingLeaves = async function () {
  const tbody = document.getElementById('admin-leaves-tbody');
  if (!tbody) return;

  try {
    const { data: pending, error } = await window.sb
      .from('leaves')
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!pending || pending.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:gray;">No pending leave requests</td></tr>';
      return;
    }

    tbody.innerHTML = pending.map(l => `
      <tr>
        <td><strong>${l.agent_name || 'Agent'}</strong></td>
        <td>${l.leave_type}</td>
        <td>${l.start_date} <br><small>to</small> ${l.end_date}</td>
        <td>
          <button class="btn-primary btn-sm"
            onclick="window.processLeave('${l.id}', '${l.user_id}', 'Approved')"
            style="background-color:#16a34a; border:none; margin-bottom:5px; width:100%;">
            ✅ Approve
          </button>
          <button class="btn-primary btn-sm"
            onclick="window.processLeave('${l.id}', '${l.user_id}', 'Rejected')"
            style="background-color:#dc2626; border:none; width:100%;">
            ❌ Reject
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Error loading pending leaves:', e);
  }
};

// ✅ processLeave الصحيح — 3 بارامترات
window.processLeave = async function (leaveId, userId, newStatus) {
  if (!confirm(`Are you sure you want to ${newStatus.toUpperCase()} this leave?`)) return;

  try {
    const { error } = await window.sb
      .from('leaves')
      .update({ status: newStatus })
      .eq('id', leaveId);

    if (error) throw error;

    if (newStatus === 'Approved') {
      await window.sb.from('profiles').update({ status: 'long_leave' }).eq('id', userId);
    }

    // إشعار للموظف
    try {
      await window.sb.from('notifications').insert({
        user_id: userId,
        from_id: APP.CU.id,
        from_name: APP.CP?.full_name || 'Management',
        type: 'leave_update',
        message: `🏖️ Your leave request was ${newStatus}.`,
        read: false,
        created_at: new Date().toISOString()
      });
    } catch (notifErr) {
      console.warn('Notification send failed (non-blocking):', notifErr);
    }

    alert(`Leave successfully ${newStatus}!`);
    window.loadPendingLeaves();

  } catch (e) {
    alert('Error processing leave: ' + e.message);
  }
};

document.addEventListener('APP_READY', () => {
  const role = APP.CP?.role;
  if (role === 'agent') {
    window.loadMyLeaves();
  }
  if (['admin', 'supervisor', 'quality', 'owner'].includes(role)) {
    window.loadPendingLeaves();
  }
});
