// ═════════════════════════════════════
// 🔐 AUTH (INIT / LOGIN / LOGOUT)
// ═════════════════════════════════════
// ❗ showLogin() و showApp() موجودين في ui.js فقط
//    هنا بننادي عليهم بس

// ===== INIT =====
async function initApp() {
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) console.warn('getSession error', error);

    if (!session) {
      showLogin();
      if (typeof initCanvas === 'function') initCanvas();
      return;
    }

    APP.CU = session.user;

    try {
      const { data: profile, error: pErr } = await sb
        .from('profiles')
        .select('*')
        .eq('id', APP.CU.id)
        .maybeSingle();
      if (pErr) console.warn('profile load error', pErr);
      APP.CP = profile || {};
    } catch (e) {
      console.warn('profile load exception', e);
      APP.CP = {};
    }

    APP.userRole =
      (APP.CU.email === 'wfmoptiforce@gmail.com')
        ? 'owner'
        : ((APP.CP?.role || APP.CP?.access || 'agent').toLowerCase());

    showApp();

  } catch (e) {
    console.error('initApp error', e);
    showLogin();
  }
}

// ===== LOGIN =====
async function doLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const pass  = document.getElementById('login-pass')?.value;
  const msg   = document.getElementById('login-msg');
  const btn   = document.getElementById('login-btn');

  if (!email || !pass) {
    if (msg) { msg.textContent = '⚠️ Enter email and password'; msg.style.color = '#e03131'; }
    return;
  }

  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
  if (msg) msg.textContent = '';

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

  if (error) {
    if (msg) { msg.textContent = '❌ ' + error.message; msg.style.color = '#e03131'; }
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
    return;
  }

  APP.CU = data.user;

  try {
    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('*')
      .eq('id', APP.CU.id)
      .maybeSingle();
    if (pErr) console.warn('profile load error', pErr);
    APP.CP = profile || {};
  } catch (e) {
    console.warn('profile load exception', e);
    APP.CP = {};
  }

  APP.userRole =
    (APP.CU.email === 'wfmoptiforce@gmail.com')
      ? 'owner'
      : ((APP.CP?.role || APP.CP?.access || 'agent').toLowerCase());

  if (msg) { msg.textContent = '✅ Login successful!'; msg.style.color = '#2f9e44'; }

  setTimeout(() => { showApp(); }, 400);
}

// ===== LOGOUT =====
async function doLogout() {
  try {
    if (APP.CU?.id) {
      await sb.from('profiles')
        .update({ status: 'offline', last_seen: new Date().toISOString() })
        .eq('id', APP.CU.id);
    }
  } catch (e) { console.warn('set offline failed', e); }

  try { await sb.auth.signOut(); }
  catch (e) { console.warn('signOut failed', e); }

  APP.CU = null;
  APP.CP = null;
  APP.userRole = 'agent';

  showLogin();
}

// ===== ENTER KEY =====
document.addEventListener('keydown', (e) => {
  const login = document.getElementById('login-screen');
  if (!login) return;
  const visible = login.classList.contains('show') ||
                  getComputedStyle(login).display !== 'none';
  if (e.key === 'Enter' && visible) doLogin();
});

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});