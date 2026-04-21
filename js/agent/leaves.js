console.log('✅ leaves.js fully integrated');

// 1. دالة إرسال طلب إجازة (للأيجنت)
window.submitLeaveRequest = async function() {
    const type = document.getElementById('leave-type').value;
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const msg = document.getElementById('leave-msg');

    if (!start || !end) {
        msg.textContent = "⚠️ Please select start and end dates";
        msg.style.color = "red";
        return;
    }

    try {
        const { error } = await window.sb.from('leaves').insert({
            user_id: APP.CU.id,
            agent_name: APP.CP.full_name,
            leave_type: type,
            start_date: start,
            end_date: end,
            status: 'Pending'
        });

        if (error) throw error;

        msg.textContent = "✅ Request submitted successfully!";
        msg.style.color = "green";
        
        setTimeout(() => {
            closeModal('request-leave');
            window.loadMyLeaves(); // تحديث الجدول عند الأيجنت
        }, 1500);

    } catch (e) {
        msg.textContent = "❌ Error: " + e.message;
    }
};

// 2. دالة عرض الإجازات الخاصة بالأيجنت
window.loadMyLeaves = async function() {
    const container = document.getElementById('agent-leaves-list');
    if (!container || !APP.CU) return;

    const { data: leaves, error } = await window.sb
        .from('leaves')
        .select('*')
        .eq('user_id', APP.CU.id)
        .order('created_at', { ascending: false });

    if (leaves) {
        container.innerHTML = leaves.map(l => `
            <div class="card" style="margin-bottom:10px; border-left: 5px solid ${l.status === 'Approved' ? '#16a34a' : (l.status === 'Rejected' ? '#dc2626' : '#eab308')}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${l.leave_type}</strong><br>
                        <small>${l.start_date} to ${l.end_date}</small>
                    </div>
                    <div style="font-weight:bold;">${l.status}</div>
                </div>
            </div>
        `).join('');
    }
};

// 3. دالة للمدير: عرض كل الطلبات المعلقة (Pending)
window.loadPendingLeaves = async function() {
    const tbody = document.getElementById('admin-leaves-tbody');
    if (!tbody) return;

    const { data: pending, error } = await window.sb
        .from('leaves')
        .select('*')
        .eq('status', 'Pending');

    if (pending) {
        tbody.innerHTML = pending.map(l => `
            <tr>
                <td>${l.agent_name}</td>
                <td>${l.leave_type}</td>
                <td>${l.start_date} / ${l.end_date}</td>
                <td>
                    <button class="btn-sm btn-primary" onclick="window.processLeave('${l.id}', 'Approved')">Approve</button>
                    <button class="btn-sm btn-danger" onclick="window.processLeave('${l.id}', 'Rejected')">Reject</button>
                </td>
            </tr>
        `).join('');
    }
};

// 4. دالة للمدير: الموافقة أو الرفض
window.processLeave = async function(id, newStatus) {
    const { error } = await window.sb
        .from('profiles').update({ status: newStatus === 'Approved' ? 'On Leave' : 'offline' }) // تحديث حالة البروفايل لو وافق
        .from('leaves').update({ status: newStatus }).eq('id', id);

    if (!error) {
        alert("Leave " + newStatus);
        window.loadPendingLeaves();
    }
};

// تشغيل عند تحميل الصفحة
document.addEventListener('APP_READY', () => {
    window.loadMyLeaves();
});