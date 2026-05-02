// ═══════════════════════════════════════════════════════════
// 📅 SCHEDULES MANAGEMENT (Upload, Edit, Delete, Agent View)
// ═══════════════════════════════════════════════════════════
console.log('✅ schedules.js loaded');

let selectedFile = null;

// 1. تحميل التمبلت الجديد
window.downloadScheduleTemplate = function() {
    // الترتيب: Name, Email, Leader, Date, Shift
    const csv = "Name,Email,Leader,Date,Shift\nAsmaa,agent@company.com,Ahmed Leader,2024-05-01,09:00 AM - 05:00 PM";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Schedule_Template_New.csv";
    link.click();
};

// 2. اختيار الملف
window.selectScheduleFile = function(event) {
    selectedFile = event.target.files[0];
    if (selectedFile) {
        document.getElementById('selected-file-name').innerText = "📄 Selected File: " + selectedFile.name;
    }
};

// 3. رفع الملف للداتا بيز
window.processScheduleFile = function() {
    if (!selectedFile) return alert("⚠️ Please select a file first.");

    const statusDiv = document.getElementById('upload-status');
    statusDiv.innerHTML = '⏳ Uploading and processing schedule...'; 
    statusDiv.style.color = '#0891b2';

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        
        if (rows.length < 2) return alert("File is empty or invalid format.");

        let successCount = 0;
        let errors = 0;

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            // الترتيب الجديد: Name(0), Email(1), Leader(2), Date(3), Shift(4)
            if (cols.length >= 5) {
                const email = cols[1].trim();
                const date = cols[3].trim();
                const shift = cols[4].trim();

                if(email && date && shift) {
                    try {
                        const { error } = await window.sb.from('schedules').upsert({
                            user_email: email,
                            date: date,
                            shift_details: shift,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'user_email,date' });

                        if (!error) successCount++;
                        else errors++;
                    } catch(err) { errors++; }
                }
            }
        }

        statusDiv.innerHTML = `✅ Upload Complete! Success: ${successCount} records. (Errors: ${errors})`;
        statusDiv.style.color = '#16a34a';
        selectedFile = null;
        document.getElementById('bulk-upload').value = '';
        document.getElementById('selected-file-name').innerText = '';
    };
    reader.readAsText(selectedFile);
};

// ═════════ قسم الإدارة (التعديل والمسح) ═════════

window.showManageSchedules = function() {
    document.getElementById('schedule-upload-view').style.display = 'none';
    document.getElementById('schedule-manage-view').style.display = 'block';
    
    // وضع تاريخ اليوم كافتراضي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('manage-sch-date').value = today;
    window.loadManageSchedules();
};

window.showUploadSchedule = function() {
    document.getElementById('schedule-manage-view').style.display = 'none';
    document.getElementById('schedule-upload-view').style.display = 'block';
};

window.loadManageSchedules = async function() {
    const date = document.getElementById('manage-sch-date').value;
    if(!date) return;

    const tbody = document.getElementById('manage-sch-tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    const { data, error } = await window.sb.from('schedules').select('*').eq('date', date);

    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No schedules found for this date.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(s => `
        <tr>
            <td><input type="checkbox" class="sch-checkbox" value="${s.id}"></td>
            <td>${s.user_email}</td>
            <td>${s.date}</td>
            <td id="shift-td-${s.id}">${s.shift_details}</td>
            <td>
                <button onclick="window.editSingleSchedule('${s.id}', '${s.shift_details}')" style="background:none; border:none; cursor:pointer; font-size:16px;">✏️</button>
            </td>
        </tr>
    `).join('');
};

window.toggleAllSchedules = function(source) {
    const checkboxes = document.querySelectorAll('.sch-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
};

window.deleteSelectedSchedules = async function() {
    const checkboxes = document.querySelectorAll('.sch-checkbox:checked');
    if(checkboxes.length === 0) return alert("Select schedules to delete.");
    
    if(!confirm(`Are you sure you want to delete ${checkboxes.length} schedules?`)) return;

    const idsToDelete = Array.from(checkboxes).map(cb => cb.value);

    try {
        await window.sb.from('schedules').delete().in('id', idsToDelete);
        alert("Deleted successfully!");
        window.loadManageSchedules();
    } catch(e) {
        alert("Error deleting schedules.");
    }
};

window.editSingleSchedule = async function(id, currentShift) {
    const newShift = prompt("Edit shift details:", currentShift);
    if(newShift && newShift !== currentShift) {
        await window.sb.from('schedules').update({ shift_details: newShift }).eq('id', id);
        document.getElementById(`shift-td-${id}`).innerText = newShift;
    }
};

// ═════════ عرض الجدول للموظف (اسبوع باسبوع) ═════════

window.loadSchedules = async function() {
    if (!window.sb || !APP.CU) return;

    try {
        const todayStr = new Date().toISOString().split('T')[0];

        if (APP.userRole === 'agent') {
            // بيجيب من تاريخ اليوم، ولمدة 7 أيام فقط (اسبوع باسبوع زي ما طلبتي)
            const { data } = await window.sb.from('schedules')
                .select('*')
                .eq('user_email', APP.CU.email)
                .gte('date', todayStr)
                .order('date', { ascending: true })
                .limit(7);

            const container = document.getElementById('my-schedule-container');
            if (container) {
                if (!data || data.length === 0) {
                    container.innerHTML = '<p>No schedule uploaded for you yet.</p>';
                } else {
                    container.innerHTML = data.map(s => `
                        <div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #eee; text-align:left;">
                            <strong style="color:var(--dark);">${s.date}</strong>
                            <span style="color:var(--primary); font-weight:600; background:var(--primary-light); padding:4px 12px; border-radius:20px; font-size:13px;">${s.shift_details}</span>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (e) { console.error(e); }
};

document.addEventListener('APP_READY', () => {
    if (APP.userRole === 'agent') window.loadSchedules();
});