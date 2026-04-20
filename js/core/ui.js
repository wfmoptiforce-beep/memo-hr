// ═══════════════════════════════════
// 🖥️ UI CONTROLLER (SINGLE SOURCE)
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
  // hide all panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));

  // show target
  const target = document.getElementById(panelId);
  if (target) target.classList.add('show');

  // update nav buttons
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
}// ═══ UPDATE MY STATUS ═══
async function updateMyStatus(newStatus) {
  if (!APP.CU?.id) return;
  
  try {
    const { error } = await sb
      .from('profiles')
      .update({ 
        status: newStatus, 
        last_seen: new Date().toISOString() 
      })
      .eq('id', APP.CU.id);
    
    if (error) {
      console.warn('Status update error:', error);
      return;
    }
    
    if (APP.CP) APP.CP.status = newStatus;
    console.log('✅ Status updated to:', newStatus);
    
  } catch (e) {
    console.warn('Status update failed:', e);
  }
}

// ═══ PUNCH IN / OUT ═══
async function doPunchIn() {
  if (!APP.CU?.id) return;
  
  const now = new Date().toISOString();
  
  try {
    const { error } = await sb
      .from('attendance')
      .insert({
        user_id: APP.CU.id,
        punch_in: now,
        date: now.split('T')[0]
      });
    
    if (error) {
      console.warn('Punch in error:', error);
      alert('❌ Punch In failed: ' + error.message);
      return;
    }
    
    // update status to online
    await updateMyStatus('online');
    
    // update UI
    const punchInBtn = document.getElementById('punch-in-btn');
    const punchOutBtn = document.getElementById('punch-out-btn');
    const punchStatus = document.getElementById('punch-status');
    
    if (punchInBtn) punchInBtn.disabled = true;
    if (punchOutBtn) punchOutBtn.disabled = false;
    if (punchStatus) {
      punchStatus.textContent = '🟢 Punched In at ' + new Date().toLocaleTimeString();
      punchStatus.style.color = '#16a34a';
    }
    
    console.log('✅ Punched In');
    
  } catch (e) {
    console.warn('Punch in failed:', e);
  }
}

async function doPunchOut() {
  if (!APP.CU?.id) return;
  
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  
  try {
    // find today's open record
    const { data: record, error: findErr } = await sb
      .from('attendance')
      .select('id, punch_in')
      .eq('user_id', APP.CU.id)
      .eq('date', today)
      .is('punch_out', null)
      .order('punch_in', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (findErr || !record) {
      alert('⚠️ No open punch-in found for today');
      return;
    }
    
    // calculate hours
    const pIn = new Date(record.punch_in);
    const pOut = new Date(now);
    const hours = ((pOut - pIn) / 3600000).toFixed(2);
    
    const { error } = await sb
      .from('attendance')
      .update({ 
        punch_out: now, 
        total_hours: parseFloat(hours) 
      })
      .eq('id', record.id);
    
    if (error) {
      console.warn('Punch out error:', error);
      alert('❌ Punch Out failed: ' + error.message);
      return;
    }
    
    // update status
    await updateMyStatus('offline');
    
    // update UI
    const punchInBtn = document.getElementById('punch-in-btn');
    const punchOutBtn = document.getElementById('punch-out-btn');
    const punchStatus = document.getElementById('punch-status');
    const hoursEl = document.getElementById('agent-hours');
    
    if (punchInBtn) punchInBtn.disabled = false;
    if (punchOutBtn) punchOutBtn.disabled = true;
    if (punchStatus) {
      punchStatus.textContent = '🔴 Punched Out at ' + new Date().toLocaleTimeString() + ' (' + hours + 'h)';
      punchStatus.style.color = '#dc2626';
    }
    if (hoursEl) hoursEl.textContent = hours + 'h';
    
    console.log('✅ Punched Out — ' + hours + 'h');
    
  } catch (e) {
    console.warn('Punch out failed:', e);
  }
}