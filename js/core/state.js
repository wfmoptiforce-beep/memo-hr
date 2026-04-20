// ═══════════════════════════════════
// 📊 GLOBAL APPLICATION STATE
// ═══════════════════════════════════

console.log('✅ state.js loaded');

// ✅ GLOBAL APP OBJECT
window.APP = {
  CU: null,           // current user (from auth)
  CP: null,           // current profile (from DB)
  userRole: 'agent',  // user role (agent/supervisor/quality/admin)
  currentPanel: 'agent' // current active panel
};

// ═══════════════════════════════════
// 🛠️ UTILITY FUNCTIONS
// ═══════════════════════════════════

// Date helpers
window.todayISO = () => new Date().toISOString().split('T')[0];
window.pad2 = (n) => String(n).padStart(2, '0');

window.formatTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

window.formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// ═══════════════════════════════════
// 🎯 DOM MANIPULATION
// ═══════════════════════════════════

// Safe text update
window.safeText = (id, txt) => {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
};

// Safe HTML update
window.safeHTML = (id, html) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};

// Safe class toggle
window.toggleClass = (id, className) => {
  const el = document.getElementById(id);
  if (el) el.classList.toggle(className);
};

// Safe class add
window.addClass = (id, className) => {
  const el = document.getElementById(id);
  if (el) el.classList.add(className);
};

// Safe class remove
window.removeClass = (id, className) => {
  const el = document.getElementById(id);
  if (el) el.classList.remove(className);
};

// ═══════════════════════════════════
// 🎨 PANEL MANAGEMENT
// ═══════════════════════════════════

// Show specific panel
window.showPanel = (panelName) => {
  try {
    // Hide all panels
    const allPanels = document.querySelectorAll('.panel');
    allPanels.forEach(p => p.classList.remove('show'));

    // Show target panel
    const targetPanel = document.getElementById('panel-' + panelName);
    if (targetPanel) {
      targetPanel.classList.add('show');
      APP.currentPanel = panelName;
      console.log('✅ Panel shown:', panelName);
    }

  } catch (e) {
    console.warn('showPanel error:', e);
  }
};

// ═══════════════════════════════════
// 🔐 AUTH UI FUNCTIONS
// ═══════════════════════════════════

// Show login screen
window.showLogin = () => {
  const loginScreen = document.getElementById('login-screen');
  const appContainer = document.getElementById('app');

  if (loginScreen) {
    loginScreen.classList.add('show');
  }

  if (appContainer) {
    appContainer.classList.remove('show');
  }

  console.log('✅ Login screen shown');
};

// Show app screen
window.showApp = () => {
  const loginScreen = document.getElementById('login-screen');
  const appContainer = document.getElementById('app');

  if (loginScreen) {
    loginScreen.classList.remove('show');
  }

  if (appContainer) {
    appContainer.classList.add('show');
  }

  // Load default panel
  const defaultPanel = (APP.userRole === 'admin' || APP.userRole === 'supervisor')
    ? 'admin'
    : APP.userRole === 'quality'
    ? 'quality'
    : 'agent';

  showPanel(defaultPanel);
  console.log('✅ App screen shown, panel:', defaultPanel);
};

// ═══════════════════════════════════
// 📢 NOTIFICATIONS
// ═══════════════════════════════════

// Toast notification
window.showToast = (message, type = 'info', duration = 3000) => {
  const toast = document.createElement('div');

  const bgColor =
    type === 'success' ? '#16a34a' :
    type === 'error' ? '#dc2626' :
    type === 'warning' ? '#eab308' :
    '#2563eb';

  const textColor = type === 'warning' ? '#000' : '#fff';

  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColor};
    color: ${textColor};
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,.15);
  `;

  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// Modal open
window.openModal = (modalName) => {
  const modal = document.getElementById('modal-' + modalName);
  if (modal) {
    modal.classList.add('show');
    console.log('✅ Modal opened:', modalName);
  }
};

// Modal close
window.closeModal = (modalName) => {
  const modal = document.getElementById('modal-' + modalName);
  if (modal) {
    modal.classList.remove('show');
    console.log('✅ Modal closed:', modalName);
  }
};

// ═══════════════════════════════════
// 🔄 DATA REFRESH
// ═══════════════════════════════════

// Generic refresh function
window.refreshData = async (functionName) => {
  try {
    if (typeof window[functionName] === 'function') {
      await window[functionName]();
      showToast('✅ Data refreshed', 'success', 2000);
    }
  } catch (e) {
    console.warn('refreshData error:', e);
    showToast('❌ Refresh failed', 'error');
  }
};

// ═══════════════════════════════════
// 🎯 PERMISSION CHECKS
// ═══════════════════════════════════

// Check if user has role
window.hasRole = (role) => {
  return APP.userRole === role;
};

// Check if user is admin
window.isAdmin = () => {
  return APP.userRole === 'admin';
};

// Check if user is supervisor
window.isSupervisor = () => {
  return APP.userRole === 'supervisor' || APP.userRole === 'admin';
};

// Check if user is quality
window.isQuality = () => {
  return APP.userRole === 'quality' || APP.userRole === 'admin';
};

// ═══════════════════════════════════
// 📋 LOGGER
// ═══════════════════════════════════

window.logAction = (action, details = {}) => {
  console.log(`📋 [${new Date().toLocaleTimeString()}] ${action}`, details);
};

console.log('✅ State initialized with all helpers');