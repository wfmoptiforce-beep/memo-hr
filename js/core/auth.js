// ✅ AUTH HANDLER

console.log('✅ auth.js loaded');

async function initApp() {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    showLogin();
    return;
  }

  APP.CU = session.user;
  await loadProfile();
  showApp();
}

async function loadProfile() {
  try {
    const { data } = await sb
      .from('profiles')
      .select('*')
      .eq('id', APP.CU.id)
      .single();

    APP.CP = data || {};
    APP.userRole = (data?.role || 'agent').toLowerCase();
  } catch (e) {
    console.warn('Profile load failed');
    APP.userRole = 'agent';
  }
}

async function doLogin() {
  const email = document.getElementById('login-email').value;
  const pass  = document.getElementById('login-pass').value;
  const msg   = document.getElementById('login-msg');

  msg.textContent = 'Signing in...';

  const { error, data } = await sb.auth.signInWithPassword({
    email,
    password: pass
  });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  APP.CU = data.user;
  await loadProfile();
  showApp();
}

async function doLogout() {
  await sb.auth.signOut();
  APP.CU = null;
  showLogin();
}

document.addEventListener('DOMContentLoaded', initApp);