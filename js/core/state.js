// ═════════════════════════════════════
// 🔹 GLOBAL STATE + HELPERS
// ═════════════════════════════════════

Object.defineProperty(window, 'sb', {
  get() { return window.supabase || window._supabase; }
});

window.APP = {
  CU: null,
  CP: null,
  userRole: 'agent',
  intervals: { teamOnline: null },
  channels: {}
};

window.todayISO = () => new Date().toISOString().split('T')[0];
window.pad2 = (n) => String(n).padStart(2, '0');
window.safeText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
window.safeHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };