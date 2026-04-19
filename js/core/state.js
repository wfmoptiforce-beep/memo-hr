// ═════════════════════════════════════
// 🔹 GLOBAL STATE + HELPERS
// ═════════════════════════════════════

/** Supabase client injected by config.js */
window.sb = window.supabase;

window.APP = {
  // auth
  CU: null,          // current user (supabase auth user)
  CP: null,          // current profile row
  userRole: 'agent', // agent | quality | supervisor | admin | owner

  // timers / attendance
  punchInTime: null,
  breakStartTime: null,
  isOnBreak: false,
  isPunchedIn: false,
  workTimer: null,
  breakTimer: null,

  // totals for today
  totalBreakSec: 0,
  breakCount: 0,
  todayBreaks: [],

  // settings (business rules)
  RULES: {
    requiredWorkSeconds: 8 * 3600, // 8 hours
    allowedBreakSeconds: 1 * 3600  // 1 hour
  },

  // intervals/subscriptions
  intervals: {
    teamOnline: null
  },
  channels: {
    leaves: null,
    notifications: null
  }
};

// Helpers
window.todayISO = () => new Date().toISOString().split('T')[0];
window.pad2 = (n) => String(n).padStart(2, '0');

window.safeText = (id, txt) => {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
};

window.safeHTML = (id, html) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};