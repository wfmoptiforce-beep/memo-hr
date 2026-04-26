// ═══════════════════════════════════
// 🏖️ LEAVES MANAGEMENT (leaves.js)
// ═══════════════════════════════════
console.log('✅ leaves.js loaded with fixes');

// 1. دالة إرسال طلب إجازة (للأيجنت)
window.submitLeaveRequest = async function() {
    const type = document.getElementById('leave-type').value;
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const msg = document.getElementById('leave-msg');

    if (!start || !end) {
        msg.textContent = "⚠️ Please select start and end dates";
        msg.style.color = "#dc2626";
        return;
    }

    msg.textContent = "⏳ Submitting...";
    msg.style.color = "#6b7280";

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
        msg.style.color = "#16a34a";
        
        setTimeout(() => {
            closeModal('request-leave');
            msg.textContent = ""; // تنظيف الرسالة للمرة القادمة
            window.loadMyLeaves(); // تحديث الجدول عند الأيجنت
        }, 1500);

    } catch (e) {
        msg.textContent = "❌ Error: " + e.message;
        msg.style.color = "#dc2626";
    }
};

// 2. دالة عرض الإجازات الخاصة بالأيجنت
window.loadMyLeaves = async function() {
    const container = document.getElementById('agent-leaves-list');
    if (!container || !APP.CU) return;

    try {
        const { data: leaves, error } = await window.sb
            .from('leaves')
            .select('*')
            .eq('user_id', APP.CU.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn("⚠️ Table 'leaves' may not exist yet.");
            return;
        }

        if (!leaves || leaves.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:gray;">No leaves requested. Status will update here when approved.</p>';
            return;
        }

        container.innerHTML = leaves.map(l => {
            const color = l.status === 'Approved' ? '#16a34a' : (l.status === 'Rejected' ? '#dc2626' : '#eab308');
            return `
            <div style="margin-bottom:10px; padding: 10px; border: 1px solid #eee; border-radius: 8px; border-left: 5px solid ${color}; background: #fafafa;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color: #374151;">${l.leave_type}</strong><br>
                        <small style="color: #6b7280;">📅 ${l.start_date} ➔ ${l.end_date}</small>
                    </div>
                    <div style="font-weight:bold; color: ${color}; background: ${color}20; padding: 4px 8px; border-radius: 4px;">
                        ${l.status}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Error loading my leaves:", e);
    }
};

// 3. دالة للمدير/الجودة: عرض كل الطلبات المعلقة (Pending)
window.loadPendingLeaves = async function() {
    const tbody = document.getElementById('admin-leaves-tbody');
    if (!tbody) return;

    try {
        const { data: pending, error } = await window.sb
            .from('leaves')
            .select('*')
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });

        if (error) return;

        if (!pending || pending.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No pending leave requests</td></tr>';
            return;
        }

        tbody.innerHTML = pending.map(l => `
            <tr>
                <td><strong>${l.agent_name}</strong></td>
                <td>${l.leave_type}</td>
                <td>${l.start_date} <br><small>to</small><br> ${l.end_date}</td>
                <td>
                    <button class="btn-primary btn-sm" onclick="window.processLeave('${l.id}', '${l.user_id}', 'Approved')" style="background-color: #16a34a; border: none; margin-bottom: 5px; width: 100%;">Approve</button>
                    <button class="btn-primary btn-sm" onclick="window.processLeave('${l.id}', '${l.user_id}', 'Rejected')" style="background-color: #dc2626; border: none; width: 100%;">Reject</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Error loading pending leaves:", e);
    }
};

// 4. دالة للمدير: الموافقة أو الرفض + إرسال إشعار للأيجنت
window.processLeave = async function(leaveId, userId, newStatus) {
    if (!confirm(`Are you sure you want to ${newStatus.toUpperCase()} this leave?`)) return;

    try {
        // 1. تحديث حالة الإجازة في الداتا بيز
        const { error: leaveError } = await window.sb
            .from('leaves')
            .update({ status: newStatus })
            .eq('id', leaveId);

        if (leaveError) throw leaveError;

        // 2. تحديث حالة الأيجنت لـ On Leave لو تمت الموافقة
        if (newStatus === 'Approved') {
            await window.sb.from('profiles').update({ status: 'long_leave' }).eq('id', userId);
        }

        // 3. إرسال إشعار فوري للأيجنت
        try {
            await window.sb.from('notifications').insert({
                user_id: userId,
                from_id: APP.CU.id,
                from_name: APP.CP.full_name || 'Management',
                type: 'leave_update',
                message: `🏖️ Your ${newStatus === 'Approved' ? 'approved' : 'rejected'} leave request.`,
                read: false,
                created_at: new Date().toISOString()
            });
        } catch(e) { console.warn("Failed to notify agent:", e); }

        alert(`Leave successfully ${newStatus}!`);
        window.loadPendingLeaves(); // تحديث الجدول فوراً

    } catch (e) {
        alert("Error processing leave: " + e.message);
    }
};

// تشغيل عند تحميل الصفحة
document.addEventListener('APP_READY', () => {
    // الأيجنت يشوف طلباته
    if (APP.CP?.role === 'agent') {
        window.loadMyLeaves();
    }
    // الأدمن والمانجر والكواليتي يشوفوا الطلبات المعلقة
    if (['admin', 'supervisor', 'quality', 'owner'].includes(APP.CP?.role)) {
        window.loadPendingLeaves();
    }
});