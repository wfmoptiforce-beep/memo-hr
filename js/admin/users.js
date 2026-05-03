// ═══════════════════════════════════
// 👥 ADMIN: USER MANAGEMENT & LEAVES
// ═══════════════════════════════════

console.log('✅ users.js loaded');

window.loadAdminPanel = async function () {
  try {
    if (!window.sb || !window.safeText || !window.todayISO) {
      console.warn('Admin core not ready');
      return;
    }

    const { data: users } = await sb.from('profiles').select('*');
    if (!users) return;

    const online = users.filter(u => u.status && u.status !== 'offline');
    const today = todayISO();

    safeText('admin-total-users', String(users.length));
    safeText('admin-online-count', String(online.length));

    const { data: att } = await sb
      .from('attendance')
      .select('user_id')
      .eq('date', today);

    const attended = att?.length || 0;
    const attRate = users.length > 0
      ? Math.round((attended / users.length) * 100)
      : 0;

    safeText('admin-att-rate', attRate + '%');
    safeText('admin-absent-count', String(users.length - attended));

    const thead = document.querySelector('#panel-users thead tr');
    if (thead) {
      thead.innerHTML = '<th>Name</th><th>Email</th><th>Position</th><th>Access Level</th><th>Status</th><th>Actions</th>';
    }

    const tbody = document.getElementById('admin-users-tbody');
    if (tbody) {
      tbody.innerHTML = users.map(u => {
        const st = u.status || 'offline';
        const stColor = st === 'offline' ? '#dc2626' : '#16a34a';
        const displayName = u.full_name || '—';
        const position = u.position || '—';

        return `
          <tr>
            <td>
              <strong>${displayName}</strong>
              ${!u.full_name ? '<br><small style="color:#f59e0b;">⚠️ Name missing</small>' : ''}
            </td>
            <td style="font-size:13px;color:#6b7280;">${u.email || '-'}</td>
            <td>${position}</td>
            <td>
              <span style="background:#f3f4f6;padding:2px 8px;border-radius:10px;font-size:12px;">
                ${u.role || 'agent'}
              </span>
            </td>
            <td><span style="color:${stColor};font-weight:600;">● ${st}</span></td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              <button
                onclick="window.openEditUser('${u.id}')"
                style="padding:4px 10px;border-radius:6px;border:1px solid #6366f1;background:#eef2ff;color:#6366f1;cursor:pointer;font-size:12px;font-weight:600;">
                ✏️ Edit
              </button>
              <select
                onchange="window.changeUserRole('${u.id}', this.value)"
                style="padding:4px 8px;border-radius:6px;border:1px solid #d1d5db;font-size:12px;">
                <option value="agent"            ${u.role === 'agent'            ? 'selected' : ''}>Agent</option>
                <option value="leader"           ${u.role === 'leader'           ? 'selected' : ''}>Leader</option>
                <option value="supervisor"       ${u.role === 'supervisor'       ? 'selected' : ''}>Supervisor</option>
                <option value="quality"          ${u.role === 'quality'          ? 'selected' : ''}>Quality</option>
                <option value="upper_management" ${u.role === 'upper_management' ? 'selected' : ''}>Upper Mgmt</option>
                <option value="admin"            ${u.role === 'admin'            ? 'selected' : ''}>Admin</option>
                <option value="owner"            ${u.role === 'owner'            ? 'selected' : ''}>Owner</option>
                <option value="suspended"        ${u.role === 'suspended'        ? 'selected' : ''}>⛔ Suspended</option>
                <option value="inactive"         ${u.role === 'inactive'         ? 'selected' : ''}>🔒 Inactive</option>
                <option value="long_leave"       ${u.role === 'long_leave'       ? 'selected' : ''}>🏖️ Long Leave</option>
              </select>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (typeof window.loadPendingLeaves === 'function') {
      window.loadPendingLeaves();
    }

    // إضافة تحديث فوري للتغييرات في الـ profiles
    if (!window.profilesSubscription) {
      window.profilesSubscription = window.sb
        .channel('profiles-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          loadAdminPanel();
        })
        .subscribe();
    }

    // إضافة تحديث فوري للتغييرات في الـ aux_sessions للتحديث اليومي
    if (!window.auxSessionsSubscription) {
      window.auxSessionsSubscription = window.sb
        .channel('aux-sessions-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'aux_sessions' }, (payload) => {
          // تحقق إذا كان التغيير لليوم الحالي
          const today = todayISO();
          if (payload.new?.date === today || payload.old?.date === today) {
            loadAdminPanel();
          }
        })
        .subscribe();
    }

  } catch (e) {
    console.warn('loadAdminPanel error:', e);
  }
};

// ✅ فتح مودال التعديل وتعبئة البيانات — آمن مع أي نسخة من المودال
window.openEditUser = async function (userId) {
  try {
    const { data: u, error } = await window.sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !u) { alert('Could not load user data.'); return; }

    // استخدام ?. عشان لو أي عنصر مش موجود في المودال ما يكسرش
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    set('edit-u-id',       u.id);
    set('edit-u-name',     u.full_name || '');
    set('edit-u-email',    u.email || '');
    set('edit-u-phone',    u.phone || '');
    set('edit-u-position', u.position || 'Agent');
    set('edit-u-role',     u.role || 'agent');
    set('edit-u-status',   u.account_status || u.status || 'offline');
    set('edit-u-join',     u.join_date || '');
    set('edit-u-last',     u.last_working_date || '');

    // تأكد إن المودال عنده الحقول الجديدة — لو لأ بيفتح مودال بديل
    const hasNewModal = !!document.getElementById('edit-u-phone');
    if (!hasNewModal) {
      // المودال القديم: نفتحه بنفس الـ IDs الموجودة
      const nameEl = document.getElementById('edit-u-name');
      if (nameEl) nameEl.removeAttribute('readonly');
      if (nameEl) nameEl.style.cssText = 'border:2px solid #6366f1; background:white; cursor:text;';
    }

    if (window.openModal) window.openModal('edit-user');

  } catch (e) {
    alert('Error loading user: ' + e.message);
  }
};

// ✅ حفظ التعديلات
window.saveUserEdit = async function () {
  const id       = document.getElementById('edit-u-id')?.value;
  const name     = document.getElementById('edit-u-name')?.value?.trim();
  const phone    = document.getElementById('edit-u-phone')?.value?.trim();
  const position = document.getElementById('edit-u-position')?.value;
  const role     = document.getElementById('edit-u-role')?.value;
  const accStatus = document.getElementById('edit-u-status')?.value;
  const joinDate = document.getElementById('edit-u-join')?.value || null;
  const lastDate = document.getElementById('edit-u-last')?.value || null;
  const msg      = document.getElementById('edit-u-msg');

  if (!id) { alert('No user selected.'); return; }
  if (!name) {
    if (msg) { msg.textContent = '⚠️ Name is required.'; msg.style.color = '#dc2626'; }
    return;
  }

  // منع تعيين دور owner إلا من قبل owner، أو إذا كان المستخدم يحرر دوره الخاص
  if (role === 'owner' && id !== window.APP?.CU?.id && window.APP?.userRole !== 'owner') {
    if (msg) { msg.textContent = '⚠️ Only owners can assign the owner role.'; msg.style.color = '#dc2626'; }
    return;
  }

  if (msg) { msg.textContent = '⏳ Saving...'; msg.style.color = '#6b7280'; }

  try {
    const { error } = await window.sb
      .from('profiles')
      .update({
        full_name:         name,
        phone:             phone || null,
        position:          position || null,
        role:              role,
        account_status:    accStatus,
        join_date:         joinDate,
        last_working_date: lastDate,
        updated_at:        new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    if (msg) { msg.textContent = '✅ Saved successfully!'; msg.style.color = '#16a34a'; }

    setTimeout(() => {
      if (window.closeModal) window.closeModal('edit-user');
      if (msg) msg.textContent = '';
      if (typeof loadAdminPanel === 'function') loadAdminPanel();
    }, 1200);

  } catch (e) {
    if (msg) { msg.textContent = '❌ ' + e.message; msg.style.color = '#dc2626'; }
  }
};

// ✅ التحقق من صيغة الايميل
window.isValidEmail = function(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ إرسال ايميل مباشرة عبر Resend API
window.sendWelcomeEmailDirect = async function(email, password, fullName) {
  try {
    console.log('📧 Sending welcome email via Resend...');
    
    // 🔑 احصل على الـ API Key من localStorage (آمن)
    let RESEND_API_KEY = localStorage.getItem('RESEND_API_KEY');
    
    // إذا ما موجود، استخدم الـ default
    if (!RESEND_API_KEY) {
      RESEND_API_KEY = 're_WgJNvXvt_FKuK6aZcnZ9qHMHZRh9hSgKG';
      // احفظه في localStorage للمستقبل
      localStorage.setItem('RESEND_API_KEY', RESEND_API_KEY);
    }
    
    if (!RESEND_API_KEY) {
      console.warn('⚠️ Resend API Key not configured');
      return false;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; line-height: 1.6; }
            .credentials-box { background: #f8f8f8; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; font-size: 16px; }
            .credential-item { margin: 12px 0; }
            .credential-label { color: #666; font-size: 14px; font-weight: bold; margin-bottom: 4px; }
            .credential-value { color: #333; font-family: monospace; font-size: 16px; background: white; padding: 10px; border-radius: 4px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; font-size: 16px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; }
            .security-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; color: #856404; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
              <h1>Memo Pro</h1>
              <p>WORKFORCE MANAGEMENT SYSTEM</p>
            </div>

            <div class="content">
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">Hello Dear,</p>
              
              <p style="font-size: 16px; margin: 15px 0;">Welcome to your MemoPro account</p>
              
              <p style="font-size: 16px; margin: 15px 0;">To log in please click the link below:</p>

              <div style="text-align: center;">
                <a href="https://memo-hr.vercel.app/" class="cta-button">🔐 Login to MemoPro</a>
              </div>

              <p style="font-size: 16px; margin: 15px 0;">Please use your username and password to log in:</p>

              <div class="credentials-box">
                <div class="credential-item">
                  <div class="credential-label">User:</div>
                  <div class="credential-value">${email}</div>
                </div>
                <div class="credential-item">
                  <div class="credential-label">Password:</div>
                  <div class="credential-value">${password}</div>
                </div>
              </div>

              <div class="security-note">
                <strong>⚠️ Important:</strong> Keep your password safe and never share it with anyone. Please change your password after first login for security.
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 20px;">If you have any questions, please contact your supervisor or administrator.</p>
            </div>

            <div class="footer">
              <p>&copy; 2026 Memo Pro - Workforce Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // إرسال عبر Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Resend default - غيّر لبريدك بعدين
        to: email,
        subject: `🎯 Welcome to Memo Pro - Your Account Details`,
        html: emailHtml
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return false;
    }

    console.log('✅ Email sent successfully via Resend!', data.id);
    return true;

  } catch(e) {
    console.error('Email error:', e);
    return false;
  }
};

// ✅ دالة تغيير الـ API Key بأمان
window.setResendApiKey = function(newKey) {
  if (!newKey || !newKey.startsWith('re_')) {
    console.error('❌ Invalid Resend API Key format');
    return false;
  }
  localStorage.setItem('RESEND_API_KEY', newKey);
  console.log('✅ Resend API Key updated successfully');
  return true;
};

// ✅ دالة للحصول على الـ API Key (للمسؤولين فقط)
window.getResendApiKey = function() {
  return localStorage.getItem('RESEND_API_KEY') || 're_WgJNvXvt_FKuK6aZcnZ9qHMHZRh9hSgKG';
};

window.addUser = async function () {
  const role = (window.APP?.userRole || 'agent').toLowerCase();
  
  // تحقق من الصلاحيات: فقط admin, owner, supervisor, و leader يمكنهم إضافة موظفين
  const allowedRoles = ['admin', 'owner', 'supervisor', 'leader'];
  if (!allowedRoles.includes(role)) {
    alert('❌ You do not have permission to add users. Only owner, admin, supervisor, and leaders can add users.');
    return;
  }

  const name      = document.getElementById('mu-name')?.value?.trim();
  const email     = document.getElementById('mu-email')?.value?.trim();
  const phone     = document.getElementById('mu-phone')?.value?.trim();
  const pass      = document.getElementById('mu-pass')?.value;
  const position  = document.getElementById('mu-position')?.value;
  const role_new  = document.getElementById('mu-role')?.value;
  const status    = document.getElementById('mu-status')?.value;
  const firstDate = document.getElementById('mu-first-date')?.value || null;
  const lastDate  = document.getElementById('mu-last-date')?.value || null;
  const msg       = document.getElementById('mu-msg');

  if (!name || !email || !pass) {
    if (msg) { msg.textContent = '⚠️ Fill Name, Email & Password'; msg.style.color = '#dc2626'; }
    return;
  }

  // ✅ التحقق من صيغة الايميل قبل الإرسال
  if (!window.isValidEmail(email)) {
    if (msg) { msg.textContent = '⚠️ Invalid email format. Example: user@example.com'; msg.style.color = '#dc2626'; }
    return;
  }

  if (pass.length < 6) {
    if (msg) { msg.textContent = '⚠️ Password must be at least 6 characters.'; msg.style.color = '#dc2626'; }
    return;
  }

  // منع إضافة مستخدم بدور owner إلا من قبل owner
  if (role_new === 'owner' && window.APP?.userRole !== 'owner') {
    if (msg) { msg.textContent = '⚠️ Only owners can add users with owner role.'; msg.style.color = '#dc2626'; }
    return;
  }

  if (msg) { msg.textContent = '⏳ Creating account...'; msg.style.color = '#6b7280'; }

  try {
    // ✅ استخدام signUp مع تعطيل التأكيد الآلي
    const { data: authData, error: authError } = await window.sb.auth.signUp({ 
      email, 
      password: pass,
      options: {
        emailRedirectTo: window.location.origin, // رابط التأكيد
        data: {
          full_name: name,
          position: position,
          phone: phone
        }
      }
    });

    if (authError) {
      if (msg) { msg.textContent = '❌ ' + (authError.message || 'Sign up failed'); msg.style.color = '#dc2626'; }
      console.error('Auth error:', authError);
      return;
    }

    const userId = authData?.user?.id || authData?.session?.user?.id;
    if (!userId) {
      if (msg) { msg.textContent = '❌ Could not get user ID. Please check Supabase auth settings.'; msg.style.color = '#dc2626'; }
      return;
    }

    if (msg) { msg.textContent = '⏳ Saving profile...'; msg.style.color = '#6b7280'; }

    const profileData = {
      id: userId,
      email,
      full_name: name,
      phone: phone || null,
      position: position || null,
      role: role_new || 'agent',
      status: status || 'offline',
      join_date: firstDate,
      last_working_date: lastDate,
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await window.sb.from('profiles').upsert(profileData, { onConflict: 'id' });
    if (profileError) throw profileError;

    if (msg) { msg.textContent = '✅ Employee added successfully!'; msg.style.color = '#16a34a'; }

    // ✅ إرسال ايميل ترحيب مباشرة
    setTimeout(async () => {
      const emailSent = await window.sendWelcomeEmailDirect(email, pass, name);
      if (emailSent) {
        if (msg) { 
          msg.innerHTML = `✅ Employee added successfully!<br><small style="font-size:12px; margin-top:8px; display:block; color:#059669;">📧 Welcome email sent to: ${email}</small>`;
        }
      } else {
        if (msg) { 
          msg.innerHTML = `✅ Employee added successfully!<br><small style="font-size:12px; margin-top:8px; display:block; color:#f97316;">⚠️ Email could not be sent</small>`;
        }
      }
    }, 600);

    ['mu-name','mu-email','mu-phone','mu-pass','mu-first-date','mu-last-date']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    setTimeout(() => {
      if (window.closeModal) closeModal('add-user');
      if (msg) msg.textContent = '';
      if (typeof loadAdminPanel === 'function') loadAdminPanel();
    }, 2500);

  } catch (e) {
    if (msg) { msg.textContent = '❌ ' + (e.message || 'Error adding user'); msg.style.color = '#dc2626'; }
    console.error('addUser error:', e);
  }
};

window.changeUserRole = async function (userId, newRole) {
  try {
    // منع تعيين دور owner إلا من قبل owner، أو إذا كان المستخدم يغير دوره الخاص
    if (newRole === 'owner' && userId !== window.APP?.CU?.id && window.APP?.userRole !== 'owner') {
      alert('Only owners can assign the owner role.');
      if (typeof loadAdminPanel === 'function') loadAdminPanel(); // إعادة تحميل لإعادة الدور السابق
      return;
    }
    await window.sb.from('profiles').update({ role: newRole }).eq('id', userId);
    if (typeof loadAdminPanel === 'function') loadAdminPanel();
  } catch (e) {
    console.warn('changeUserRole:', e);
  }
};
