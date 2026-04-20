// ═══════════════════════════════════
// 🔐 AUTHENTICATION HANDLER
// ═══════════════════════════════════

console.log('✅ auth.js loaded');

// ✅ APP INITIALIZATION
async function initApp() {
  try {
    // Check if Supabase is ready
    if (!window.sb) {
      console.warn('Supabase not initialized yet');
      setTimeout(initApp, 500);
      return;
    }

    // Show loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';

    // Get current session
    const { data: { session }, error } = await sb.auth.getSession();

    if (error) {
      console.warn('Session error:', error);
      showLogin();
      return;
    }

    if (!session) {
      showLogin();
      return;
    }

    // User is logged in
    APP.CU = session.user;
    await loadProfile();
    showApp();

  } catch (e) {
    console.error('initApp error:', e);
    showLogin();
  } finally {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
  }
}

// ✅ LOAD USER PROFILE
async function loadProfile() {
  try {
    if (!APP.CU?.id) {
      console.warn('No user ID');
      return;
    }

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', APP.CU.id)
      .single();

    if (error) {
      console.warn('Profile load error:', error);
      APP.CP = {};
      APP.userRole = 'agent';
      return;
    }

    APP.CP = data || {};
    APP.userRole = (data?.role || 'agent').toLowerCase();

    console.log('✅ Profile loaded:', {
      name: APP.CP.full_name,
      role: APP.userRole,
      email: APP.CP.email
    });

  } catch (e) {
    console.error('loadProfile error:', e);
    APP.CP = {};
    APP.userRole = 'agent';
  }
}

// ✅ LOGIN FUNCTION
async function doLogin() {
  try {
    // Get inputs
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-pass');
    const msgEl = document.getElementById('login-msg');

    if (!emailEl || !passEl || !msgEl) {
      console.error('Login form not found');
      return;
    }

    const email = emailEl.value?.trim();
    const pass = passEl.value;

    // Validate
    if (!email || !pass) {
      msgEl.textContent = '⚠️ Please enter email and password';
      msgEl.style.color = '#dc2626';
      return;
    }

    if (!email.includes('@')) {
      msgEl.textContent = '⚠️ Invalid email format';
      msgEl.style.color = '#dc2626';
      return;
    }

    // Clear message and show loading
    msgEl.textContent = '⏳ Signing in...';
    msgEl.style.color = '#6b7280';

    // Sign in
    const { error, data } = await sb.auth.signInWithPassword({
      email,
      password: pass
    });

    if (error) {
      msgEl.textContent = '❌ ' + (error.message || 'Login failed');
      msgEl.style.color = '#dc2626';
      console.warn('Login error:', error);
      return;
    }

    if (!data.user) {
      msgEl.textContent = '❌ No user data returned';
      msgEl.style.color = '#dc2626';
      return;
    }

    // Success
    APP.CU = data.user;
    await loadProfile();

    msgEl.textContent = '✅ Welcome back!';
    msgEl.style.color = '#16a34a';

    // Redirect after 500ms
    setTimeout(() => {
      showApp();
      emailEl.value = '';
      passEl.value = '';
    }, 500);

  } catch (e) {
    const msgEl = document.getElementById('login-msg');
    if (msgEl) {
      msgEl.textContent = '❌ ' + (e.message || 'Login error');
      msgEl.style.color = '#dc2626';
    }
    console.error('doLogin error:', e);
  }
}

// ✅ LOGOUT FUNCTION
async function doLogout() {
  try {
    const { error } = await sb.auth.signOut();

    if (error) {
      console.warn('Logout error:', error);
      return;
    }

    // Clear state
    APP.CU = null;
    APP.CP = null;
    APP.userRole = 'agent';

    console.log('✅ Logged out');

    // Redirect to login
    showLogin();

  } catch (e) {
    console.error('doLogout error:', e);
  }
}

// ✅ SHOW LOGIN SCREEN
function showLogin() {
  const loginScreen = document.getElementById('login-screen');
  const appContainer = document.getElementById('app');

  if (loginScreen) {
    loginScreen.classList.remove('show');
    loginScreen.classList.add('show');
  }

  if (appContainer) {
    appContainer.classList.remove('show');
  }

  console.log('✅ Login screen shown');
}

// ✅ SHOW APP SCREEN
function showApp() {
  const loginScreen = document.getElementById('login-screen');
  const appContainer = document.getElementById('app');

  if (loginScreen) {
    loginScreen.classList.remove('show');
  }

  if (appContainer) {
    appContainer.classList.add('show');
  }

  console.log('✅ App screen shown');
}

// ✅ INITIALIZE ON DOM READY
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded, initializing app...');
  initApp();
});