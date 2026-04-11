<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memo Management - Export & History Edition</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #f4f7fe; }
        .hidden { display: none; }
    </style>
</head>
<body class="min-h-screen p-4">

    <div id="loginSection" class="flex items-center justify-center min-h-screen">
        <div class="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-t-8 border-indigo-600">
            <h1 class="text-4xl font-black text-indigo-700 text-center mb-8 italic">MEMO LOGIN</h1>
            <form id="loginForm" class="space-y-6">
                <input type="text" id="agentId" required class="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 outline-none font-bold uppercase" placeholder="Agent ID">
                <input type="password" id="password" required class="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 outline-none font-bold" placeholder="Password">
                <button type="submit" class="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition">LOG IN</button>
            </form>
        </div>
    </div>

    <div id="mainDashboard" class="hidden max-w-7xl mx-auto">
        <nav class="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm">
            <div class="flex items-center gap-4">
                <span class="text-3xl font-black text-indigo-900 italic tracking-tighter">MEMO</span>
                <span id="roleBadge" class="px-4 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-600"></span>
            </div>
            <div class="flex gap-4">
                <button id="adminBtn" onclick="showAdmin()" class="hidden bg-amber-500 text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:bg-amber-600 transition">ADMIN CONSOLE</button>
                <button onclick="location.reload()" class="bg-red-50 text-red-500 px-6 py-2 rounded-xl font-bold">Logout</button>
            </div>
        </nav>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-b-[12px] border-indigo-600">
                <h3 class="font-black text-gray-400 text-xs mb-8 uppercase tracking-widest">Personal Details</h3>
                <div class="space-y-4">
                    <input type="text" id="pName" class="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-indigo-900" readonly>
                    <input type="text" id="pPhone" class="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-indigo-900">
                    <button onclick="alert('Data Saved Localy')" class="w-full bg-indigo-50 text-indigo-600 py-4 rounded-2xl font-black">Update My Data</button>
                </div>
            </div>
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-white p-10 rounded-[3rem] shadow-xl flex justify-between items-center">
                    <div><p class="text-gray-400 font-bold text-xs uppercase">Session</p><h3 id="timer" class="text-6xl font-black text-gray-800">00:00:00</h3></div>
                    <button onclick="toggleBreak()" id="breakBtn" class="bg-purple-600 text-white px-10 py-4 rounded-3xl font-black uppercase">Take Break</button>
                </div>
                <div class="grid grid-cols-2 gap-6">
                    <div class="bg-indigo-900 p-8 rounded-[3rem] text-white text-center">
                        <p class="text-xs uppercase opacity-60">Schedule</p>
                        <h4 id="todayShift" class="text-4xl font-black italic">---</h4>
                    </div>
                    <div class="bg-white p-8 rounded-[3rem] shadow-xl border-b-[12px] border-red-500 text-red-500 text-center">
                        <p class="text-xs uppercase opacity-60">Missing</p>
                        <h4 id="missingHrs" class="text-4xl font-black italic">9h</h4>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="adminPanel" class="hidden fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 z-50">
        <div class="bg-white w-full max-w-6xl h-[90vh] rounded-[4rem] p-12 shadow-2xl overflow-y-auto">
            <div class="flex justify-between items-center mb-8">
                <h2 class="text-3xl font-black text-indigo-900 uppercase">Reports & Export</h2>
                <div class="flex gap-2">
                    <button onclick="exportToExcel()" class="bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-xs">EXPORT EXCEL</button>
                    <button onclick="hideAdmin()" class="bg-gray-100 px-6 py-2 rounded-xl font-bold text-xs">CLOSE</button>
                </div>
            </div>

            <div class="bg-indigo-50 p-6 rounded-3xl mb-8 flex flex-wrap gap-4 items-end">
                <div>
                    <label class="block text-[10px] font-black text-indigo-400 uppercase mb-2">From Date</label>
                    <input type="date" id="dateFrom" class="p-3 rounded-xl border-none font-bold text-xs">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-indigo-400 uppercase mb-2">To Date</label>
                    <input type="date" id="dateTo" class="p-3 rounded-xl border-none font-bold text-xs">
                </div>
                <button onclick="renderAdminTable()" class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-xs">FILTER REPORT</button>
            </div>

            <div class="grid grid-cols-2 gap-6 mb-8">
                <div class="bg-red-50 p-6 rounded-3xl border-l-8 border-red-500 text-center">
                    <p class="text-red-400 font-bold text-[10px] uppercase">Absenteeism %</p>
                    <h5 id="adminAbsent" class="text-4xl font-black text-red-600">0%</h5>
                </div>
                <div class="bg-orange-50 p-6 rounded-3xl border-l-8 border-orange-500 text-center">
                    <p class="text-orange-400 font-bold text-[10px] uppercase">Total Missing Hrs</p>
                    <h5 id="adminMissing" class="text-4xl font-black text-orange-600">0h</h5>
                </div>
            </div>

            <table class="w-full text-left">
                <thead>
                    <tr class="text-indigo-300 uppercase text-[10px] font-black border-b">
                        <th class="pb-4">Date</th>
                        <th class="pb-4">Agent</th>
                        <th class="pb-4">ID</th>
                        <th class="pb-4">Shift</th>
                        <th class="pb-4">Login</th>
                        <th class="pb-4">Missing</th>
                    </tr>
                </thead>
                <tbody id="adminTable" class="font-bold text-indigo-900 text-sm"></tbody>
            </table>
        </div>
    </div>

    <script>
        let agents = {
            "MAV-015": { name: "Asmaa Hassan", pass: "Welcome@123", role: "OWNER", sat: "10:00", phone: "01100194576", missing: 0, loginTime: null, date: "2026-04-11" },
            "MAV-001": { name: "Marwa Elatabany", pass: "Welcome@123", role: "MEMBER", sat: "OFF", phone: "0100...", missing: 0, loginTime: null, date: "2026-04-11" },
            "MAV-012": { name: "Ahmed Amin", pass: "Welcome@123", role: "MEMBER", sat: "13:00", phone: "01069...", missing: 9, loginTime: null, date: "2026-04-11" }
        };

        let currentId = "";
        let workingSecs = 0;
        let isOnBreak = false;

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('agentId').value.toUpperCase().trim();
            const pw = document.getElementById('password').value.trim();
            if (agents[id] && agents[id].pass === pw) {
                currentId = id;
                agents[id].loginTime = new Date().toLocaleTimeString();
                agents[id].date = new Date().toISOString().split('T')[0];
                document.getElementById('loginSection').classList.add('hidden');
                document.getElementById('mainDashboard').classList.remove('hidden');
                loadDashboard(id, agents[id]);
            } else { alert("Error!"); }
        });

        function loadDashboard(id, user) {
            document.getElementById('pName').value = user.name;
            document.getElementById('pPhone').value = user.phone;
            document.getElementById('todayShift').innerText = user.sat;
            document.getElementById('roleBadge').innerText = user.role;
            if (id === "MAV-015") document.getElementById('adminBtn').classList.remove('hidden');
            setInterval(() => { if(!isOnBreak && user.sat !== "OFF") { workingSecs++; updateTimer(); } }, 1000);
        }

        function updateTimer() {
            let h = Math.floor(workingSecs / 3600).toString().padStart(2, '0');
            let m = Math.floor((workingSecs % 3600) / 60).toString().padStart(2, '0');
            let s = (workingSecs % 60).toString().padStart(2, '0');
            document.getElementById('timer').innerText = `${h}:${m}:${s}`;
            let missing = Math.max(0, 9 - (workingSecs / 3600));
            document.getElementById('missingHrs').innerText = Math.round(missing) + "h";
            agents[currentId].missing = Math.round(missing);
        }

        function renderAdminTable() {
            const table = document.getElementById('adminTable');
            table.innerHTML = "";
            let totalMissing = 0;
            let absentCount = 0;
            let totalOnShift = 0;

            for (let id in agents) {
                totalMissing += agents[id].missing;
                if(agents[id].sat !== "OFF") totalOnShift++;
                if(agents[id].loginTime === null && agents[id].sat !== "OFF") absentCount++;

                table.innerHTML += `
                    <tr class="border-b border-gray-50 h-12">
                        <td class="text-[10px] text-gray-400">${agents[id].date}</td>
                        <td>${agents[id].name}</td>
                        <td>${id}</td>
                        <td>${agents[id].sat}</td>
                        <td><span class="${agents[id].loginTime ? 'text-green-500' : 'text-red-300'}">${agents[id].loginTime || 'ABSENT'}</span></td>
                        <td class="text-red-500">${agents[id].missing}h</td>
                    </tr>`;
            }
            document.getElementById('adminAbsent').innerText = Math.round((absentCount/totalOnShift)*100) + "%";
            document.getElementById('adminMissing').innerText = totalMissing + "h";
        }

        function exportToExcel() {
            let csv = "Date,Agent,ID,Shift,LoginTime,MissingHours\n";
            for (let id in agents) {
                csv += `${agents[id].date},${agents[id].name},${id},${agents[id].sat},${agents[id].loginTime || 'ABSENT'},${agents[id].missing}\n`;
            }
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'MEMO_Report_' + new Date().toLocaleDateString() + '.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        function showAdmin() { document.getElementById('adminPanel').classList.remove('hidden'); renderAdminTable(); }
        function hideAdmin() { document.getElementById('adminPanel').classList.add('hidden'); }
        function toggleBreak() { isOnBreak = !isOnBreak; document.getElementById('breakBtn').innerText = isOnBreak ? "Resume" : "Take Break"; }
    </script>
</body>
</html>
