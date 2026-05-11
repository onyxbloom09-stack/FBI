// --- CONFIGURATION ---
const CLIENT_ID = '1499435168585220187';
const REDIRECT_URI = window.location.href.split('#')[0];
const ADMIN_IDS = ['1443517241147523223']; // <--- IMPORTANT : METS TON ID ICI

// --- VARIABLES D'ÉTAT ---
let discordUser = JSON.parse(localStorage.getItem('fbi_discord_user')) || null;
let activeAgents = JSON.parse(localStorage.getItem('fbi_agents')) || [];
let citizenDB = JSON.parse(localStorage.getItem('fbi_db')) || {};
let reportsDB = JSON.parse(localStorage.getItem('fbi_reports')) || [];

// --- AUTHENTIFICATION ---
function redirectToDiscord() {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    window.location.href = authUrl;
}

async function handleAuth() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get('access_token');

    if (token) {
        try {
            const res = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            discordUser = { id: data.id, name: data.username, avatar: `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` };
            localStorage.setItem('fbi_discord_user', JSON.stringify(discordUser));
            window.location.hash = "";
        } catch (e) { console.error(e); }
    }
    initUI();
}

function initUI() {
    if (discordUser) {
        document.getElementById('auth-lock').classList.add('hidden');
        document.getElementById('main-app').classList.remove('blur');
        document.getElementById('user-avatar').src = discordUser.avatar;
        document.getElementById('user-tag').innerText = discordUser.name.toUpperCase();
        
        // Vérif Admin
        if (ADMIN_IDS.includes(discordUser.id)) {
            document.getElementById('admin-nav-section').classList.remove('hidden');
        }
        
        renderAgents();
        renderReports();
    }
}

// --- GESTION DES RAPPORTS ---
function submitFullReport() {
    const title = document.getElementById('report-title').value.trim();
    const status = document.getElementById('report-status').value;
    const content = document.getElementById('report-content').value.trim();

    if (!title || !content) return alert("Veuillez remplir le titre et le contenu.");

    // 1. Sauvegarde dans les archives citoyens
    citizenDB[title] = { status, crimes: content };
    localStorage.setItem('fbi_db', JSON.stringify(citizenDB));

    // 2. Envoi du rapport à l'admin
    const report = {
        id: Date.now(),
        title: title,
        agent: discordUser.name,
        date: new Date().toLocaleString('fr-FR'),
        content: content
    };
    reportsDB.push(report);
    localStorage.setItem('fbi_reports', JSON.stringify(reportsDB));

    alert("Rapport transmis et archivé.");
    location.reload();
}

function renderReports() {
    const container = document.getElementById('admin-reports-list');
    if (!container) return;

    container.innerHTML = reportsDB.map(r => `
        <div class="report-item" onclick="openReport(${r.id})">
            <div>
                <div style="font-weight:bold; font-size:0.8rem;">${r.title}</div>
                <div style="font-size:0.65rem; color:var(--text-dim)">Par: ${r.agent}</div>
            </div>
            <button onclick="deleteReport(event, ${r.id})" class="revoke-btn">[ ARCHIVER ]</button>
        </div>
    `).reverse().join('');
}

function openReport(id) {
    const r = reportsDB.find(rep => rep.id === id);
    document.getElementById('modal-title').innerText = r.title;
    document.getElementById('modal-meta').innerText = `AGENT : ${r.agent} | DATE : ${r.date}`;
    document.getElementById('modal-content').innerText = r.content;
    document.getElementById('report-modal').classList.remove('hidden');
}

function closeReport() { document.getElementById('report-modal').classList.add('hidden'); }

function deleteReport(e, id) {
    e.stopPropagation();
    reportsDB = reportsDB.filter(r => r.id !== id);
    localStorage.setItem('fbi_reports', JSON.stringify(reportsDB));
    renderReports();
}

// --- GESTION AGENTS ---
function addAgent() {
    const name = document.getElementById('adm-name').value;
    const badge = document.getElementById('adm-badge').value;
    if (!name || !badge) return;

    activeAgents.push({ id: Date.now(), name, badge });
    localStorage.setItem('fbi_agents', JSON.stringify(activeAgents));
    renderAgents();
}

function removeAgent(id) {
    activeAgents = activeAgents.filter(a => a.id !== id);
    localStorage.setItem('fbi_agents', JSON.stringify(activeAgents));
    renderAgents();
}

function renderAgents() {
    const listPublic = document.getElementById('public-agents-list');
    const listAdmin = document.getElementById('admin-agents-list');
    const isAdmin = ADMIN_IDS.includes(discordUser.id);

    const html = activeAgents.map(a => `
        <div class="report-item" style="cursor:default">
            <span><b style="color:var(--gold)">[${a.badge}]</b> ${a.name}</span>
            ${isAdmin ? `<button onclick="removeAgent(${a.id})" class="revoke-btn">RÉVOQUER</button>` : ''}
        </div>
    `).join('');

    if (listPublic) listPublic.innerHTML = html;
    if (listAdmin) listAdmin.innerHTML = html;
}

// --- RECHERCHE ---
function searchCitizen() {
    const val = document.getElementById('search-input').value.toLowerCase();
    const res = document.getElementById('search-result');
    const key = Object.keys(citizenDB).find(k => k.toLowerCase() === val);

    if (key) {
        const d = citizenDB[key];
        res.innerHTML = `<div class="glass-card" style="margin-top:20px; background:white; color:black;">
            <h3 style="color:red">● ${d.status}</h3>
            <h2>${key}</h2>
            <p style="margin-top:10px; font-style:italic;">${d.crimes}</p>
        </div>`;
    } else { res.innerHTML = "<p>Aucun dossier.</p>"; }
}

// --- NAV & CLOCK ---
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-item, .tab-pane').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});

function logout() { localStorage.clear(); location.reload(); }

window.onload = () => {
    handleAuth();
    setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString(); }, 1000);
};
