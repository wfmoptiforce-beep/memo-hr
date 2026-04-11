<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memo Management System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #f4f7fe; }
        .hidden { display: none; }
        .glass-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
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

    <div id="mainDashboard" class="hidden max-w-7xl mx-auto animate-in fade-in duration-500">
        <nav class="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm">
            <div class="flex items-center gap-4">
                <span class="text-3xl font-black text-indigo-900 italic tracking-tighter">MEMO</span>
                <span id="roleBadge" class="px-4 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-600"></span>
            </div>
            <div class="flex gap-4">
                <button id="adminBtn" onclick="showAdmin()" class="hidden bg-amber-500 text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:bg-amber-600 transition uppercase">Admin Console</button>
                <button onclick="location.reload()" class="bg-red-50 text-red-500 px-6 py-2 rounded-xl font-bold">Logout</button>
            </div>
        </nav>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-b-[12px] border-indigo-600">
                <h3 class="font-black text-gray-400 text-xs mb-8 uppercase tracking-widest">Personal Details</h3>
                <div class="space-y-4" id="profileForm">
                    <input type="text" id="pName" class="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-indigo-900" placeholder="Name">
                    <input type="text" id="pPhone" class="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-indigo-900" placeholder="Phone">
                    <button onclick="updateProfile()" class="w-full bg-indigo-50 text-indigo-600 py-4 rounded-2xl font-black hover:bg-indigo-100 transition">Update My Data</button>
                </div>
            </div>

            <div class="lg:col-span-2 space-y-8">
                <div class="bg-white p-10 rounded-[3rem] shadow-xl flex justify-between items-center">
                    <div><p class="text-gray-400 font-bold text-xs uppercase">Session Active</p><h3 id="timer" class="text-6xl font-black text-gray-800 tracking-tighter">00:00:00</h3></div>
                    <button onclick="toggleBreak()" id="breakBtn" class="bg-purple-600 text-white px-12 py-5 rounded-3xl font-black shadow-xl transition uppercase">Take Break</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                    <div class="bg-indigo-900 p-10 rounded-[3rem] text-white shadow-2xl">
                        <p class="text-indigo-300 font-bold text-[10px] uppercase mb-2 tracking-widest">Today's Schedule</p>
                        <h4 id="todayShift" class="text-5xl font-black italic tracking-tighter">---</h4>
                    </div>
                    <div class="bg-white p-10 rounded-[3rem] shadow-xl border-b-[12px] border-red-500 text-red-500">
                        <p class="text-gray-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Missing Hours</p>
                        <h4 id="missingHrs" class="text-5xl font-black italic tracking-tighter">9h</h4>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="adminPanel" class="hidden fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 z-50">
        <div class="bg-white w-full max-w-6xl h-[90vh] rounded-[4rem] p-12 shadow-2xl overflow-y-auto">
            <div class="flex justify-between items-center mb-10">
                <h2 class="text-4xl font-black text-indigo-900 uppercase italic">Admin command Center</h2>
                <button onclick="hideAdmin()" class="bg-gray-100 px-6 py-2 rounded-xl font-bold">CLOSE</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div class="bg-red-50 p-6 rounded-3xl border-l-8 border-red-500 text-center">
                    <p class="text-red-400 font-black text-[10px] uppercase">Absenteeism Rate</p>
                    <h5 id="adminAbsent" class="text-4xl font-black text-red-600">25%</h5>
                </div>
                <div class="bg-orange-50 p-6 rounded-3xl border-l-8 border-orange-500 text-center">
                    <p class="text-orange-400 font-black text-[10px] uppercase">Total Missing Hours</p>
                    <h5 id="adminMissing" class="text-4xl font-black text-orange-600">42h</h5>
                </div>
                <div class="bg-green-50 p-6 rounded-3xl border-l-8 border-green-500 text-center text-green-600">
                    <p class="text-green-400 font-black text-[10px] uppercase">New Employees</p>
                    <button onclick="toggleAddForm()" class="mt-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase">+ Add Member</button>
                </div>
            </div>

            <div id="addMemberForm" class="hidden mb-12 bg-indigo-50 p-8 rounded-3xl animate-in slide-in-from-top">
                <h3 class="font-black text-indigo-800 text-xs mb-4 uppercase">Add to Database</h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" id="newId" placeholder="ID (MAV-XXX)" class="p-3 rounded-xl border-none font-bold">
                    <input type="text" id="newName" placeholder="Full Name" class="p-3 rounded-xl border-none font-bold">
                    <input type="text" id="newShift" placeholder="Shift (e.g. 10:00)" class="p-3 rounded-xl border-none font-bold">
                    <button onclick="addNewAgent()" class="bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs">Register</button>
                </div>
            </div>

            <div class="overflow-x-auto">
                <h3 class="font-black text-gray-400 text-[10px] mb-4 uppercase tracking-widest italic">All Agent Schedule & Performance</h3>
                <table class="w-full text-left">
                    <thead>
                        <tr class="text-indigo-300 uppercase text-[10px] font-black border-b">
                            <th class="pb-6">Agent Name</th>
                            <th class="pb-6">ID</th>
                            <th class="pb-6">Shift</th>
                            <th class="pb-6">Missing Hr</th>
                            <th class="pb-6">Status</th>
                            <th class="pb-6">Access</th>
                        </tr>
                    </thead>
                    <tbody id="adminTable" class="font-bold text-indigo-900 text-sm">
                        </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Database
        let agents = {
            "MAV-015": { name: "Asmaa Hassan", pass: "Welcome@123", role: "OWNER", sat: "10:00", phone: "01100194576", missing: 0, loginTime: null },
            "MAV-001": { name: "Marwa Elatabany", pass: "Welcome@123", role: "MEMBER", sat: "OFF", phone: "0100...", missing: 0, loginTime: null },
            "MAV-011": { name: "Haitham Sharkas", pass: "Welcome@123", role: "MEMBER", sat: "OFF", phone: "01065...", missing: 0, loginTime: null },
            "MAV-012": { name: "Ahmed Amin", pass: "Welcome@123", role: "MEMBER", sat: "13:00", phone: "01069...", missing: 9, loginTime: null },
            "MAV-004": { name: "Hana Hazem", pass: "Welcome@123", role: "MEMBER", sat: "13:00", phone: "011...", missing: 9, loginTime: null }
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
                agents[id].loginTime = new Date();
                document.getElementById('loginSection').classList.add('hidden');
                document.getElementById('mainDashboard').classList.remove('hidden');
                loadDashboard(id, agents[id]);
            } else { alert("Error: Access Denied"); }
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
        }

        function renderAdminTable() {
            const table = document.getElementById('adminTable');
            table.innerHTML = "";
            let totalMissing = 0;
            let absentCount = 0;
            let totalOnShift = 0;

            for (let id in agents) {
                const isOnline = agents[id].loginTime !== null;
                const isOff = agents[id].sat === "OFF";
                if(!isOff) totalOnShift++;
                if(!isOff && !isOnline) absentCount++;
                totalMissing += agents[id].missing;

                table.innerHTML += `
                    <tr class="border-b border-gray-50 h-16">
                        <td>${agents[id].name}</td>
                        <td>${id}</td>
                        <td>${agents[id].sat}</td>
                        <td class="text-red-500">${agents[id].missing}h</td>
                        <td><span class="${isOnline ? 'text-green-500' : 'text-gray-300'}">${isOnline ? '● Online' : '● Offline'}</span></td>
                        <td>
                             <select class="bg-indigo-50 border-none rounded-lg p-1 text-xs">
                                <option ${agents[id].role === 'MEMBER' ? 'selected' : ''}>MEMBER</option>
                                <option ${agents[id].role === 'OWNER' ? 'selected' : ''}>OWNER</option>
                            </select>
                        </td>
                    </tr>`;
            }
            document.getElementById('adminAbsent').innerText = Math.round((absentCount/totalOnShift)*100) + "%";
            document.getElementById('adminMissing').innerText = totalMissing + "h";
        }

        function showAdmin() { document.getElementById('adminPanel').classList.remove('hidden'); renderAdminTable(); }
        function hideAdmin() { document.getElementById('adminPanel').classList.add('hidden'); }
        function toggleAddForm() { document.getElementById('addMemberForm').classList.toggle('hidden'); }
        function toggleBreak() { isOnBreak = !isOnBreak; document.getElementById('breakBtn').innerText = isOnBreak ? "End Break" : "Take Break"; }

        function addNewAgent() {
            const id = document.getElementById('newId').value.toUpperCase();
            const name = document.getElementById('newName').value;
            const shift = document.getElementById('newShift').value;
            if(id && name) {
                agents[id] = { name: name, pass: "Welcome@123", role: "MEMBER", sat: shift, phone: "", missing: 9, loginTime: null };
                alert("Agent Registered Successfully!");
                renderAdminTable();
                toggleAddForm();
            }
        }
    </script>
</body>
</html>