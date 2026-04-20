// ═════════════════════════════════════
// 🔐 AUTH
// ═════════════════════════════════════

async function initApp() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showLogin(); return; }
    APP.CU = session.user;
    await loadProfile();
    showApp();
  } catch (e) {
    console.error('initApp error', e);
    showLogin();
  }
}

async function loadProfile() {
  try {
    const { data } = await sb.from('profiles').select('*').eq('id', APP.CU.id).maybeSingle();
    APP.CP = data || {};
  } catch (e) { APP.CP = {}; }

  APP.userRole = (APP.CU.email === 'wfmoptiforce@gmail.com')
    ? 'owner'
    : ((APP.CP?.role || 'agent').toLowerCase());
}

async function doLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const pass = document.getElementById('login-pass')?.value;
  const msg = document.getElementById('login-msg');
  const btn = document.getElementById('login-btn');

  if (!email || !pass) { if (msg) msg.textContent = '⚠️ Enter email and password'; return; }
  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
  if (msg) msg.textContent = '';

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

  if (error) {
    if (msg) { msg.textContent = '❌ ' + error.message; msg.style.color = '#e03131'; }
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
    return;
  }

  APP.CU = data.user;
  await loadProfile();
  if (msg) { msg.textContent = '✅ Welcome!'; msg.style.color = '#2f9e44'; }
  setTimeout(() => showApp(), 300);
}

async function doLogout() {
  try {
    if (APP.CU?.id) {
      await sb.from('profiles').update({ status: 'offline', last_seen: new Date().toISOString() }).eq('id', APP.CU.id);
    }
  } catch (e) {}
  await sb.auth.signOut();
  APP.CU = null; APP.CP = null; APP.userRole = 'agent';
  showLogin();
}

document.addEventListener('keydown', (e) => {
  const login = document.getElementById('login-screen');
  if (e.key === 'Enter' && login?.classList.contains('show')) doLogin();
});

document.addEventListener('DOMContentLoaded', () => initApp());