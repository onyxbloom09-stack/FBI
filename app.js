// --- CONFIGURATION ---
const CLIENT_ID = '1499435168585220187';
const REDIRECT_URI = window.location.href.split('#')[0];
const ADMIN_IDS = ['1443517241147523223']; 

// --- BASE DE DONNÉES LOCALES ---
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
            discordUser = { 
                id: data.id, 
                name: data.username, 
                avatar: `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` 
            };
            localStorage.setItem('fbi_discord_user', JSON.stringify(discordUser));
            window.location.hash = "";
        } catch (e) { console.error("Auth Fail:", e); }
    }
    initTerminal();
}

function initTerminal() {
    if (!discordUser) return;

    // Débloquer l'interface
    const lock = document.getElementById('auth-lock');
    const app = document.getElementById('main-app');
    if(lock) lock.classList.add('hidden');
    if(app) app.classList.remove('blur');
    
    // Charger le profil
    document.getElementById('user-avatar').src = discordUser.avatar;
    document.getElementById('user-tag').innerText = discordUser.name.toUpperCase();
    
    // Verif Admin
    if (ADMIN_IDS.includes(discordUser.id)) {
        const section = document.getElementById('admin-nav-section');
        if(section) section.style.display = 'block';
    }
    
    renderAgents();
    renderReports();
}

// --- LOGIQUE RECHERCHE ---
function searchCitizen() {
    const input = document.getElementById('search-input');
    const resultArea = document.getElementById('search-result');
    if (!input || !resultArea) return;

    const query = input.value.trim().toLowerCase();
    if (!query) return;

    // Recherche insensible à la casse
    const matchKey = Object.keys(citizenDB).find(k => k.toLowerCase() === query);

    if (matchKey) {
        const data = citizenDB[matchKey];
        const statusColor = data.status === 'RECHERCHÉ' ? '#d32f2f' : '#2e7d32';
        
        resultArea.innerHTML = `
            <div class="glass-card" style="background:#fff; color:#111; margin-top:20px; border-top:8px solid var(--fbi-blue);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <span style="color:${statusColor}; font-weight:bold; font-size:0.8rem;">● STATUT : ${data.status}</span>
                        <h2 style="font-size:2rem; margin:10px 0; letter-spacing:-1px;">${matchKey.toUpperCase()}</h2>
                    </div>
                    <img src="assets/fbi_logo.png" style="width:60px; opacity:0.1;">
                </div>
                <hr style="margin:15px 0; opacity:0.1;">
                <p style="font-family:'Courier New'; line-height:1.6; background:#f9f9f9; padding:15px; border:1px solid #eee;">${data.crimes}</p>
                <button onclick="deleteCitizen('${matchKey}')" style="margin-top:20px; color:red; background:none; border:none; cursor:pointer; font-size:0.7rem;">[ DÉTRUIRE LE DOSSIER ]</button>
            </div>
        `;
    } else {
        resultArea.innerHTML = `<div style="color:var(--red); margin-top:20px; padding:15px; border:1px dashed var(--red);">⚠️ INDIVIDU NON RÉPERTORIÉ DANS LA BASE DE DONNÉES FEDERALE.</div>`;
    }
}

// --- CRÉATION DE DOSSIER ---
function submitFullReport() {
    const title = document.getElementById('report-title').value.trim();
    const status = document.getElementById('report-status').value;
    const content = document.getElementById('report-content').value.trim();

    if (!title || !content) return alert("ERREUR : Titre et Contenu requis.");

    // Enregistrement Archive
    citizenDB[title] = { status, crimes: content };
    localStorage.setItem('fbi_db', JSON.stringify(citizenDB));

    // Envoi Rapport Admin
    const report = {
        id: Date.now(),
        title: title,
        agent: discordUser.name,
        date: new Date().toLocaleString('fr-FR'),
        content: content
    };
    reportsDB.push(report);
    localStorage.setItem('fbi_reports', JSON.stringify(reportsDB));

    alert("ENTRÉE VALIDÉE : Le dossier a été archivé.");
    
    // Nettoyage
    document.getElementById('report-title').value = "";
    document.getElementById('report-content').value = "";
    renderReports();
}

// --- GESTION AGENTS ---
function addAgent() {
    const n = document.getElementById('adm-name').value.trim();
    const b = document.getElementById('adm-badge').value.trim();
    if (!n || !b) return;

    activeAgents.push({ id: Date.now(), name: n, badge: b });
    localStorage.setItem('fbi_agents', JSON.stringify(activeAgents));
    
    document.getElementById('adm-name').value = "";
    document.getElementById('adm-badge').value = "";
    renderAgents();
}

function removeAgent(id) {
    activeAgents = activeAgents.filter(a => a.id !== id);
    localStorage.setItem('fbi_agents', JSON.stringify(activeAgents));
    renderAgents();
}

function renderAgents() {
    const pList = document.getElementById('public-agents-list');
    const aList = document.getElementById('admin-agents-list');
    const isAdmin = discordUser && ADMIN_IDS.includes(discordUser.id);

    const html = activeAgents.map(a => `
        <div class="report-item" style="cursor:default;">
            <span><b style="color:var(--gold)">[${a.badge}]</b> ${a.name.toUpperCase()}</span>
            ${isAdmin ? `<button onclick="removeAgent(${a.id})" class="revoke-btn">[ RÉVOQUER ]</button>` : ''}
        </div>
    `).join('');

    if (pList) pList.innerHTML = html || "<p style='opacity:0.5'>Aucune unité en patrouille.</p>";
    if (aList) aList.innerHTML = html;
}

// --- GESTION RAPPORTS ---
function renderReports() {
    const container = document.getElementById('admin-reports-list');
    if (!container) return;

    container.innerHTML = reportsDB.map(r => `
        <div class="report-item" onclick="openReport(${r.id})">
            <div>
                <div style="font-weight:bold; font-size:0.9rem; color:var(--gold)">${r.title.toUpperCase()}</div>
                <div style="font-size:0.7rem; opacity:0.6">Agent: ${r.agent} | ${r.date}</div>
            </div>
            <button onclick="deleteReport(event, ${r.id})" class="revoke-btn">[ ARCHIVER ]</button>
        </div>
    `).reverse().join('');
}

function openReport(id) {
    const r = reportsDB.find(rep => rep.id === id);
    if(!r) return;
    document.getElementById('modal-title').innerText = r.title.toUpperCase();
    document.getElementById('modal-meta').innerText = `DOCUMENT OFFICIEL | AGENT : ${r.agent} | ÉMIS LE : ${r.date}`;
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

function deleteCitizen(name) {
    if(confirm("Confirmer la suppression définitive de ce dossier ?")) {
        delete citizenDB[name];
        localStorage.setItem('fbi_db', JSON.stringify(citizenDB));
        searchCitizen();
    }
}

// --- NAVIGATION ---
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        const tabId = btn.dataset.tab;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const target = document.getElementById(tabId);
        if(target) target.classList.add('active');
    };
});

function logout() { localStorage.clear(); location.reload(); }

// --- LANCEMENT ---
window.onload = () => {
    handleAuth();
    setInterval(() => { 
        const el = document.getElementById('clock');
        if(el) el.innerText = new Date().toLocaleTimeString('fr-FR'); 
    }, 1000);
};
