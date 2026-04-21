console.log('✅ status.js with Database Session persistence loaded');

window.AuxState = {
    currentAux: null,
    startTime: null,
    timerInterval: null
};

window.getAuxColor = function(aux) {
    const colors = {
        online: '#16a34a',
        break: '#eab308',
        meeting: '#f97316',
        training: '#3b82f6',
        coaching: '#8b5cf6'
    };
    return colors[aux] || '#6b7280';
};

// ✅ دالة جديدة للتأكد من وجود جلسة مفتوحة في قاعدة البيانات عند الريفريش
window.syncActiveSession = async function() {
    if (!window.sb || !APP.CU) return;
    
    try {
        // بنشوف لو فيه جلسة لسه مخلصتش (end_time is null)
        const { data: activeSession, error } = await window.sb
            .from('aux_sessions')
            .select('*')
            .eq('user_id', APP.CU.id)
            .is('end_time', null)
            .maybeSingle();

        if (activeSession) {
            console.log("📌 Found active session in DB, restoring...");
            window.AuxState.currentAux = activeSession.aux_type;
            window.AuxState.startTime = new Date(activeSession.start_time);
            
            window.updatePunchUI();
            window.startTimer();
        }
    } catch (e) {
        console.error("Sync Session Error:", e);
    }
};

window.startSelectedAux = async function() {
    const auxSelect = document.getElementById('aux-selector');
    if (!auxSelect) return;
    const aux = auxSelect.value;
    
    if (window.AuxState.currentAux === aux) return;
    
    // لو فيه حاجة شغالة، اقفلها في الداتا بيز الأول
    if (window.AuxState.currentAux) {
        await window.punchOut(true); 
    }

    const now = new Date();
    window.AuxState.currentAux = aux;
    window.AuxState.startTime = now;

    window.updatePunchUI();
    window.startTimer();

    try {
        // بنسجل بداية الجلسة وبنسيب الـ end_time فاضي
        await window.sb.from('aux_sessions').insert({
            user_id: APP.CU.id,
            aux_type: aux,
            start_time: now.toISOString(),
            date: now.toISOString().split('T')[0]
        });
        
        // تحديث حالة البروفايل فوراً عشان التيم يشوفه أونلاين
        await window.sb.from('profiles').update({ status: aux }).eq('id', APP.CU.id);
        
    } catch (e) { console.error("Start Session Error:", e); }
};

window.punchOut = async function(isSwitching = false) {
    if (!window.AuxState.currentAux) return;

    const now = new Date();
    const durationSeconds = Math.round((now - window.AuxState.startTime) / 1000);

    try {
        // تحديث الجلسة المفتوحة ووضع وقت النهاية
        await window.sb.from('aux_sessions')
            .update({ 
                end_time: now.toISOString(),
                duration_seconds: durationSeconds 
            })
            .eq('user_id', APP.CU.id)
            .is('end_time', null);

        // لو مش بيبدل، يرجع حالته Offline
        if (!isSwitching) {
            await window.sb.from('profiles').update({ status: 'offline' }).eq('id', APP.CU.id);
            
            window.AuxState.currentAux = null;
            window.AuxState.startTime = null;
            if (window.AuxState.timerInterval) clearInterval(window.AuxState.timerInterval);
            document.getElementById('aux-timer').textContent = "00:00:00";
            window.updatePunchUI();
        }
    } catch (e) { console.error("Punch Out Error:", e); }
    
    window.loadDailySummary();
};

window.loadDailySummary = async function () {
    if (!window.sb || !APP.CU) return;
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: sessions } = await window.sb
            .from('aux_sessions')
            .select('*')
            .eq('user_id', APP.CU.id)
            .eq('date', today)
            .not('end_time', 'is', null); // بنحسب بس الجلسات اللي اتقفلت

        const totals = { online: 0, break: 0, meeting: 0, training: 0, coaching: 0 };
        sessions?.forEach(s => { if (totals[s.aux_type] !== undefined) totals[s.aux_type] += (s.duration_seconds || 0); });

        const toHrs = (sec) => (sec / 3600);
        const loginHrs = toHrs(totals.online + totals.meeting + totals.training + totals.coaching);
        const missingHrs = Math.max(0, 8 - loginHrs);

        safeText('agent-hours', toHrs(totals.online).toFixed(2) + 'h');
        safeText('agent-break', toHrs(totals.break).toFixed(2) + 'h');
        safeText('agent-meeting', toHrs(totals.meeting + totals.training + totals.coaching).toFixed(2) + 'h');
        
        const msgEl = document.getElementById('agent-missing');
        if(msgEl) {
            msgEl.textContent = missingHrs.toFixed(2) + 'h';
            msgEl.style.color = missingHrs > 0 ? '#dc2626' : '#16a34a';
        }
        
        // تحديث التوتال سيماري
        safeHTML('aux-summary', `
            <div class="aux-summary-row"><span>📊 Total Login Time:</span><strong>${loginHrs.toFixed(2)}h / 8h</strong></div>
            <div class="aux-summary-row" style="color: ${missingHrs > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">
                <span>⏳ Missing:</span><strong>${missingHrs.toFixed(2)}h</strong>
            </div>
        `);
    } catch (e) { console.warn('Load summary error:', e); }
};

window.startTimer = function() {
    if (window.AuxState.timerInterval) clearInterval(window.AuxState.timerInterval);
    const timerEl = document.getElementById('aux-timer');
    window.AuxState.timerInterval = setInterval(() => {
        if (!window.AuxState.startTime) return;
        const elapsed = Math.floor((new Date() - window.AuxState.startTime) / 1000);
        const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.textContent = `${h}:${m}:${s}`;
    }, 1000);
};

window.updatePunchUI = function() {
    const status = document.getElementById('punch-status');
    if (!status) return;
    if (window.AuxState.currentAux) {
        status.textContent = '🔴 Active: ' + window.AuxState.currentAux.toUpperCase();
        status.style.color = window.getAuxColor(window.AuxState.currentAux);
    } else {
        status.textContent = '🟢 Ready to punch';
        status.style.color = '#16a34a';
    }
};

// عند التحميل، بنعمل مزامنة مع الداتا بيز فوراً
document.addEventListener('APP_READY', () => {
    window.syncActiveSession();
    window.loadDailySummary();
});