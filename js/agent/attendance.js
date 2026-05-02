// ═══════════════════════════════════
// ⏰ ATTENDANCE (handled by status.js)
// ═══════════════════════════════════

console.log('✅ attendance.js loaded');

/// ══════════════════════════════════════════════════════
// 📊 ATTENDANCE TRACKER REPORT
// ══════════════════════════════════════════════════════
console.log('✅ attendance-tracker.js loaded');

// ─── وقت مصر (UTC+2 / UTC+3 في الصيف) ──────────────
function toEgyptTime(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  // مصر UTC+2 (أو +3 في التوقيت الصيفي — نستخدم +2 كافتراضي ثابت)
  const egypt = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  return egypt;
}

function toEgyptTimeStr(dateStr) {
  if (!dateStr) return '—';
  const eg = toEgyptTime(dateStr);
  return eg.toTimeString().substring(0, 5); // HH:MM
}

function minutesDiff(a, b) {
  if (!a || !b) return 0;
  return (new Date(b) - new Date(a)) / 60000;
}

function fmtMins(mins) {
  if (mins === null || mins === undefined || isNaN(mins)) return '—';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.round(Math.abs(mins) % 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

// ─── بناء صفحة Attendance Tracker ───────────────────
window.buildAttendanceTrackerPanel = function () {
  const existing = document.getElementById('panel-attendance-tracker');
  if (existing) return;

  const panel = document.createElement('div');
  panel.id = 'panel-attendance-tracker';
  panel.className = 'panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <h2>📊 Attendance Tracker</h2>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <div style="display:flex;gap:6px;align-items:center;">
          <label style="font-size:13px;color:#6b7280;">From</label>
          <input type="date" id="att-from" style="padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;" />
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <label style="font-size:13px;color:#6b7280;">To</label>
          <input type="date" id="att-to" style="padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;" />
        </div>
        <button class="btn-primary" onclick="window.loadAttendanceTracker()">🔍 Generate</button>
        <button class="btn-primary" onclick="window.exportAttendanceTracker()"
          style="background:#16a34a;border:none;">📥 Export CSV</button>
      </div>
    </div>
    <div id="att-tracker-body" class="section">
      <p style="text-align:center;color:#9ca3af;padding:40px;">Select a date range and click Generate.</p>
    </div>
  `;

  const content = document.querySelector('.content');
  if (content) content.appendChild(panel);
};

// ─── بيانات التقرير (global للـ export) ─────────────
window._attTrackerData = [];

// ─── توليد التقرير ───────────────────────────────────
window.loadAttendanceTracker = async function () {
  const from = document.getElementById('att-from')?.value;
  const to   = document.getElementById('att-to')?.value;
  const body = document.getElementById('att-tracker-body');

  if (!from || !to) {
    if (body) body.innerHTML = '<p style="color:#dc2626;text-align:center;">⚠️ Please select both From and To dates.</p>';
    return;
  }

  if (body) body.innerHTML = '<p style="text-align:center;color:#6b7280;padding:30px;">⏳ Loading data...</p>';

  try {
    // 1. كل الموظفين النشطين
    const { data: users } = await window.sb
      .from('profiles')
      .select('id, full_name, email, role')
      .not('role', 'in', '("inactive","suspended")');

    // 2. سجلات الحضور في الفترة
    const { data: logs } = await window.sb
      .from('attendance')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true });

    // 3. السكادول لكل شخص
    const { data: schedules } = await window.sb
      .from('schedules')
      .select('*')
      .gte('date', from)
      .lte('date', to);

    // 4. الإجازات المعتمدة
    const { data: leaves } = await window.sb
      .from('leaves')
      .select('*')
      .eq('status', 'Approved')
      .lte('start_date', to)
      .gte('end_date', from);

    // ─── بناء الخريطة ───
    const logsByUserDate = {};
    (logs || []).forEach(l => {
      const key = `${l.user_id}_${l.date}`;
      if (!logsByUserDate[key]) logsByUserDate[key] = [];
      logsByUserDate[key].push(l);
    });

    const schedMap = {};
    (schedules || []).forEach(s => { schedMap[`${s.email}_${s.date}`] = s; });

    const leaveSet = new Set();
    (leaves || []).forEach(l => {
      let d = new Date(l.start_date);
      const end = new Date(l.end_date);
      while (d <= end) {
        leaveSet.add(`${l.user_id}_${d.toISOString().split('T')[0]}`);
        d.setDate(d.getDate() + 1);
      }
    });

    // ─── توليد الصفوف ───
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const rows = [];

    // كل الأيام في الفترة
    let cur = new Date(from);
    const endDate = new Date(to);

    while (cur <= endDate) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayName = days[cur.getDay()];

      (users || []).forEach(u => {
        const sched = schedMap[`${u.email}_${dateStr}`];
        const isOnLeave = leaveSet.has(`${u.id}_${dateStr}`);
        const isOffDay = sched && (sched.off_day1 === dayName || sched.off_day2 === dayName);
        const dayLogs = logsByUserDate[`${u.id}_${dateStr}`] || [];

        if (isOnLeave) {
          rows.push({ name: u.full_name || u.email, date: dateStr, day: dayName, firstLogin: '—', lastLogout: '—', loginHours: '—', lateBy: '—', status: '🏖️ On Leave' });
          return;
        }

        if (isOffDay) {
          rows.push({ name: u.full_name || u.email, date: dateStr, day: dayName, firstLogin: '—', lastLogout: '—', loginHours: '—', lateBy: '—', status: '📴 Day Off' });
          return;
        }

        if (dayLogs.length === 0) {
          rows.push({ name: u.full_name || u.email, date: dateStr, day: dayName, firstLogin: '—', lastLogout: '—', loginHours: '—', lateBy: '—', status: '❌ Absent' });
          return;
        }

        // ─ أول لوج إن وآخر لوج أوت ─
        const allStarts = dayLogs.map(l => l.start_time || l.created_at).filter(Boolean).sort();
        const allEnds   = dayLogs.map(l => l.end_time || l.updated_at).filter(Boolean).sort();

        const firstLoginRaw  = allStarts[0];
        const lastLogoutRaw  = allEnds[allEnds.length - 1];
        const firstLoginEgy  = toEgyptTimeStr(firstLoginRaw);
        const lastLogoutEgy  = toEgyptTimeStr(lastLogoutRaw);

        // ─ حساب ساعات الشغل (بدون بريك) ─
        let totalMins = 0;
        dayLogs.forEach(l => {
          const isBreak = (l.aux_type || l.status || '') === 'break';
          if (!isBreak && l.start_time && l.end_time) {
            const diff = minutesDiff(l.start_time, l.end_time);
            if (diff > 0) totalMins += diff;
          } else if (!isBreak && l.duration_minutes) {
            totalMins += l.duration_minutes;
          }
        });

        // ─ التأخير ─
        let lateBy = '—';
        let status = '✅ Attended';

        if (sched?.shift_start && firstLoginRaw) {
          const [sh, sm] = sched.shift_start.split(':').map(Number);
          const schedStartMins = sh * 60 + sm;

          const egFirst = toEgyptTime(firstLoginRaw);
          const actualMins = egFirst.getHours() * 60 + egFirst.getMinutes();
          const diff = actualMins - schedStartMins;

          if (diff > 5) {
            lateBy = fmtMins(diff);
            status = `⚠️ Late (+${lateBy})`;
          }
        }

        rows.push({
          name: u.full_name || u.email,
          date: dateStr,
          day: dayName,
          firstLogin: firstLoginEgy,
          lastLogout: lastLogoutEgy,
          loginHours: fmtMins(totalMins),
          lateBy,
          status
        });
      });

      cur.setDate(cur.getDate() + 1);
    }

    window._attTrackerData = rows;

    // ─── رسم الجدول ───
    if (!rows.length) {
      body.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:30px;">No data found for this period.</p>';
      return;
    }

    body.innerHTML = `
      <div class="table-container" style="margin-top:10px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Date</th>
              <th>Day</th>
              <th>First Login<br><small style="font-weight:400;color:#9ca3af;">(Egypt Time)</small></th>
              <th>Last Logout<br><small style="font-weight:400;color:#9ca3af;">(Egypt Time)</small></th>
              <th>Work Hours<br><small style="font-weight:400;color:#9ca3af;">(excl. break)</small></th>
              <th>Late By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              let rowBg = '';
              if (r.status.includes('Absent'))  rowBg = 'background:#fff5f5;';
              if (r.status.includes('Late'))    rowBg = 'background:#fffbeb;';
              if (r.status.includes('On Leave')) rowBg = 'background:#f0f9ff;';
              if (r.status.includes('Day Off')) rowBg = 'background:#f9fafb;';

              return `
                <tr style="${rowBg}">
                  <td><strong>${r.name}</strong></td>
                  <td>${r.date}</td>
                  <td style="color:#6b7280;font-size:12px;">${r.day}</td>
                  <td><strong>${r.firstLogin}</strong></td>
                  <td>${r.lastLogout}</td>
                  <td>${r.loginHours}</td>
                  <td style="color:${r.lateBy !== '—' ? '#dc2626' : '#9ca3af'};">${r.lateBy}</td>
                  <td>${r.status}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

  } catch (e) {
    console.error('loadAttendanceTracker error:', e);
    if (body) body.innerHTML = `<p style="color:#dc2626;text-align:center;">❌ Error: ${e.message}</p>`;
  }
};

// ─── تصدير CSV ───────────────────────────────────────
window.exportAttendanceTracker = function () {
  const rows = window._attTrackerData || [];
  if (!rows.length) { alert('Generate the report first.'); return; }

  const from = document.getElementById('att-from')?.value || '';
  const to   = document.getElementById('att-to')?.value   || '';

  const headers = ['Agent','Date','Day','First Login (EG)','Last Logout (EG)','Work Hours','Late By','Status'];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.name}"`, r.date, r.day,
      r.firstLogin, r.lastLogout, `"${r.loginHours}"`,
      `"${r.lateBy}"`, `"${r.status}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Attendance_Tracker_${from}_${to}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── تشغيل عند بداية التطبيق ─────────────────────────
document.addEventListener('APP_READY', () => {
  const role = APP.CP?.role;
  if (['admin','supervisor','upper_management','owner'].includes(role)) {
    window.buildAttendanceTrackerPanel();
  }
});
// Attendance data managed via status.js aux system
// No standalone functions needed here