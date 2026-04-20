// ✅ GLOBAL APP STATE

console.log('✅ state.js loaded');

window.APP = {
  CU: null,      // current user
  CP: null,      // current profile
  userRole: 'agent'
};

// helpers
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