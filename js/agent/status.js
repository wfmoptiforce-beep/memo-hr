// ═══════════════════════════════════
// ⏰ STATUS & TIMERS (status.js)
// ═══════════════════════════════════
console.log('✅ status.js with Auto-Close & Timezone Fix loaded');

window.AuxState = {
    currentAux: null,
    startTime: null,
    timerInterval: null,
    accumulatedLoginSec: 0
};

const LOGIN_AUXES = ['online', 'meeting', 'training', 'coaching'];

window.getAuxColor = function(aux) {
    const colors = {
        online: '#16a34a',
        break: '#eab308',
        meeting: '#f97316',
        training: '#3b82f6',
        coaching: '#8b5cf6',
        offline: '#dc2626'
    };
    return colors[aux] || '#6b7280';
};

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// دالة لضبط التاريخ على التوقيت المحلي (يتفادى مشاكل التوقيت بعد منتصف الليل)
function getTodayLocal() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

window.syncActiveSession = async function() {
    if (!window.sb || !APP.CU) return;
    try {
        const today = getTodayLocal();
        const { data: activeSession } = await window.sb
            .from('aux_sessions')
            .select('*')
            .eq('user_id', APP.CU.id)
            .is('end_time', null)
            .maybeSingle();

        if (activeSession) {
            // لو السيشن مفتوحة من يوم فات (الايجنت نسي يعمل Punch Out)
            if (activeSession.date !== today) {
                console.log("📌 Found unclosed session from yesterday. Auto-closing...");
                await window.sb.from('aux_sessions')
                    .update({ 
                        end_time: new Date().toISOString(), 
                        duration_seconds: 0 // نخليه 0 عشان ميبوظش الأرقام
                    })
                    .eq('id', activeSession.id);
                    
                await window.sb.from('profiles').update({ status: 'offline' }).eq('id', APP.CU.id);
            } else {
                console.log("📌 Found active session, restoring...");
                window.AuxState.currentAux = activeSession.aux_type;
                window.AuxState.startTime = new Date(activeSession.start_time);
                document.getElementById('aux-selector').value = activeSession.aux_type;
            }
        }

        await window.loadDailySummary();
        window.updatePunchUI();
        window.startTimer();

    } catch (e) { console.error("Sync Session Error:", e); }
};

window.startSelectedAux = async function() {
    const auxSelect = document.getElementById('aux-selector');
    if (!auxSelect) return;
    const aux = auxSelect.value;
    
    if (aux === 'offline') {
        window.punchOut();
        return;
    }

    if (window.AuxState.currentAux === aux) return;
    
    if (window.AuxState.currentAux) await window.punchOut(true);

    const now = new Date();
    window.AuxState.currentAux = aux;
    window.AuxState.startTime = now;

    window.updatePunchUI();
    window.startTimer();

    try {
        const today = getTodayLocal();
        await window.sb.from('aux_sessions').insert({
            user_id: APP.CU.id,
            aux_type: aux,
            start_time: now.toISOString(),
            date: today
        });
        await window.sb.from('profiles').update({ status: aux }).eq('id', APP.CU.id);
    } catch (e) { console.error("Start Session Error:", e); }
    
    window.loadDailySummary(); 
};

window.punchOut = async function(isSwitching = false) {
    if (!window.AuxState.currentAux) return;
    const now = new Date();
    const durationSeconds = Math.round((now - window.AuxState.startTime) / 1000);

    try {
        await window.sb.from('aux_sessions')
            .update({ 
                end_time: now.toISOString(),
                duration_seconds: durationSeconds 
            })
            .eq('user_id', APP.CU.id)
            .is('end_time', null);

        if (!isSwitching) {
            await window.sb.from('profiles').update({ status: 'offline' }).eq('id', APP.CU.id);
            window.AuxState.currentAux = null;
            window.AuxState.startTime = null;
            document.getElementById('aux-selector').value = 'offline';
            
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
        const today = getTodayLocal();
        const { data: sessions } = await window.sb
            .from('aux_sessions')
            .select('*')
            .eq('user_id', APP.CU.id)
            .eq('date', today);

        const totals = { online: 0, break: 0, meeting: 0, training: 0, coaching: 0 };
        let accumulatedLogin = 0;
        const now = new Date();

        if (sessions) {
            sessions.forEach(s => {
                let duration = s.duration_seconds || 0;
                if (s.end_time) {
                    if (totals[s.aux_type] !== undefined) totals[s.aux_type] += duration;
                    if (LOGIN_AUXES.includes(s.aux_type)) accumulatedLogin += duration;
                } else {
                    const start = new Date(s.start_time);
                    let liveDuration = Math.round((now - start) / 1000);
                    if (totals[s.aux_type] !== undefined) totals[s.aux_type] += liveDuration;
                }
            });
        }

        window.AuxState.accumulatedLoginSec = accumulatedLogin;

        const toHrs = (sec) => (sec / 3600);
        const loginSec = totals.online + totals.meeting + totals.training + totals.coaching;
        const loginHrs = toHrs(loginSec);
        const missingHrs = Math.max(0, 8 - loginHrs);

        if(document.getElementById('agent-hours')) document.getElementById('agent-hours').textContent = toHrs(totals.online).toFixed(2) + 'h';
        if(document.getElementById('agent-break')) document.getElementById('agent-break').textContent = toHrs(totals.break).toFixed(2) + 'h';
        if(document.getElementById('agent-meeting')) document.getElementById('agent-meeting').textContent = toHrs(totals.meeting + totals.training + totals.coaching).toFixed(2) + 'h';
        
        const msgEl = document.getElementById('agent-missing');
        if(msgEl) {
            msgEl.textContent = missingHrs.toFixed(2) + 'h';
            msgEl.style.color = missingHrs > 0 ? '#dc2626' : '#16a34a';
        }
        
        const summaryBox = document.getElementById('aux-summary');
        if(summaryBox) {
            summaryBox.innerHTML = `
                <div class="aux-summary-row"><span>📊 Total Login Time:</span><strong>${loginHrs.toFixed(2)}h / 8.00h</strong></div>
                <div class="aux-summary-row" style="color: ${missingHrs > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">
                    <span>⏳ Missing:</span><strong>${missingHrs.toFixed(2)}h</strong>
                </div>
            `;
        }
        
        if (!window.AuxState.currentAux && document.getElementById('login-timer')) {
            document.getElementById('login-timer').textContent = formatTime(window.AuxState.accumulatedLoginSec);
        }

    } catch (e) { console.warn('Load summary error:', e); }
};

window.startTimer = function() {
    if (window.AuxState.timerInterval) clearInterval(window.AuxState.timerInterval);
    const auxTimerEl = document.getElementById('aux-timer');
    const loginTimerEl = document.getElementById('login-timer');

    window.AuxState.timerInterval = setInterval(() => {
        if (!window.AuxState.startTime) return;
        
        const now = new Date();
        const auxElapsedSec = Math.floor((now - window.AuxState.startTime) / 1000);
        
        if (auxTimerEl) auxTimerEl.textContent = formatTime(auxElapsedSec);
        
        let totalLoginNow = window.AuxState.accumulatedLoginSec;
        if (LOGIN_AUXES.includes(window.AuxState.currentAux)) {
            totalLoginNow += auxElapsedSec;
        }
        if (loginTimerEl) loginTimerEl.textContent = formatTime(totalLoginNow);
        
        if (auxElapsedSec > 0 && auxElapsedSec % 60 === 0) window.loadDailySummary(); 
    }, 1000);
};

window.updatePunchUI = function() {
    const status = document.getElementById('punch-status');
    if (!status) return;
    if (window.AuxState.currentAux) {
        status.textContent = 'Active: ' + window.AuxState.currentAux.toUpperCase();
        status.style.color = window.getAuxColor(window.AuxState.currentAux);
    } else {
        status.textContent = '🔴 Offline / Ended';
        status.style.color = '#dc2626';
    }
};

document.addEventListener('APP_READY', () => {
    window.syncActiveSession();
});