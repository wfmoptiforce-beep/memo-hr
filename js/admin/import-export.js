// ═══════════════════════════════════
// 📤 ADMIN: IMPORT / EXPORT
// ═══════════════════════════════════
console.log('✅ admin/import-export.js loaded');

// ─── رفع السكادول من CSV ────────────────────────────────
window.handleScheduleUpload = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('upload-status');
  if (statusEl) { statusEl.textContent = '⏳ Reading file...'; statusEl.style.color = 'orange'; }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        if (statusEl) { statusEl.textContent = '⚠️ The file is empty or missing rows.'; statusEl.style.color = 'orange'; }
        return;
      }

      const headerParts = lines[0].split(',').map(c => c.trim().toLowerCase());
      const idx = {
        name: headerParts.indexOf('name'),
        email: headerParts.indexOf('email'),
        shiftLabel: headerParts.indexOf('shift') !== -1 ? headerParts.indexOf('shift') : headerParts.indexOf('shift_label'),
        shiftStart: headerParts.indexOf('shift_start'),
        shiftEnd: headerParts.indexOf('shift_end'),
        shiftDuration: headerParts.indexOf('shift_duration_hours'),
        date: headerParts.indexOf('date'),
        offDay1: headerParts.indexOf('off_day1'),
        offDay2: headerParts.indexOf('off_day2')
      };

      let nameToEmail = {};
      if (idx.email === -1 && idx.name !== -1) {
        const { data: profiles } = await window.sb.from('profiles').select('email,full_name');
        (profiles || []).forEach(p => {
          if (p?.email && p?.full_name) {
            nameToEmail[p.full_name.trim().toLowerCase()] = p.email;
          }
        });
      }

      const scheduleEntries = [];
      const rows = lines.slice(1);

      rows.forEach(row => {
        const cols = row.split(',').map(c => c.trim().replace(/\r/g, ''));
        if (cols.length === 0 || !cols.some(col => col)) return;

        const name = idx.name !== -1 ? cols[idx.name] || '' : '';
        const email = idx.email !== -1 ? cols[idx.email] : (name ? nameToEmail[name.trim().toLowerCase()] : '');
        const shift_start = cols[idx.shiftStart] || '';
        const shift_end = cols[idx.shiftEnd] || '';
        const shift_duration = cols[idx.shiftDuration] || '';
        const off_day1 = cols[idx.offDay1] || '';
        const off_day2 = cols[idx.offDay2] || '';
        const date = cols[idx.date] || new Date().toISOString().split('T')[0];

        if (!email) return;

        let finalShiftEnd = shift_end;
        if (!finalShiftEnd && shift_start && shift_duration) {
          const [hours, mins] = shift_start.split(':').map(Number);
          const duration = parseInt(shift_duration, 10) || 8;
          const endHours = (hours + duration) % 24;
          finalShiftEnd = `${endHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        }

        scheduleEntries.push({
          email,
          shift_start: shift_start || '09:00',
          shift_end: finalShiftEnd || '17:00',
          off_day1,
          off_day2,
          date
        });
      });

      if (scheduleEntries.length === 0) {
        if (statusEl) { statusEl.textContent = '⚠️ No valid rows found. Check the file format.'; statusEl.style.color = 'orange'; }
        return;
      }

      const { error } = await window.sb.from('schedules').insert(scheduleEntries);
      if (error) throw error;

      if (statusEl) {
        statusEl.textContent = `✅ Successfully uploaded ${scheduleEntries.length} schedule entries!`;
        statusEl.style.color = 'green';
      }

      if (typeof window.loadMasterSchedule === 'function') {
        setTimeout(() => window.loadMasterSchedule(), 500);
      }
    } catch (err) {
      console.error('Schedule upload error:', err);
      if (statusEl) { statusEl.textContent = '❌ Error: ' + err.message; statusEl.style.color = 'red'; }
    }
  };

  reader.readAsText(file);
  event.target.value = '';
};

// ─── تحميل تمبلت السكادول الجديد ────────────────────────
window.downloadScheduleTemplate = function () {
  const csv = [
    'name,email,shift,shift_start,shift_end,date,off_day1,off_day2',
    'Ahmed Ali,ahmed@example.com,Morning,09:00,17:00,2025-01-01,Friday,Saturday',
    'Fatima Mohamed,fatima@example.com,Evening,14:00,22:00,2025-01-01,Friday,Saturday',
    'Sara Hassan,sara@example.com,Night,22:00,06:00,2025-01-01,Saturday,Sunday'
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
