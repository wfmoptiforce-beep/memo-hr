console.log('✅ admin/import-export.js loaded');

// دالة رفع الإسكادول (Excel/CSV)
window.handleScheduleUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('upload-status');
    statusEl.textContent = "⏳ Reading file...";
    statusEl.style.color = "orange";

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target.result;
            const rows = text.split('\n').slice(1); // تجاهل الهيدر
            const scheduleEntries = [];

            rows.forEach(row => {
                const cols = row.split(',');
                if (cols.length >= 5) {
                    scheduleEntries.push({
                        email: cols[0].trim(),
                        shift_start: cols[1].trim(),
                        shift_end: cols[2].trim(),
                        off_day1: cols[3].trim(),
                        off_day2: cols[4].trim(),
                        date: new Date().toISOString().split('T')[0] // تاريخ اليوم كمثال
                    });
                }
            });

            if (scheduleEntries.length > 0) {
                const { error } = await sb.from('schedules').insert(scheduleEntries);
                if (error) throw error;
                statusEl.textContent = `✅ Successfully uploaded ${scheduleEntries.length} entries!`;
                statusEl.style.color = "green";
            }
        } catch (err) {
            console.error(err);
            statusEl.textContent = "❌ Error uploading file.";
            statusEl.style.color = "red";
        }
    };
    reader.readAsText(file);
};

// دالة تحميل التمبلت
window.downloadScheduleTemplate = function() {
    const csvContent = "data:text/csv;charset=utf-8,email,shift_start,shift_end,off_day1,off_day2\nagent@example.com,09:00,18:00,Friday,Saturday";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "schedule_template.csv");
    document.body.appendChild(link);
    link.click();
};