// ═══════════════════════════════════
// 🖥️ UI CONTROLLER & TOPBAR MANAGER
// ═══════════════════════════════════

console.log('✅ ui.js loaded');

// ═══════════════════════════════════
// 🎯 APP INITIALIZATION
// ═══════════════════════════════════

// Setup UI after app loads
window.initializeUI = function () {
  try {
    setupTopbar();
    setupUserInfo();
    setupEventListeners();
    showDefaultPanel();
    loadInitialData();
    console.log('✅ UI initialized');
  } catch (e) {
    console.error('initializeUI error:', e);
  }
};

// ═══════════════════════════════════
// 🔧 TOPBAR SETUP
// ═══════════════════════════════════

window.setupTopbar = function () {
  try {
    const nav = document.getElementById('topbar-nav');
    if (!nav) {
      console.warn('topbar-nav not found');
      return;
    }

    const role = (APP.userRole || 'agent').toLowerCase();
    let tabs = [];

    // Define tabs based on role
    if (role === 'owner' || role === 'admin') {
      tabs = [
        { id: 'panel-admin', icon: '⚙️', label: 'Admin', data: 'admin' },
        { id: 'panel-supervisor', icon: '👥', label: 'Team', data: 'supervisor' },
        { id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' },
        { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' },
      ];
    } else if (role === 'supervisor') {
      tabs = [
        { id: 'panel-supervisor', icon: '👥', label: 'Team', data: 'supervisor' },
        { id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' },
        { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' },
      ];
    } else if (role === 'quality') {
      tabs = [
        { id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' },
        { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' },
      ];
    } else {
      // Agent only
      tabs = [
        { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }
      ];
    }

    // Clear nav
    nav.innerHTML = '';

    // Create buttons
    tabs.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn' + (i === 0 ? ' active' : '');
      btn.innerHTML = tab.icon + ' ' + tab.label;
      btn.dataset.panel = tab.data;
      btn.onclick = () => switchPanel(tab.id, btn);
      nav.appendChild(btn);
    });

    console.log('✅ Topbar setup complete for role:', role);

  } catch (e) {
    console.warn('setupTopbar error:', e);
  }
};

// ═══════════════════════════════════
// 👤 USER INFO SETUP
// ═══════════════════════════════════

window.setupUserInfo = function () {
  try {
    const name = APP.CP?.full_name || APP.CU?.email?.split('@')[0] || 'User';
    const role = (APP.userRole || 'agent').toLowerCase();
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

    safeText('user-name', name);
    safeText('user-role', roleDisplay);

    const av = document.getElementById('user-av');
    if (av) {
      av.textContent = name.charAt(0).toUpperCase();
    }

    console.log('✅ User info setup:', { name, role: roleDisplay });

  } catch (e) {
    console.warn('setupUserInfo error:', e);
  }
};

// ═══════════════════════════════════
// 🔄 PANEL SWITCHING
// ═══════════════════════════════════

window.switchPanel = function (panelId, btn) {
  try {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.remove('show');
    });

    // Show target panel
    const target = document.getElementById(panelId);
    if (target) {
      target.classList.add('show');
      APP.currentPanel = panelId.replace('panel-', '');
    }

    // Update button states
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.remove('active');
    });

    if (btn) {
      btn.classList.add('active');
    }

    console.log('✅ Panel switched:', APP.currentPanel);

    // Load panel data
    loadPanelData(APP.currentPanel);

  } catch (e) {
    console.warn('switchPanel error:', e);
  }
};

// ═══════════════════════════════════
// 📋 LOAD PANEL DATA
// ═══════════════════════════════════

window.loadPanelData = async function (panelName) {
  try {
    switch (panelName) {
      case 'admin':
        if (typeof loadAdminPanel === 'function') {
          await loadAdminPanel();
        }
        break;

      case 'supervisor':
        if (typeof loadTeamOnline === 'function') {
          await loadTeamOnline();
        }
        break;

      case 'quality':
        if (typeof loadQualityMonitoring === 'function') {
          await loadQualityMonitoring();
        }
        break;

      case 'agent':
        if (typeof loadDailySummary === 'function') {
          await loadDailySummary();
        }
        break;
    }
  } catch (e) {
    console.warn('loadPanelData error:', e);
  }
};

// ═══════════════════════════════════
// 🏠 DEFAULT PANEL
// ═══════════════════════════════════

window.showDefaultPanel = function () {
  try {
    const role = (APP.userRole || 'agent').toLowerCase();
    let panelId = 'panel-agent';

    if (role === 'owner' || role === 'admin') {
      panelId = 'panel-admin';
    } else if (role === 'supervisor') {
      panelId = 'panel-supervisor';
    } else if (role === 'quality') {
      panelId = 'panel-quality';
    }

    // Find and click the corresponding button
    const btn = document.querySelector(`[data-panel="${panelId.replace('panel-', '')}"]`);
    switchPanel(panelId, btn);

  } catch (e) {
    console.warn('showDefaultPanel error:', e);
  }
};

// ═══════════════════════════════════
// 🔔 NOTIFICATIONS
// ═══════════════════════════════════

window.toggleNotif = function () {
  try {
    const panel = document.getElementById('notif-panel');
    if (panel) {
      panel.classList.toggle('show');
    }
  } catch (e) {
    console.warn('toggleNotif error:', e);
  }
};

// Load notifications
window.loadNotifications = async function () {
  try {
    if (!window.sb || !APP.CU) return;

    const { data: notifs } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', APP.CU.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    const notifList = document.getElementById('notif-list');
    if (!notifList) return;

    if (!notifs || notifs.length === 0) {
      notifList.innerHTML = '<div class="notif-empty">No new notifications</div>';
      return;
    }

    const badge = document.querySelector('.notif-badge');
    if (badge) {
      badge.textContent = notifs.length;
      badge.style.display = notifs.length > 0 ? 'block' : 'none';
    }

    notifList.innerHTML = notifs.map(n => `
      <div class="notif-item" style="padding:12px;border-bottom:1px solid #f3f4f6;cursor:pointer;" onclick="markNotifRead('${n.id}')">
        <div style="font-weight:600;font-size:13px;">${n.message || 'New notification'}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:4px;">${formatTime(n.created_at)}</div>
      </div>
    `).join('');

  } catch (e) {
    console.warn('loadNotifications error:', e);
  }
};

// Mark notification as read
window.markNotifRead = async function (notifId) {
  try {
    if (!window.sb) return;

    await sb.from('notifications')
      .update({ read: true })
      .eq('id', notifId);

    loadNotifications();

  } catch (e) {
    console.warn('markNotifRead error:', e);
  }
};

// ═══════════════════════════════════
// 📊 INITIAL DATA LOAD
// ═══════════════════════════════════

window.loadInitialData = async function () {
  try {
    // Load all necessary data for current panel
    if (typeof loadDailySummary === 'function') {
      await loadDailySummary();
    }

    if (typeof loadTeamOnline === 'function') {
      await loadTeamOnline();
    }

    if (typeof loadAdminPanel === 'function') {
      await loadAdminPanel();
    }

    if (typeof loadQualityMonitoring === 'function') {
      await loadQualityMonitoring();
    }

    // Load notifications
    await loadNotifications();

    console.log('✅ Initial data loaded');

  } catch (e) {
    console.warn('loadInitialData error:', e);
  }
};

// ═══════════════════════════════════
// 🔌 EVENT LISTENERS
// ═══════════════════════════════════

window.setupEventListeners = function () {
  try {
    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        await doLogout();
      };
    }

    // Login form
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.onclick = async () => {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';
        await doLogin();
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
      };
    }

    // Enter key on password field
    const passInput = document.getElementById('login-pass');
    if (passInput) {
      passInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          await doLogin();
        }
      });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.onclick = (e) => {
        const modal = e.target.closest('.modal-ov');
        if (modal) modal.classList.remove('show');
      };
    });

    // Close modal on background click
    document.querySelectorAll('.modal-ov').forEach(modal => {
      modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('show');
      };
    });

    console.log('✅ Event listeners setup');

  } catch (e) {
    console.warn('setupEventListeners error:', e);
  }
};

// ═══════════════════════════════════
// 🔄 AUTO-REFRESH
// ═══════════════════════════════════

// Refresh notifications every 10 seconds
setInterval(() => {
  if (APP.CU?.id && typeof loadNotifications === 'function') {
    loadNotifications();
  }
}, 10000);

// ═══════════════════════════════════
// 🚀 INITIALIZE ON APP LOAD
// ═══════════════════════════════════

// Call this from auth.js after showApp()
document.addEventListener('DOMContentLoaded', () => {
  // Will be called by showApp() in auth.js
  // Just ensure functions are available
  console.log('✅ UI module ready');
});

console.log('✅ ui.js fully loaded');