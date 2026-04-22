console.log('✅ ui.js fully integrated & linked to Sidebar UI');

window.initializeUI = function () {
    try {
        setupTopbar();
        setupUserInfo();
        setupEventListeners();
        showDefaultPanel();
        
        // تحضير البيانات الأولية لكل الأقسام فور تسجيل الدخول
        loadAllInitialData();
    } catch (e) { console.error('initializeUI error:', e); }
};

window.setupTopbar = function () {
    const nav = document.getElementById('topbar-nav');
    if (!nav) return;
    const role = (APP.userRole || 'agent').toLowerCase();
    let tabs = [];

    // نظام الصلاحيات المطور - بناءً على الصور الاحترافية اللي بعتيها
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
        tabs = [{ id: 'panel-agent', icon: '🏠', label: 'My View', data: 'agent' }];
    }

    nav.innerHTML = '';
    tabs.forEach((tab, i) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        // إضافة التميز للزرار النشط
        if (APP.currentPanel === tab.data) btn.classList.add('active');
        
        btn.innerHTML = `<span>${tab.icon}</span> ${tab.label}`;
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
        if(APP.CP?.avatar_url && APP.CP.avatar_url.startsWith('http')) {
            av.innerHTML = `<img src="${APP.CP.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.src='https://ui-avatars.com/api/?name=${name}'">`;
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
    // إخفاء كل البانلز
    document.querySelectorAll('.panel').forEach(p => {
        p.classList.remove('show');
        p.style.display = 'none';
    });
    
    const target = document.getElementById(panelId);
    if (target) {
        target.classList.add('show');
        target.style.display = 'block';
        APP.currentPanel = panelId.replace('panel-', '');
        
        // 🚀 الربط الذكي: تحديث البيانات فوراً عند الضغط على الزرار
        refreshPanelData(APP.currentPanel);
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
};

// دالة وسيطة لتحديث بيانات كل قسم
window.refreshPanelData = function(panel) {
    if (panel === 'admin') {
        if (typeof loadAdminPanel === 'function') loadAdminPanel();
        if (typeof loadPendingLeaves === 'function') loadPendingLeaves();
    } else if (panel === 'supervisor') {
        if (typeof loadTeamOnline === 'function') loadTeamOnline();
    } else if (panel === 'quality') {
        if (typeof loadQualityDash === 'function') loadQualityDash();
    } else if (panel === 'agent') {
        if (typeof loadDailySummary === 'function') loadDailySummary();
        if (typeof loadMyLeaves === 'function') loadMyLeaves();
    }
};

window.showDefaultPanel = function () {
    // لو أدمن يدخله على الأدمن، لو أيجنت يدخله على My View
    const role = (APP.userRole || 'agent').toLowerCase();
    if (role === 'owner' || role === 'admin') switchPanel('panel-admin');
    else switchPanel('panel-agent');
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
    // تحميل البيانات الأساسية في الخلفية
    if (typeof loadDailySummary === 'function') loadDailySummary();
    if (typeof loadTeamOnline === 'function') loadTeamOnline();
    // مزامنة الجلسة المفتوحة عشان لو عمل ريفريش
    if (typeof syncActiveSession === 'function') syncActiveSession();
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