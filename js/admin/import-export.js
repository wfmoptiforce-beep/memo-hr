// ═══════════════════════════════════
// 📤 ADMIN: IMPORT / EXPORT
// ═══════════════════════════════════
console.log('✅ admin/import-export.js loaded');

// ─── رفع السكادول من CSV ─────────────────────────────────
window.handleScheduleUpload = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('upload-status');
  if (statusEl) { statusEl.textContent = '⏳ Reading file...'; statusEl.style.color = 'orange'; }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const lines = text.split('\n');
      const header = lines[0].toLowerCase();

      // دعم أعمدة: email, shift_start, shift_end, off_day1, off_day2, date (اختياري)
      const rows = lines.slice(1);
      const scheduleEntries = [];

      rows.forEach(row => {
        const cols = row.split(',').map(c => c.trim().replace(/\r/g, ''));
        if (cols.length >= 4 && cols[0]) {
          scheduleEntries.push({
            email:       cols[0],
            shift_start: cols[1] || '09:00',
            shift_end:   cols[2] || '17:00',
            off_day1:    cols[3] || '',
            off_day2:    cols[4] || '',
            date:        cols[5] || new Date().toISOString().split('T')[0]
          });
        }
      });

      if (scheduleEntries.length === 0) {
        if (statusEl) { statusEl.textContent = '⚠️ No valid rows found. Check the file format.'; statusEl.style.color = 'orange'; }
        return;
      }

      // رفع للداتا بيز
      const { error } = await window.sb.from('schedules').insert(scheduleEntries);
      if (error) throw error;

      if (statusEl) {
        statusEl.textContent = `✅ Successfully uploaded ${scheduleEntries.length} schedule entries!`;
        statusEl.style.color = 'green';
      }

      // ريفريش جدول السكادول
      if (typeof window.loadMasterSchedule === 'function') {
        setTimeout(() => window.loadMasterSchedule(), 500);
      }

    } catch (err) {
      console.error('Schedule upload error:', err);
      if (statusEl) { statusEl.textContent = '❌ Error: ' + err.message; statusEl.style.color = 'red'; }
    }
  };

  reader.readAsText(file);

  // reset input عشان تقدري ترفعي نفس الملف تاني مرة
  event.target.value = '';
};

// ─── تحميل تمبلت السكادول ────────────────────────────────
window.downloadScheduleTemplate = function () {
  const csv = [
    'email,shift_start,shift_end,off_day1,off_day2,date',
    'agent@example.com,09:00,18:00,Friday,Saturday,2025-01-01',
    'agent2@example.com,10:00,19:00,Friday,Saturday,2025-01-01'
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'schedule_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── تمبلت الـ Aux (للسيتينج) ────────────────────────────
window.downloadAuxTemplate = function () {
  const csv = [
    'email,aux_type,start_time,end_time,date',
    'agent@example.com,break,10:00,10:15,2025-01-01',
    'agent@example.com,meeting,14:00,15:00,2025-01-01'
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aux_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── رفع الـ Aux يدويًا ───────────────────────────────────
window.handleAuxUpload = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('aux-upload-status');
  if (statusEl) { statusEl.textContent = '⏳ Reading file...'; statusEl.style.color = 'orange'; }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const rows = text.split('\n').slice(1);
      const entries = [];

      for (const row of rows) {
        const cols = row.split(',').map(c => c.trim().replace(/\r/g, ''));
        if (cols.length < 4 || !cols[0]) continue;

        // جلب الـ user_id من الإيميل
        const { data: profile } = await window.sb
          .from('profiles')
          .select('id')
          .eq('email', cols[0])
          .single();

        if (profile?.id) {
          entries.push({
            user_id:    profile.id,
            aux_type:   cols[1] || 'offline',
            start_time: cols[2],
            end_time:   cols[3],
            date:       cols[4] || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
          });
        }
      }

      if (entries.length === 0) {
        if (statusEl) { statusEl.textContent = '⚠️ No valid rows found or emails not matched.'; statusEl.style.color = 'orange'; }
        return;
      }

      const { error } = await window.sb.from('attendance').insert(entries);
      if (error) throw error;

      if (statusEl) {
        statusEl.textContent = `✅ Uploaded ${entries.length} aux entries successfully!`;
        statusEl.style.color = 'green';
      }

    } catch (err) {
      console.error('Aux upload error:', err);
      if (statusEl) { statusEl.textContent = '❌ Error: ' + err.message; statusEl.style.color = 'red'; }
    }
  };

  reader.readAsText(file);
  event.target.value = '';
};
