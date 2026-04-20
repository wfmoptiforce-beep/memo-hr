// ═══════════════════════════════════
// ⏱️ AGENT AUX & PUNCH SYSTEM (BASIC)
// ═══════════════════════════════════

console.log('✅ status.js loaded');

window.punchAux = function (aux) {
  console.log('Punch clicked:', aux);

  const statusEl = document.getElementById('punch-status');
  const timerEl  = document.getElementById('aux-timer');

  if (statusEl) {
    statusEl.textContent = 'Status: ' + aux.toUpperCase();
  }

  if (timerEl) {
    timerEl.textContent = '00:00:01';
  }

  alert('✅ Punch registered: ' + aux);
};