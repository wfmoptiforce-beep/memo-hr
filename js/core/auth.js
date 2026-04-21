// ═══════════════════════════════════
// 🔐 AUTHENTICATION HANDLER
// ═══════════════════════════════════

console.log('✅ auth.js loaded');

// ✅ دالة فحص وتجديد الجلسة (التصريح) تلقائياً
window.checkSession = async function() {
  try {
    const { data, error } = await window.sb.auth.getSession();
    
    // لو الجلسة مش موجودة أو فيها إيرور، نحاول نجددها
    if (error || !data.session) {
      console.log("⏳ Session expired or missing, attempting to refresh...");
      const { data: refreshData, error: refreshError } = await window.sb.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error("❌ Failed to refresh session, please login again.");
        window.doLogout(); // الخروج إجبارياً لو فشل التجديد تماماً
        return null;
      }
      
      APP.CU = refreshData.session.user; // تحديث بيانات المستخدم
      return refreshData.session;
    }
    
    return data.session;
  } catch(e) {
    console.error("Session check error:", e);
    return null;
  }
};

// ✅ APP INITIALIZATION
async function initApp() {
  try {
    // Check if Supabase is ready
    if (!window.sb) {
      console.warn('Supabase not initialized yet');
      setTimeout(initApp, 500);
      return;
    }

    // Show loading screen (optional)
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';

    // Get current session with our new smart checker
    const session = await window.checkSession();

    if (!session) {
      if (typeof window.showLogin === 'function') window.showLogin();
      return;
    }

    // User is logged in
    APP.CU = session.user;
    await loadProfile();

    if (typeof window.showApp === 'function') window.showApp();

  } catch (e) {
    console.error('initApp error:', e);
    if (typeof window.showLogin === 'function') window.showLogin();
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
window.doLogin = async function doLogin() {
  try {
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-pass');
    const msgEl = document.getElementById('login-msg');

    if (!emailEl || !passEl || !msgEl) {
      console.error('Login form not found');
      return;
    }

    const email = emailEl.value?.trim();
    const pass = passEl.value;

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

    msgEl.textContent = '⏳ Signing in...';
    msgEl.style.color = '#6b7280';

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

    if (!data?.user) {
      msgEl.textContent = '❌ No user data returned';
      msgEl.style.color = '#dc2626';
      return;
    }

    APP.CU = data.user;
    await loadProfile();

    msgEl.textContent = '✅ Welcome back!';
    msgEl.style.color = '#16a34a';

    setTimeout(() => {
      if (typeof window.showApp === 'function') window.showApp();
      emailEl.value = '';
      passEl.value = '';
    }, 300);

  } catch (e) {
    const msgEl = document.getElementById('login-msg');
    if (msgEl) {
      msgEl.textContent = '❌ ' + (e.message || 'Login error');
      msgEl.style.color = '#dc2626';
    }
    console.error('doLogin error:', e);
  }
};

// ✅ LOGOUT FUNCTION
window.doLogout = async function doLogout() {
  try {
    const { error } = await sb.auth.signOut();

    if (error) {
      console.warn('Logout error:', error);
      return;
    }

    APP.CU = null;
    APP.CP = null;
    APP.userRole = 'agent';

    console.log('✅ Logged out');

    if (typeof window.showLogin === 'function') window.showLogin();

  } catch (e) {
    console.error('doLogout error:', e);
  }
};

// ✅ INITIALIZE ON DOM READY
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded, initializing app...');
  initApp();
});