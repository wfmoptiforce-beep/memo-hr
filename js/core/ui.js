console.log('✅ ui.js fully integrated');

window.initializeUI = function () {
    try {
        setupTopbar();
        setupUserInfo();
        setupEventListeners();
        showDefaultPanel();
        
        // تحضير البيانات الأولية لكل الأقسام
        loadAllInitialData();
    } catch (e) { console.error('initializeUI error:', e); }
};

window.setupTopbar = function () {
    const nav = document.getElementById('topbar-nav');
    if (!nav) return;
    const role = (APP.userRole || 'agent').toLowerCase();
    let tabs = [];

    // نظام الصلاحيات - الرتب الأعلى بتشوف كل حاجة
    if (role === 'owner' || role === 'admin') {
        tabs = [
            { id: 'panel-admin', icon: '⚙️', label: 'Admin', data: 'admin' },
            { id: 'panel-supervisor', icon: '👥', label: 'Team', data: 'supervisor' },
            { id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' },
            { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }
        ];
    } else if (role === 'supervisor') {
        tabs = [
            { id: 'panel-supervisor', icon: '👥', label: 'Team', data: 'supervisor' },
            { id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' },
            { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }
        ];
    } else if (role === 'quality') {
        tabs = [
            { id: 'panel-quality', icon: '⭐', label: 'Quality', data: 'quality' },
            { id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }
        ];
    } else {
        // الأيجنت بيشوف صفحته فقط
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
    safeText('user-role', role.toUpperCase());
    
    const av = document.getElementById('user-av');
    if (av) {
        if(APP.CP?.avatar_url) {
            av.innerHTML = `<img src="${APP.CP.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            av.textContent = name.charAt(0).toUpperCase();
        }
    }
    
    // الترحيب الذكي حسب الوقت
    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';
    
    const welcomeEl = document.getElementById('welcome-greeting');
    if (welcomeEl) welcomeEl.textContent = `${greeting}, ${name.split(' ')[0]} 👋`;
};

window.switchPanel = function (panelId, btn) {
    // إخفاء كل البانلز
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
    
    const target = document.getElementById(panelId);
    if (target) {
        target.classList.add('show');
        APP.currentPanel = panelId.replace('panel-', '');
        
        // ✅ الربط: تحميل بيانات القسم بمجرد فتحه
        if (APP.currentPanel === 'admin' && typeof loadAdminPanel === 'function') loadAdminPanel();
        if (APP.currentPanel === 'supervisor' && typeof loadTeamOnline === 'function') loadTeamOnline();
        if (APP.currentPanel === 'quality' && typeof loadQualityDash === 'function') loadQualityDash();
        if (APP.currentPanel === 'agent' && typeof loadDailySummary === 'function') loadDailySummary();
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
};

window.showDefaultPanel = function () {
    // الرجوع لصفحة الأيجنت كديفولت
    switchPanel('panel-agent');
};

window.toggleNotif = function () {
    const panel = document.getElementById('notif-panel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        // مسح علامة التنبيه لو فتحنا
        const badge = document.querySelector('.notif-badge');
        if (badge) badge.style.display = 'none';
    }
};

window.loadAllInitialData = async function () {
    // تشغيل كل الدوال اللي بتجيب داتا من السيرفر
    if (typeof loadDailySummary === 'function') await loadDailySummary();
    if (typeof loadTeamOnline === 'function') await loadTeamOnline();
    if (typeof checkLeavesStatus === 'function') await checkLeavesStatus();
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
    if(m) {
        m.classList.add('show');
        m.style.display = 'flex';
        if(modalId === 'edit-profile') {
            document.getElementById('ep-name').value = APP.CP?.full_name || '';
            document.getElementById('ep-avatar').value = APP.CP?.avatar_url || '';
        }
    }
};

window.closeModal = function(modalId) {
    const m = document.getElementById('modal-' + modalId);
    if(m) { 
        m.classList.remove('show'); 
        m.style.display = 'none'; 
    }
};

// ✅ حفظ تعديلات الاسم والصورة
window.saveProfile = async function() {
    const newName = document.getElementById('ep-name').value;
    const newAv = document.getElementById('ep-avatar').value;
    
    if(!newName) return alert("Please enter a name");

    try {
        const { error } = await sb.from('profiles').update({ 
            full_name: newName, 
            avatar_url: newAv 
        }).eq('id', APP.CU.id);
        
        if(error) throw error;

        APP.CP.full_name = newName;
        APP.CP.avatar_url = newAv;
        
        setupUserInfo();
        closeModal('edit-profile');
        alert("Profile updated successfully!");
    } catch(e) { 
        console.error("Update profile error", e); 
        alert("Failed to update profile: " + e.message);
    }
};