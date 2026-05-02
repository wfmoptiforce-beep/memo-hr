console.log('✅ ui.js loaded');

window.initializeUI = function () {
    try {
        setupTopbar();
        setupUserInfo();
        setupEventListeners();
        showDefaultPanel();
        loadAllInitialData();
    } catch (e) { console.error('initializeUI error:', e); }
};

window.setupTopbar = function () {
    const nav = document.getElementById('topbar-nav');
    if (!nav) return;
    const role = (APP.userRole || 'agent').toLowerCase();
    let tabs = [];

    if (role === 'owner' || role === 'admin') {
        tabs = [
            { id: 'panel-dashboard',          icon: '🏠', label: 'Dashboard',   data: 'dashboard' },
            { id: 'panel-users',              icon: '👥', label: 'Users',        data: 'users' },
            { id: 'panel-attendance',         icon: '📅', label: 'Attendance',   data: 'attendance' },
            { id: 'panel-attendance-tracker', icon: '📊', label: 'Tracker',      data: 'attendance-tracker' },
            { id: 'panel-schedule',           icon: '📋', label: 'Schedule',     data: 'schedule' },
            { id: 'panel-reports',            icon: '📈', label: 'Reports',      data: 'reports' },
            { id: 'panel-settings',           icon: '⚙️', label: 'Settings',     data: 'settings' }
        ];
    } else if (role === 'supervisor') {
        tabs = [
            { id: 'panel-dashboard',          icon: '🏠', label: 'Dashboard',   data: 'dashboard' },
            { id: 'panel-attendance',         icon: '📅', label: 'Attendance',   data: 'attendance' },
            { id: 'panel-attendance-tracker', icon: '📊', label: 'Tracker',      data: 'attendance-tracker' },
            { id: 'panel-schedule',           icon: '📋', label: 'Schedule',     data: 'schedule' },
            { id: 'panel-reports',            icon: '📈', label: 'Reports',      data: 'reports' }
        ];
    } else if (role === 'quality') {
        tabs = [
            { id: 'panel-dashboard', icon: '🏠', label: 'Dashboard', data: 'dashboard' },
            { id: 'panel-reports',   icon: '📈', label: 'Reports',   data: 'reports' }
        ];
    } else {
        tabs = [
            { id: 'panel-dashboard', icon: '🏠', label: 'Dashboard',   data: 'dashboard' },
            { id: 'panel-schedule',  icon: '📋', label: 'My Schedule', data: 'schedule' }
        ];
    }

    nav.innerHTML = '';
    tabs.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        if (APP.currentPanel === tab.data) btn.classList.add('active');
        btn.innerHTML = `<span class="nav-icon">${tab.icon}</span> <span class="nav-label">${tab.label}</span>`;
        btn.dataset.panel = tab.data;
        btn.onclick = () => switchPanel(tab.id, btn);
        nav.appendChild(btn);
    });
};

window.setupUserInfo = function () {
    const name = APP.CP?.full_name || APP.CU?.email?.split('@')[0] || 'User';
    const role = (APP.userRole || 'agent').toLowerCase();

    safeText('user-name', name);
    safeText('user-role', role.toUpperCase());

    const av = document.getElementById('user-av');
    if (av) {
        if (APP.CP?.avatar_url && APP.CP.avatar_url.startsWith('http')) {
            av.innerHTML = `<img src="${APP.CP.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}'">`;
        } else {
            av.textContent = name.charAt(0).toUpperCase();
            av.style.display = 'flex';
            av.style.alignItems = 'center';
            av.style.justifyContent = 'center';
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
    document.querySelectorAll('.panel').forEach(p => {
        p.classList.remove('show');
        p.style.display = 'none';
    });

    const target = document.getElementById(panelId);
    if (target) {
        target.classList.add('show');
        target.style.display = 'block';
        APP.currentPanel = panelId.replace('panel-', '');
        refreshPanelData(APP.currentPanel);
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
};

window.refreshPanelData = function(panel) {
    if (panel === 'dashboard') {
        if (typeof loadDailySummary  === 'function') loadDailySummary();
        if (typeof loadMyLeaves      === 'function') loadMyLeaves();
        if (typeof loadTeamOnline    === 'function') loadTeamOnline();
    } else if (panel === 'users') {
        if (typeof loadAdminPanel    === 'function') loadAdminPanel();
    } else if (panel === 'attendance') {
        if (typeof loadTeamOnline    === 'function') loadTeamOnline();
    } else if (panel === 'attendance-tracker') {
        // المستخدم يضغط Generate بنفسه
    } else if (panel === 'schedule') {
        if (typeof loadSchedules     === 'function') loadSchedules();
    } else if (panel === 'reports') {
        if (typeof loadQualityDash   === 'function') loadQualityDash();
        if (typeof loadPendingLeaves === 'function') loadPendingLeaves();
    }
};

window.showDefaultPanel = function () {
    const firstBtn = document.querySelector('#topbar-nav .nav-btn');
    switchPanel('panel-dashboard', firstBtn);
};

window.toggleNotif = function () {
    const panel = document.getElementById('notif-panel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        const badge = document.querySelector('.notif-badge');
        if (badge) badge.style.display = 'none';
    }
};

window.loadAllInitialData = async function () {
    if (typeof loadDailySummary  === 'function') loadDailySummary();
    if (typeof syncActiveSession === 'function') syncActiveSession();
    if (typeof loadTeamOnline    === 'function') loadTeamOnline();
};

window.setupEventListeners = function () {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const modal = e.target.closest('.modal-ov');
            if (modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
        };
    });
};

window.openModal = function(modalId) {
    const m = document.getElementById('modal-' + modalId);
    if (m) {
        m.classList.add('show');
        m.style.display = 'flex';
        if (modalId === 'edit-profile') {
            const epName = document.getElementById('ep-name');
            const epAv   = document.getElementById('ep-avatar');
            if (epName) epName.value = APP.CP?.full_name || '';
            if (epAv)   epAv.value  = APP.CP?.avatar_url || '';
        }
    }
};

window.closeModal = function(modalId) {
    const m = document.getElementById('modal-' + modalId);
    if (m) {
        m.classList.remove('show');
        m.style.display = 'none';
    }
};

window.saveProfile = async function() {
    const newName = document.getElementById('ep-name')?.value?.trim();
    const newAv   = document.getElementById('ep-avatar')?.value?.trim();

    if (!newName) return alert('Please enter a name');

    try {
        const { error } = await sb.from('profiles').update({
            full_name:  newName,
            avatar_url: newAv
        }).eq('id', APP.CU.id);

        if (error) throw error;

        APP.CP.full_name  = newName;
        APP.CP.avatar_url = newAv;

        setupUserInfo();
        closeModal('edit-profile');
        showToast('✅ Profile updated successfully!', 'success');
    } catch(e) {
        console.error('saveProfile error:', e);
        showToast('❌ Failed: ' + e.message, 'error');
    }
};

// ─── إشعارات للمستخدم الحالي ────────────────────────────
window.loadMyNotifications = async function() {
    if (!window.sb || !APP.CU) return;
    try {
        const { data: notifs } = await window.sb
            .from('notifications')
            .select('*')
            .eq('user_id', APP.CU.id)
            .eq('read', false)
            .order('created_at', { ascending: false })
            .limit(20);

        const badge = document.querySelector('.notif-badge');
        const panel = document.getElementById('notif-panel');

        if (!notifs || notifs.length === 0) {
            if (badge) badge.style.display = 'none';
            if (panel) panel.innerHTML = '<p style="padding:12px;color:#9ca3af;text-align:center;font-size:13px;">No new notifications</p>';
            return;
        }

        if (badge) { badge.style.display = 'inline'; badge.textContent = notifs.length; }

        if (panel) {
            panel.innerHTML = notifs.map(n => `
                <div style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">
                    <strong>${n.from_name || 'System'}</strong>
                    <p style="margin:4px 0 0;color:#374151;">${n.message}</p>
                    <small style="color:#9ca3af;">${new Date(n.created_at).toLocaleString()}</small>
                </div>
            `).join('');
        }

        // اتحط كـ مقروء بعد الفتح
        await window.sb.from('notifications').update({ read: true }).eq('user_id', APP.CU.id).eq('read', false);

    } catch(e) { console.warn('loadMyNotifications error:', e); }
};

// تحديث الإشعارات كل 30 ثانية
document.addEventListener('APP_READY', () => {
    window.loadMyNotifications();
    setInterval(window.loadMyNotifications, 30000);
});
