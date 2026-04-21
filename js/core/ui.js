console.log('✅ ui.js loaded');

window.initializeUI = function () {
  try {
    setupTopbar();
    setupUserInfo();
    setupEventListeners();
    showDefaultPanel();
    loadInitialData();
  } catch (e) { console.error('initializeUI error:', e); }
};

window.setupTopbar = function () {
  const nav = document.getElementById('topbar-nav');
  if (!nav) return;
  const role = (APP.userRole || 'agent').toLowerCase();
  let tabs = [];
  if (role === 'owner' || role === 'admin') {
    tabs = [{ id: 'panel-admin', icon: '⚙️', label: 'Admin', data: 'admin' }, { id: 'panel-supervisor', icon: '👥', label: 'Team', data: 'supervisor' }, { id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' }, { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }];
  } else if (role === 'supervisor') {
    tabs = [{ id: 'panel-supervisor', icon: '👥', label: 'Team', data: 'supervisor' }, { id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' }, { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }];
  } else if (role === 'quality') {
    tabs = [{ id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' }, { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }];
  } else {
    tabs = [{ id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }];
  }
  nav.innerHTML = '';
  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn' + (i === 0 ? ' active' : '');
    btn.innerHTML = tab.icon + ' ' + tab.label;
    btn.dataset.panel = tab.data;
    btn.onclick = () => switchPanel(tab.id, btn);
    nav.appendChild(btn);
  });
};

window.setupUserInfo = function () {
  const name = APP.CP?.full_name || APP.CU?.email?.split('@')[0] || 'User';
  const role = (APP.userRole || 'agent').toLowerCase();
  safeText('user-name', name);
  safeText('user-role', role.charAt(0).toUpperCase() + role.slice(1));
  const av = document.getElementById('user-av');
  if (av) {
    if(APP.CP?.avatar_url) {
        av.innerHTML = `<img src="${APP.CP.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        av.textContent = name.charAt(0).toUpperCase();
    }
  }
  
  const hour = new Date().getHours();
  let greeting = 'Good Evening';
  if (hour < 12) greeting = 'Good Morning';
  else if (hour < 18) greeting = 'Good Afternoon';
  const welcomeEl = document.getElementById('welcome-greeting');
  if (welcomeEl) welcomeEl.textContent = `${greeting}, ${name.split(' ')[0]} 👋`;
};

window.switchPanel = function (panelId, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
  const target = document.getElementById(panelId);
  if (target) {
    target.classList.add('show');
    APP.currentPanel = panelId.replace('panel-', '');
  }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
      const fallbackBtn = document.querySelector(`[data-panel="${APP.currentPanel}"]`);
      if(fallbackBtn) fallbackBtn.classList.add('active');
  }
  if(typeof loadPanelData === 'function') loadPanelData(APP.currentPanel);
};

window.showDefaultPanel = function () {
    switchPanel('panel-agent'); // يرجع لصفحته الرئيسية
};

window.toggleNotif = function () {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

window.loadInitialData = async function () {
  if (typeof loadDailySummary === 'function') await loadDailySummary();
};

window.setupEventListeners = function () {
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const modal = e.target.closest('.modal-ov');
      if (modal) modal.classList.remove('show');
      if (modal) modal.style.display = 'none';
    };
  });
};

window.openModal = function(modalId) {
    const m = document.getElementById('modal-' + modalId);
    if(m) {
        m.classList.add('show');
        m.style.display = 'flex';
        // تعبئة البيانات لو بيعدل البروفايل
        if(modalId === 'edit-profile') {
            document.getElementById('ep-name').value = APP.CP?.full_name || '';
            document.getElementById('ep-avatar').value = APP.CP?.avatar_url || '';
        }
    }
};
window.closeModal = function(modalId) {
    const m = document.getElementById('modal-' + modalId);
    if(m) { m.classList.remove('show'); m.style.display = 'none'; }
};

// ✅ حفظ تعديلات الاسم والصورة
window.saveProfile = async function() {
    const newName = document.getElementById('ep-name').value;
    const newAv = document.getElementById('ep-avatar').value;
    try {
        await sb.from('profiles').update({ full_name: newName, avatar_url: newAv }).eq('id', APP.CU.id);
        APP.CP.full_name = newName;
        APP.CP.avatar_url = newAv;
        setupUserInfo();
        closeModal('edit-profile');
        alert("Profile updated successfully!");
    } catch(e) { console.error("Update profile error", e); alert("Failed to update profile.");}
};