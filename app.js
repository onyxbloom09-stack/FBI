// --- CONFIGURATION ---
const CLIENT_ID = '1499435168585220187';
const REDIRECT_URI = window.location.href.split('#')[0];
const ADMIN_IDS = ['1443517241147523223']; 

// --- BASE DE DONNÉES ---
let discordUser = JSON.parse(localStorage.getItem('fbi_discord_user')) || null;
let activeAgents = JSON.parse(localStorage.getItem('fbi_agents')) || [];
let citizenDB = JSON.parse(localStorage.getItem('fbi_db')) || {};
let reportsDB = JSON.parse(localStorage.getItem('fbi_reports')) || [];

// --- AUTH ---
function redirectToDiscord() {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    window.location.href = authUrl;
}

async function handleAuth() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get('access_token');
    if (token) {
        try {
            const res = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            discordUser = { id: data.id, name: data.username, avatar: `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` };
            localStorage.setItem('fbi_discord_user', JSON.stringify(discordUser));
            window.location.hash = "";
        } catch (e) { console.error(e); }
    }
    if (discordUser) {
        document.getElementById('auth-lock').classList.add('hidden');
        document.getElementById('main-app').classList.remove('blur');
        document.getElementById('user-avatar').src = discordUser.avatar;
        document.getElementById('user-tag').innerText = discordUser.name.toUpperCase();
        if (ADMIN_IDS.includes(discordUser.id)) document.getElementById('admin-nav-section').style.display = 'block';
        renderAll();
    }
}

// --- RECHERCHE ---
function searchCitizen() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    const res = document.getElementById('search-result');
    if (!query) return;

    const key = Object.keys(citizenDB).find(k => k.toLowerCase() === query);
    if (key) {
        const d = citizenDB[key];
        res.innerHTML = `
            <div class="glass-card" style="margin-top:20px; border-left: 5px solid ${d.status === 'RECHERCHÉ' ? 'red' : 'green'}">
                <span style="font-size:0.7rem; color:var(--gold)">STATUT: ${d.status}</span>
                <h2 style="margin:5px 0">${key.toUpperCase()}</h2>
                <p style="opacity:0.8; font-family:monospace">${d.crimes}</p>
                <button onclick="deleteCitizen('${key}')" style="margin-top:15px; color:red; background:none; border:none; cursor:pointer; font-size:0.7rem;">[ SUPPRIMER LE DOSSIER ]</button>
            </div>`;
    } else {
        res.innerHTML = `<p style="color:red; margin-top:20px;">Individu inconnu.</p>`;
    }
}

// --- ACTIONS ---
function submitFullReport() {
    const title = document.getElementById('report-title').value.trim();
    const status = document.getElementById('report-status').value;
    const content = document.getElementById('report-content').value.trim();

    if (!title || !content) return alert("Remplissez tous les champs.");

    citizenDB[title] = { status, crimes: content };
    reportsDB.push({ id: Date.now(), title, agent: discordUser.name, date: new Date().toLocaleString(), content });
    
    localStorage.setItem('fbi_db', JSON.stringify(citizenDB));
    localStorage.setItem('fbi_reports', JSON.stringify(reportsDB));
    
    alert("Dossier transmis.");
    document.getElementById('report-title').value = "";
    document.getElementById('report-content').value = "";
    renderAll();
}

function addAgent() {
    const name = document.getElementById('adm-name').value;
    const badge = document.getElementById('adm-badge').value;
    if (!name || !badge) return;
    activeAgents.push({ id: Date.now(), name, badge });
    localStorage.setItem('fbi_agents', JSON.stringify(activeAgents));
    renderAll();
}

// --- RENDU ---
function renderAll() {
    // Liste Unités (Public & Admin)
    const htmlAgents = activeAgents.map(a => `
        <div class="item-card">
            <span><b style="color:var(--gold)">[${a.badge}]</b> ${a.name}</span>
            ${ADMIN_IDS.includes(discordUser.id) ? `<button onclick="removeAgent(${a.id})" class="revoke-btn">RÉVOQUER</button>` : ''}
        </div>
    `).join('');
    document.getElementById('public-agents-list').innerHTML = htmlAgents;
    document.getElementById('admin-agents-list').innerHTML = htmlAgents;

    // Liste Rapports Admin
    document.getElementById('admin-reports-list').innerHTML = reportsDB.map(r => `
        <div class="item-card" onclick="openReport(${r.id})">
            <div>
                <div style="font-weight:bold; font-size:0.8rem;">${r.title}</div>
                <div style="font-size:0.6rem; opacity:0.5">${r.agent} | ${r.date}</div>
            </div>
            <button onclick="deleteReport(event, ${r.id})" class="revoke-btn">X</button>
        </div>
    `).reverse().join('');
}

// --- UTILS ---
function openReport(id) {
    const r = reportsDB.find(rep => rep.id === id);
    document.getElementById('modal-title').innerText = r.title;
    document.getElementById('modal-meta').innerText = `AGENT: ${r.agent} | DATE: ${r.date}`;
    document.getElementById('modal-content').innerText = r.content;
    document.getElementById('report-modal').classList.remove('hidden');
}
function closeReport() { document.getElementById('report-modal').classList.add('hidden'); }
function removeAgent(id) { activeAgents = activeAgents.filter(a => a.id !== id); localStorage.setItem('fbi_agents', JSON.stringify(activeAgents)); renderAll(); }
function deleteReport(e, id) { e.stopPropagation(); reportsDB = reportsDB.filter(r => r.id !== id); localStorage.setItem('fbi_reports', JSON.stringify(reportsDB)); renderAll(); }
function deleteCitizen(k) { if(confirm("Supprimer ?")) { delete citizenDB[k]; localStorage.setItem('fbi_db', JSON.stringify(citizenDB)); searchCitizen(); } }

// --- NAVIGATION ---
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
