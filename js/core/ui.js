// ═══════════════════════════════════
// 🖥️ UI CONTROLLER
// ═══════════════════════════════════

function showLogin() {
  const login = document.getElementById('login-screen');
  const app = document.getElementById('app');
  const load = document.getElementById('loading-screen');
  if (load) load.style.display = 'none';
  if (login) { login.classList.add('show'); login.style.display = ''; }
  if (app) { app.classList.remove('show'); app.style.display = 'none'; }
  const btn = document.getElementById('login-btn');
  if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
}

function showApp() {
  const login = document.getElementById('login-screen');
  const app = document.getElementById('app');
  const load = document.getElementById('loading-screen');
  if (load) load.style.display = 'none';
  if (login) { login.classList.remove('show'); login.style.display = 'none'; }
  if (app) { app.classList.add('show'); app.style.display = ''; }

  setupTopbar();
  setupUserInfo();
  showDefaultPanel();
  if (typeof initAux === 'function') initAux();
  if (typeof loadAdminPanel === 'function') loadAdminPanel();
  if (typeof loadTeamOnline === 'function') loadTeamOnline();
}

function setupTopbar() {
  const nav = document.getElementById('topbar-nav');
  if (!nav) return;
  const role = (APP.userRole || 'agent').toLowerCase();
  let tabs = [];

  if (role === 'owner' || role === 'admin') {
    tabs = [
      { id: 'panel-admin', icon: '⚙️', label: 'Admin' },
      { id: 'panel-supervisor', icon: '👥', label: 'Team' },
      { id: 'panel-quality', icon: '⭐', label: 'Quality' },
      { id: 'panel-agent', icon: '🏠', label: 'My View' },
    ];
  } else if (role === 'supervisor') {
    tabs = [
      { id: 'panel-supervisor', icon: '👥', label: 'Team' },
      { id: 'panel-quality', icon: '⭐', label: 'Quality' },
      { id: 'panel-agent', icon: '🏠', label: 'My View' },
    ];
  } else if (role === 'quality') {
    tabs = [
      { id: 'panel-quality', icon: '⭐', label: 'Quality' },
      { id: 'panel-agent', icon: '🏠', label: 'My View' },
    ];
  } else {
    tabs = [{ id: 'panel-agent', icon: '🏠', label: 'My View' }];
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

function setupUserInfo() {
  const name = APP.CP?.full_name || APP.CU?.email?.split('@')[0] || 'User';
  const role = APP.userRole || 'agent';
  safeText('user-name', name);
  safeText('user-role', role.charAt(0).toUpperCase() + role.slice(1));
  const av = document.getElementById('user-av');
  if (av) av.textContent = name.charAt(0).toUpperCase();
}

function switchPanel(panelId, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
  const target = document.getElementById(panelId);
  if (target) target.classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function showDefaultPanel() {
  const role = (APP.userRole || 'agent').toLowerCase();
  let p = 'panel-agent';
  if (role === 'owner' || role === 'admin') p = 'panel-admin';
  else if (role === 'supervisor') p = 'panel-supervisor';
  else if (role === 'quality') p = 'panel-quality';
  switchPanel(p);
}

function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.toggle('show');
}

function openModal(name) {
  const m = document.getElementById('modal-' + name);
  if (m) m.classList.add('show');
}

function closeModal(name) {
  const m = document.getElementById('modal-' + name);
  if (m) m.classList.remove('show');
}