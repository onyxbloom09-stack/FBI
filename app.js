// CONFIGURATION
const CLIENT_ID = '1499435168585220187'; // <-- Remplace par ton ID de Sensity
const REDIRECT_URI = window.location.href.split('#')[0];

// ÉTAT GLOBAL
let discordUser = JSON.parse(localStorage.getItem('fbi_discord_user')) || null;
let citizenDB = JSON.parse(localStorage.getItem('fbi_db')) || {};
let activeAgents = JSON.parse(localStorage.getItem('fbi_agents')) || [];
let currentAgent = JSON.parse(localStorage.getItem('fbi_current_agent')) || null;

// --- AUTHENTIFICATION ---

function redirectToDiscord() {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    window.location.href = authUrl;
}

async function handleDiscordAuth() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get('access_token');

    if (token) {
        try {
            const resp = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await resp.json();
            
            discordUser = {
                id: data.id,
                name: data.username,
                avatar: `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
            };
            
            localStorage.setItem('fbi_discord_user', JSON.stringify(discordUser));
            window.location.hash = ""; 
        } catch (e) {
            console.error("Auth Error:", e);
        }
    }
    checkAccess();
}

function checkAccess() {
    const lock = document.getElementById('auth-lock');
    const app = document.getElementById('main-app');

    if (discordUser) {
        lock.classList.add('hidden');
        app.classList.remove('blur');
        document.getElementById('user-avatar').src = discordUser.avatar;
        document.getElementById('user-tag').innerText = discordUser.name.toUpperCase();
        renderServicePanel();
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

// --- BASE DE DONNÉES ---

function searchCitizen() {
    const val = document.getElementById('search-input').value.trim();
    const res = document.getElementById('search-result');
    if (!val) return;

    const foundKey = Object.keys(citizenDB).find(k => k.toLowerCase() === val.toLowerCase());

    if (foundKey) {
        const d = citizenDB[foundKey];
        const statusColor = d.status === 'RECHERCHÉ' ? '#ff4d4d' : '#27ae60';
        res.innerHTML = `
            <div class="result-card">
                <div style="color:${statusColor}; font-weight:bold; margin-bottom:5px;">● ${d.status}</div>
                <h2 style="text-transform:uppercase; font-size:1.8rem;">${foundKey}</h2>
                <hr style="margin:15px 0; opacity:0.1;">
                <p style="font-family:serif; font-style:italic; line-height:1.5;">"${d.crimes}"</p>
                <button onclick="deleteCitizen('${foundKey}')" style="margin-top:20px; color:red; background:none; border:none; cursor:pointer; font-size:0.7rem;">[ EFFACER LE DOSSIER ]</button>
            </div>`;
    } else {
        res.innerHTML = `<p style="color:var(--red); margin-top:20px;">⚠️ INDIVIDU NON RÉPERTORIÉ DANS LE DISTRICT.</p>`;
    }
}

function createCitizen() {
    const name = document.getElementById('new-name').value.trim();
    const status = document.getElementById('new-status').value;
    const crimes = document.getElementById('new-crimes').value.trim();

    if (!name) return alert("Nom requis.");

    citizenDB[name] = { status, crimes: crimes || "Aucun antécédent majeur." };
    localStorage.setItem('fbi_db', JSON.stringify(citizenDB));
    
    alert("Entrée validée.");
    document.getElementById('new-name').value = "";
    document.getElementById('new-crimes').value = "";
}

function deleteCitizen(name) {
    if (confirm(`Supprimer le dossier de ${name} ?`)) {
        delete citizenDB[name];
        localStorage.setItem('fbi_db', JSON.stringify(citizenDB));
        document.getElementById('search-result').innerHTML = "";
    }
}

// --- AGENTS ---

function renderServicePanel() {
    const panel = document.getElementById('unit-management');
    if (currentAgent) {
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <p>UNITÉ EN SERVICE : <strong style="color:var(--gold)">${currentAgent.badge}</strong></p>
                <button onclick="endService()" class="logout-link">QUITTER LE SERVICE</button>
            </div>`;
    } else {
        panel.innerHTML = `
            <div style="display:flex; gap:10px;">
                <input type="text" id="badge-id" placeholder="Matricule (ex: S-01)" style="margin:0;">
                <button onclick="startService()" class="primary-btn">PRISE DE SERVICE</button>
            </div>`;
    }
    renderAgentsList();
}

function startService() {
    const badge = document.getElementById('badge-id').value.trim();
    if (!badge) return alert("Badge requis.");

    currentAgent = { badge, name: discordUser.name, id: discordUser.id };
    activeAgents.push(currentAgent);
    
    localStorage.setItem('fbi_current_agent', JSON.stringify(currentAgent));
    localStorage.setItem('fbi_agents', JSON.stringify(activeAgents));
    renderServicePanel();
}

function endService() {
    activeAgents = activeAgents.filter(a => a.id !== discordUser.id);
    currentAgent = null;
    localStorage.removeItem('fbi_current_agent');
    localStorage.setItem('fbi_agents', JSON.stringify(activeAgents));
    renderServicePanel();
}

function renderAgentsList() {
    const list = document.getElementById('agents-list');
    list.innerHTML = activeAgents.map(a => `
        <div class="glass-card" style="margin-bottom:10px; display:flex; justify-content:space-between;">
            <span>UNITÉ ${a.badge}</span>
            <span style="color:var(--gold)">${a.name}</span>
        </div>
    `).join('');
}

// --- NAVIGATION ---
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-item, .tab-pane').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});

window.onload = () => {
    handleDiscordAuth();
    setInterval(() => {
        document.getElementById('clock').innerText = new Date().toLocaleTimeString('fr-FR');
    }, 1000);
};
