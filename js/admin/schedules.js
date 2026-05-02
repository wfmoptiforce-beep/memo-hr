// ═══════════════════════════════════
// 📋 SCHEDULES + WFM REPORT
// ═══════════════════════════════════
console.log('✅ admin/schedules.js loaded');

// ─── تحميل السكادول للموظف نفسه ─────────────────────────
window.loadMySchedule = async function () {
  const container = document.getElementById('my-schedule-container');
  if (!container || !APP.CU) return;

  try {
    const { data: schedules, error } = await window.sb
      .from('schedules')
      .select('*')
      .eq('email', APP.CP?.email || '')
      .order('date', { ascending: true })
      .limit(7);

    if (error) throw error;

    if (!schedules || schedules.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:gray;">No schedule uploaded yet.</p>';
      return;
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    container.innerHTML = `
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th>Date</th><th>Day</th><th>Shift Start</th><th>Shift End</th><th>Off Days</th>
          </tr>
        </thead>
        <tbody>
          ${schedules.map(s => {
            const d = new Date(s.date);
            const isOff = s.off_day1 === days[d.getDay()] || s.off_day2 === days[d.getDay()];
            return `
              <tr style="${isOff ? 'background:#fef9c3;' : ''}">
                <td>${s.date}</td>
                <td>${days[d.getDay()] || '—'}</td>
                <td>${isOff ? '—' : (s.shift_start || '—')}</td>
                <td>${isOff ? '—' : (s.shift_end || '—')}</td>
                <td>${s.off_day1 || ''} ${s.off_day2 ? '/ ' + s.off_day2 : ''}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    console.error('loadMySchedule error:', e);
    if (container) container.innerHTML = '<p style="color:red;">Error loading schedule.</p>';
  }
};

// ─── تحميل السكادول الماستر (للأدمن) ────────────────────
window.loadMasterSchedule = async function () {
  const panel = document.getElementById('panel-schedule');
  if (!panel) return;

  try {
    const { data: schedules } = await window.sb
      .from('schedules')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    let tableContainer = document.getElementById('schedule-master-table');
    if (!tableContainer) {
      tableContainer = document.createElement('div');
      tableContainer.id = 'schedule-master-table';
      tableContainer.className = 'section';
      panel.appendChild(tableContainer);
    }

    if (!schedules || schedules.length === 0) {
      tableContainer.innerHTML = '<p style="text-align:center;color:gray;padding:20px;">No schedules uploaded yet. Use the button above to upload.</p>';
      return;
    }

    tableContainer.innerHTML = `
      <h3>📋 Uploaded Schedules (${schedules.length} records)</h3>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr><th>Email</th><th>Date</th><th>Shift Start</th><th>Shift End</th><th>Off Day 1</th><th>Off Day 2</th></tr>
          </thead>
          <tbody>
            ${schedules.map(s => `
              <tr>
                <td>${s.email}</td>
                <td>${s.date}</td>
                <td>${s.shift_start}</td>
                <td>${s.shift_end}</td>
                <td>${s.off_day1 || '—'}</td>
                <td>${s.off_day2 || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    console.error('loadMasterSchedule error:', e);
  }
};

// ─── تقرير WFM الشامل (📥 Download WFM Report) ──────────
window.downloadDailyReport = async function () {
  const btn = document.querySelector('[onclick*="downloadDailyReport"]');
  if (btn) { btn.textContent = '⏳ Generating...'; btn.disabled = true; }

  try {
    const today = window.todayISO ? window.todayISO() : new Date().toISOString().split('T')[0];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = days[new Date(today).getDay()];

    // 1. جلب كل الموظفين النشطين
    const { data: users } = await window.sb
      .from('profiles')
      .select('id, full_name, email, role, status')
      .not('role', 'in', '("inactive","suspended")');

    if (!users || users.length === 0) {
      alert('No active employees found.');
      if (btn) { btn.textContent = '📥 Download WFM Report'; btn.disabled = false; }
      return;
    }

    // 2. جلب سجلات الحضور لليوم ده
    const { data: attendanceRows } = await window.sb
      .from('attendance')
      .select('*')
      .eq('date', today);

    // 3. جلب السكادول لليوم ده
    const { data: scheduleRows } = await window.sb
      .from('schedules')
      .select('*')
      .eq('date', today);

    // 4. جلب الإجازات المعتمدة اللي بتغطي النهاردة
    const { data: approvedLeaves } = await window.sb
      .from('leaves')
      .select('*')
      .eq('status', 'Approved')
      .lte('start_date', today)
      .gte('end_date', today);

    // 5. بناء خريطة سريعة
    const attMap = {};
    (attendanceRows || []).forEach(a => {
      if (!attMap[a.user_id]) attMap[a.user_id] = [];
      attMap[a.user_id].push(a);
    });

    const schedMap = {};
    (scheduleRows || []).forEach(s => { schedMap[s.email] = s; });

    const onLeaveSet = new Set((approvedLeaves || []).map(l => l.user_id));

    // 6. حساب الساعات لكل موظف
    const parseTime = (t) => {
      if (!t) return null;
      const [h, m, s] = t.split(':').map(Number);
      return h * 60 + m + (s || 0) / 60;
    };

    const fmtMins = (mins) => {
      if (mins === null || mins === undefined) return '—';
      const h = Math.floor(Math.abs(mins) / 60);
      const m = Math.round(Math.abs(mins) % 60);
      const sign = mins < 0 ? '-' : '';
      return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
    };

    const rows = users.map(u => {
      const sched = schedMap[u.email];
      const records = attMap[u.id] || [];
      const isOnLeave = onLeaveSet.has(u.id);

      // ─ التحقق من يوم الإجازة الأسبوعية ─
      const isOffDay = sched && (sched.off_day1 === todayDay || sched.off_day2 === todayDay);

      if (isOnLeave) {
        return {
          name: u.full_name || u.email,
          role: u.role,
          scheduleStart: sched?.shift_start || '—',
          scheduleEnd: sched?.shift_end || '—',
          firstLogin: '—',
          lastLogout: '—',
          totalHours: '—',
          breakHours: '—',
          deficit: '—',
          overtime: '—',
          status: '🏖️ On Leave'
        };
      }

      if (isOffDay) {
        return {
          name: u.full_name || u.email,
          role: u.role,
          scheduleStart: '—',
          scheduleEnd: '—',
          firstLogin: '—',
          lastLogout: '—',
          totalHours: '—',
          breakHours: '—',
          deficit: '—',
          overtime: '—',
          status: '📴 Day Off'
        };
      }

      if (records.length === 0) {
        return {
          name: u.full_name || u.email,
          role: u.role,
          scheduleStart: sched?.shift_start || '—',
          scheduleEnd: sched?.shift_end || '—',
          firstLogin: '—',
          lastLogout: '—',
          totalHours: '—',
          breakHours: '—',
          deficit: sched ? fmtMins(-(parseTime(sched.shift_end) - parseTime(sched.shift_start)) + 0) : '—',
          overtime: '—',
          status: '❌ Absent'
        };
      }

      // ─ حسابات الحضور ─
      const onlineLogs = records.filter(r => r.aux_type === 'online' || r.status === 'online');
      const breakLogs = records.filter(r => r.aux_type === 'break' || r.status === 'break');

      const allTimes = records
        .map(r => r.start_time || r.created_at)
        .filter(Boolean)
        .map(t => t.includes('T') ? t.split('T')[1].substring(0, 8) : t)
        .sort();

      const firstLogin = allTimes[0] || '—';

      const allEndTimes = records
        .map(r => r.end_time || r.updated_at)
        .filter(Boolean)
        .map(t => t.includes('T') ? t.split('T')[1].substring(0, 8) : t)
        .sort();

      const lastLogout = allEndTimes[allEndTimes.length - 1] || '—';

      // إجمالي ساعات الشغل
      let totalLoginMins = 0;
      records.forEach(r => {
        if (r.duration_minutes) {
          totalLoginMins += r.duration_minutes;
        } else if (r.start_time && r.end_time) {
          const s = parseTime(r.start_time.includes('T') ? r.start_time.split('T')[1].substring(0, 5) : r.start_time);
          const e = parseTime(r.end_time.includes('T') ? r.end_time.split('T')[1].substring(0, 5) : r.end_time);
          if (s !== null && e !== null && e > s) totalLoginMins += (e - s);
        }
      });

      // ساعات البريك
      let breakMins = 0;
      breakLogs.forEach(r => {
        if (r.duration_minutes) breakMins += r.duration_minutes;
      });

      const netWorkMins = totalLoginMins - breakMins;

      // الشيفت المطلوب من السكادول
      let requiredMins = 8 * 60; // افتراضي 8 ساعات
      if (sched?.shift_start && sched?.shift_end) {
        const s = parseTime(sched.shift_start);
        const e = parseTime(sched.shift_end);
        if (s !== null && e !== null) requiredMins = e - s;
      }

      const diffMins = netWorkMins - requiredMins;
      const deficit = diffMins < 0 ? fmtMins(diffMins) : '—';
      const overtime = diffMins > 0 ? fmtMins(diffMins) : '—';

      return {
        name: u.full_name || u.email,
        role: u.role,
        scheduleStart: sched?.shift_start || '—',
        scheduleEnd: sched?.shift_end || '—',
        firstLogin,
        lastLogout,
        totalHours: fmtMins(netWorkMins),
        breakHours: fmtMins(breakMins),
        deficit,
        overtime,
        status: '✅ Present'
      };
    });

    // 7. توليد CSV
    const headers = [
      'Name', 'Role', 'Sched Start', 'Sched End',
      'First Login', 'Last Logout', 'Net Work Hours',
      'Break Hours', 'Deficit', 'Overtime', 'Status'
    ];

    const csvRows = [headers.join(',')];
    rows.forEach(r => {
      csvRows.push([
        `"${r.name}"`, `"${r.role}"`,
        r.scheduleStart, r.scheduleEnd,
        r.firstLogin, r.lastLogout,
        `"${r.totalHours}"`, `"${r.breakHours}"`,
        `"${r.deficit}"`, `"${r.overtime}"`,
        `"${r.status}"`
      ].join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel Arabic support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WFM_Report_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (e) {
    console.error('downloadDailyReport error:', e);
    alert('❌ Error generating report: ' + e.message);
  } finally {
    if (btn) { btn.textContent = '📥 Download WFM Report'; btn.disabled = false; }
  }
};

// ─── تشغيل عند جهوزية التطبيق ───────────────────────────
document.addEventListener('APP_READY', () => {
  const role = APP.CP?.role;
  if (role === 'agent') {
    window.loadMySchedule();
  }
  if (['admin', 'supervisor', 'owner'].includes(role)) {
    window.loadMasterSchedule();
  }
});
