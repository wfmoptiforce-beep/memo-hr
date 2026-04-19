// ═════════════════════════════════════
// 🖥️ UI (SHOW/HIDE / TOPBAR / PANELS / MODALS)
// ═════════════════════════════════════

function showLogin() {
  const loading = document.getElementById('loading-screen');
  const login = document.getElementById('login-screen');
  const app = document.getElementById('app');

  if (loading) loading.style.display = 'none';
  if (app) app.classList.remove('show');
  if (login) login.classList.add('show');
}

function showApp() {
  const loading = document.getElementById('loading-screen');
  const login = document.getElementById('login-screen');
  const app = document.getElementById('app');

  if (loading) loading.style.display = 'none';
  if (login) login.classList.remove('show');
  if (app) app.classList.add('show');

  setupTopbar();
  loadPanel(APP.userRole);
}

function switchPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('show');

  const nb = document.getElementById('nav-' + id);
  if (nb) nb.classList.add('active');
}

function loadPanel(role) {
  if (['owner', 'admin'].includes(role)) {
    switchPanel('admin');
    window.loadAdminPanel?.();
    return;
  }

  if (role === 'supervisor') {
    switchPanel('supervisor');
    window.loadSupPanel?.();
    window.loadAgentPanel?.();
    return;
  }

  if (role === 'quality') {
    switchPanel('quality');
    window.loadQualityPanel?.();
    window.loadAgentPanel?.();
    return;
  }

  switchPanel('agent');
  window.loadAgentPanel?.();
}

function setupTopbar() {
  const CU = APP.CU;
  const CP = APP.CP || {};

  const name =
    CP.full_name ||
    [CP.first_name, CP.last_name].filter(Boolean).join(' ') ||
    CU?.email ||
    'User';

  safeText('user-name', name);

  const role = (APP.userRole || 'agent').toLowerCase();
  safeText('user-role', role.charAt(0).toUpperCase() + role.slice(1));

  const av = document.getElementById('user-av');
  if (av) {
    if (CP.avatar_url) av.innerHTML = '<img src="' + CP.avatar_url + '">';
    else av.textContent = name.charAt(0).toUpperCase();
  }

  const navItems = {
    agent:      [{ id: 'agent', label: '🏠 Dashboard' }],
    quality:    [{ id: 'agent', label: '🏠 Home' }, { id: 'quality', label: '⭐ Quality' }],
    supervisor: [{ id: 'agent', label: '🏠 Home' }, { id: 'supervisor', label: '👥 Team' }, { id: 'quality', label: '⭐ Quality' }],
    admin:      [{ id: 'admin', label: '⚙️ Admin' }, { id: 'supervisor', label: '👥 Team' }],
    owner:      [{ id: 'admin', label: '⚙️ Admin' }, { id: 'supervisor', label: '👥 Team' }, { id: 'quality', label: '⭐ Quality' }]
  };

  const activeRole = ['owner','admin','supervisor','quality'].includes(role) ? role : 'agent';

  const nav = document.getElementById('topbar-nav');
  if (nav) {
    nav.innerHTML = (navItems[activeRole] || navItems.agent).map(n =>
      '<button class="nav-btn" onclick="switchPanel(\'' + n.id + '\')" id="nav-' + n.id + '">' + n.label + '</button>'
    ).join('');
  }

  window.loadNotifications?.();
}

// Notifications toggle
function toggleNotif() {
  const p = document.getElementById('notif-panel');
  if (!p) return;
  p.classList.toggle('show');
  if (p.classList.contains('show')) window.loadNotifications?.();
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
  const p = document.getElementById('notif-panel');
  const b = document.getElementById('notif-btn');
  if (!p || !b) return;
  if (!p.contains(e.target) && !b.contains(e.target)) p.classList.remove('show');
});

// Modals
function openModal(name) {
  const el = document.getElementById('modal-' + name);
  if (el) el.classList.add('show');
}
function closeModal(name) {
  const el = document.getElementById('modal-' + name);
  if (el) el.classList.remove('show');
}
document.querySelectorAll('.modal-ov').forEach(o => {
  o.addEventListener('click', (e) => { if (e.target === o) o.classList.remove('show'); });
});