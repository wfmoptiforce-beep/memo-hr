console.log('✅ status.js loaded');

// تعريف حالة الأوجز والاحتفاظ بيها حتى لو عملت ريفريش للصفحة
window.AuxState = {
    currentAux: localStorage.getItem('currentAux') || null,
    startTime: localStorage.getItem('startTime') ? new Date(localStorage.getItem('startTime')) : null,
    timerInterval: null,
    sessions: []
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

// ✅ الدالة الأساسية للـ Punch In
window.startSelectedAux = async function() {
    const auxSelect = document.getElementById('aux-selector');
    if (!auxSelect) return;
    const aux = auxSelect.value;
    
    if (window.AuxState.currentAux === aux) {
        alert('You are already on ' + aux.toUpperCase());
        return;
    }
    
    // لو فيه أوجز شغال دلوقتي، اعمله Punch out الأول
    if (window.AuxState.currentAux) {
        await window.punchOut(true); 
    }

    const now = new Date();
    window.AuxState.currentAux = aux;
    window.AuxState.startTime = now;
    
    // حفظ في المتصفح عشان لو عمل ريفريش
    localStorage.setItem('currentAux', aux);
    localStorage.setItem('startTime', now.toISOString());

    window.updatePunchUI();
    window.startTimer();

    if (!window.sb || !APP.CU) return;

    try {
        await window.sb.from('aux_logs').insert({
            user_id: APP.CU.id,
            aux_type: aux,
            action: 'start',
            timestamp: now.toISOString(),
            date: now.toISOString().split('T')[0]
        });
    } catch (e) { 
        console.error("Log error:", e); 
    }
};

// ✅ الدالة الأساسية للـ Punch Out
window.punchOut = async function(isSwitching = false) {
    if (!window.AuxState.currentAux) {
        if (!isSwitching) alert('You are not punched in!');
        return;
    }

    const now = new Date();
    const durationSeconds = Math.round((now - window.AuxState.startTime) / 1000);

    if (window.sb && APP.CU) {
        try {
            await window.sb.from('aux_sessions').insert({
                user_id: APP.CU.id,
                aux_type: window.AuxState.currentAux,
                start_time: window.AuxState.startTime.toISOString(),
                end_time: now.toISOString(),
                duration_seconds: durationSeconds,
                date: now.toISOString().split('T')[0]
            });
        } catch (e) { 
            console.error("Session error:", e); 
        }
    }

    if (!isSwitching) {
        window.AuxState.currentAux = null;
        window.AuxState.startTime = null;
        localStorage.removeItem('currentAux');
        localStorage.removeItem('startTime');
        
        if (window.AuxState.timerInterval) clearInterval(window.AuxState.timerInterval);
        const timerEl = document.getElementById('aux-timer');
        if (timerEl) timerEl.textContent = "00:00:00";
        window.updatePunchUI();
    }
    
    if (typeof window.loadDailySummary === 'function') {
        await window.loadDailySummary(); 
    }
};

// ✅ دالة جلب ملخص اليوم والأرقام
window.loadDailySummary = async function () {
    if (!window.sb || !APP.CU) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: sessions } = await window.sb
            .from('aux_sessions')
            .select('*')
            .eq('user_id', APP.CU.id)
            .eq('date', today);

        const totals = { online: 0, break: 0, meeting: 0, training: 0, coaching: 0 };

        if (sessions) {
            sessions.forEach(s => {
                if (totals[s.aux_type] !== undefined) {
                    totals[s.aux_type] += (s.duration_seconds || 0);
                }
            });
        }

        const toHours = (sec) => (sec / 3600);

        const totalLoginSec = totals.online + totals.meeting + totals.training + totals.coaching;
        const totalLoginHrs = toHours(totalLoginSec);
        const missingHrs = Math.max(0, 8 - totalLoginHrs);

        if(document.getElementById('agent-hours')) document.getElementById('agent-hours').textContent = toHours(totals.online).toFixed(2) + 'h';
        if(document.getElementById('agent-break')) document.getElementById('agent-break').textContent = toHours(totals.break).toFixed(2) + 'h';
        if(document.getElementById('agent-meeting')) document.getElementById('agent-meeting').textContent = toHours(totals.meeting + totals.training + totals.coaching).toFixed(2) + 'h';
        
        const msgEl = document.getElementById('agent-missing');
        if(msgEl) {
            msgEl.textContent = missingHrs.toFixed(2) + 'h';
            msgEl.style.color = missingHrs > 0 ? '#dc2626' : '#16a34a';
        }

        const summaryDiv = document.getElementById('aux-summary');
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <div class="aux-summary-row"><span>🟢 Online:</span><strong>${toHours(totals.online).toFixed(2)}h</strong></div>
                <div class="aux-summary-row"><span>🟡 Break (Target 1h):</span><strong>${toHours(totals.break).toFixed(2)}h</strong></div>
                <div class="aux-summary-row"><span>🟠 Meeting/Coaching:</span><strong>${toHours(totals.meeting + totals.training + totals.coaching).toFixed(2)}h</strong></div>
                <div class="aux-summary-row total" style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;"><span>📊 Total Login Time:</span><strong>${totalLoginHrs.toFixed(2)}h / 8h</strong></div>
                <div class="aux-summary-row" style="color: ${missingHrs > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold; margin-top: 8px;">
                    <span>⏳ Missing Hours:</span><strong>${missingHrs.toFixed(2)}h</strong>
                </div>
            `;
        }
    } catch (e) { 
        console.warn('Load summary error:', e); 
    }
};

window.startTimer = function() {
    if (window.AuxState.timerInterval) clearInterval(window.AuxState.timerInterval);
    const timerEl = document.getElementById('aux-timer');
    if (!timerEl) return;
    
    window.AuxState.timerInterval = setInterval(() => {
        if (!window.AuxState.startTime) return;
        const elapsed = Math.floor((new Date() - window.AuxState.startTime) / 1000);
        const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        timerEl.textContent = `${h}:${m}:${s}`;
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

// الاستعادة لو عملت ريفريش
document.addEventListener('DOMContentLoaded', () => {
    if(window.AuxState.currentAux && window.AuxState.startTime) {
        window.updatePunchUI();
        window.startTimer();
    }
});