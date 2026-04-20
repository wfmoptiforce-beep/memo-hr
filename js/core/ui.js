// ═══════════════════════════════════
// 🖥️ UI CONTROLLER
// ═══════════════════════════════════

function showLogin() {
  const login = document.getElementById('login-screen');
  const app   = document.getElementById('app');
  if (login) { login.classList.add('show'); login.style.display = ''; }
  if (app)   { app.classList.remove('show'); app.style.display = ''; }
  const btn = document.getElementById('login-btn');
  if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
}

function showApp() {
  const login = document.getElementById('login-screen');
  const app   = document.getElementById('app');
  if (login) { login.classList.remove('show'); login.style.display = ''; }
  if (app)   { app.classList.add('show'); app.style.display = ''; }

  setupTopbar();
  setupUserInfo();
  showDefaultPanel();

  // Init Aux System
  if (typeof initAux === 'function') initAux();
}

// ═══ TOPBAR NAV ═══
function setupTopbar() {
  const nav = document.getElementById('topbar-nav');
  if (!nav) return;

  const role = (APP.userRole || 'agent').toLowerCase();
  let tabs = [];

  if (role === 'owner' || role === 'admin') {
    tabs = [
      { id: 'panel-admin',      icon: '⚙️', label: 'Admin' },
      { id: 'panel-supervisor', icon: '👥', label: 'Team' },
      { id: 'panel-quality',    icon: '⭐', label: 'Quality' },
      { id: 'panel-agent',      icon: '🏠', label: 'My View' },
    ];
  } else if (role === 'supervisor') {
    tabs = [
      { id: 'panel-supervisor', icon: '👥', label: 'Team' },
      { id: 'panel-quality',    icon: '⭐', label: 'Quality' },
      { id: 'panel-agent',      icon: '🏠', label: 'My View' },
    ];
  } else if (role === 'quality') {
    tabs = [
      { id: 'panel-quality',    icon: '⭐', label: 'Quality' },
      { id: 'panel-agent',      icon: '🏠', label: 'My View' },
    ];
  } else {
    tabs = [
      { id: 'panel-agent', icon: '🏠', label: 'My View' },
    ];
  }

  nav.innerHTML = '';
  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn' + (i === 0 ? ' active' : '');
    btn.innerHTML = tab.icon + ' ' + tab.label;
    btn.onclick = () => switchPanel(tab.id, btn);
    nav.appendChild(btn);
  });
}

// ═══ USER INFO ═══
function setupUserInfo() {
  const nameEl = document.getElementById('user-name');
  const roleEl = document.getElementById('user-role');
  const avEl   = document.getElementById('user-av');

  const name = APP.CP?.full_name || APP.CU?.email?.split('@')[0] || 'User';
  const role = APP.userRole || 'agent';

  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  if (avEl)   avEl.textContent = name.charAt(0).toUpperCase();
}

// ═══ SWITCH PANEL ═══
function switchPanel(panelId, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
  const target = document.getElementById(panelId);
  if (target) target.classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ═══ DEFAULT PANEL ═══
function showDefaultPanel() {
  const role = (APP.userRole || 'agent').toLowerCase();
  let defaultPanel = 'panel-agent';

  if (role === 'owner' || role === 'admin') defaultPanel = 'panel-admin';
  else if (role === 'supervisor') defaultPanel = 'panel-supervisor';
  else if (role === 'quality') defaultPanel = 'panel-quality';

  switchPanel(defaultPanel);
}

// ═══ NOTIFICATIONS ═══
function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.toggle('show');
}

// ═══ MODALS ═══
function openModal(name) {
  const m = document.getElementById('modal-' + name);
  if (m) m.classList.add('show');
}

function closeModal(name) {
  const m = document.getElementById('modal-' + name);
  if (m) m.classList.remove('show');
}