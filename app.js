// --- CONFIGURATION ---
const CLIENT_ID = '1499435168585220187';
const REDIRECT_URI = window.location.href.split('#')[0];
const ADMIN_IDS = ['1443517241147523223']; // REMPLACE PAR TON ID DISCORD

// --- DATA ---
let discordUser = JSON.parse(localStorage.getItem('fbi_user')) || null;
let citizenDB = JSON.parse(localStorage.getItem('fbi_citizens')) || {};
let reportsDB = JSON.parse(localStorage.getItem('fbi_reports')) || [];
let agentsList = JSON.parse(localStorage.getItem('fbi_agents')) || [];

// --- 1. CONNEXION DISCORD ---
function redirectToDiscord() {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    window.location.href = url;
}

async function handleAuth() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('access_token');

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
            localStorage.setItem('fbi_user', JSON.stringify(discordUser));
            window.location.hash = "";
        } catch (e) { console.error(e); }
    }
    initApp();
}

function initApp() {
    if (!discordUser) return;
    
    document.getElementById('auth-lock').classList.add('hidden');
    document.getElementById('main-app').classList.remove('blur');
    document.getElementById('user-avatar').src = discordUser.avatar;
    document.getElementById('user-tag').innerText = discordUser.name.toUpperCase();

    if (ADMIN_IDS.includes(discordUser.id)) {
        document.getElementById('admin-only').style.display = 'block';
    }
    renderData();
}

// --- 2. LOGIQUE DES ONGLETS ---
document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        
        // Nettoyage
        document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        // Activation
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
    });
});

// --- 3. FONCTIONS ---
function saveCitizen() {
    const name = document.getElementById('target-name').value.trim();
    const status = document.getElementById('target-status').value;
    const details = document.getElementById('target-details').value.trim();

    if (!name || !details) return alert("Veuillez remplir tous les champs.");

    citizenDB[name] = { status, details };
    reportsDB.push({ id: Date.now(), name, agent: discordUser.name, date: new Date().toLocaleString() });

    localStorage.setItem('fbi_citizens', JSON.stringify(citizenDB));
    localStorage.setItem('fbi_reports', JSON.stringify(reportsDB));

    alert("Dossier archivé !");
    document.getElementById('target-name').value = "";
    document.getElementById('target-details').value = "";
    renderData();
}

function searchCitizen() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    const resultDiv = document.getElementById('search-result');
    const key = Object.keys(citizenDB).find(k => k.toLowerCase() === query);

    if (key) {
        const d = citizenDB[key];
        resultDiv.innerHTML = `
            <div class="glass-card" style="margin-top:20px; border-left: 5px solid ${d.status === 'RECHERCHÉ' ? 'red' : 'green'}">
                <h3>${key.toUpperCase()}</h3>
                <p>STATUT: ${d.status}</p>
                <p style="margin-top:10px; opacity:0.7; font-family:monospace;">${d.details}</p>
            </div>`;
    } else {
        resultDiv.innerHTML = "<p style='color:red; margin-top:20px;'>Aucun dossier trouvé.</p>";
    }
}

function addAgent() {
    const n = document.getElementById('adm-name').value;
    const b = document.getElementById('adm-badge').value;
    if(!n || !b) return;
    agentsList.push({ n, b, id: Date.now() });
    localStorage.setItem('fbi_agents', JSON.stringify(agentsList));
    renderData();
}

function renderData() {
    const html = agentsList.map(a => `<div class="glass-card" style="padding:10px; margin-bottom:5px;">[${a.b}] ${a.n}</div>`).join('');
    document.getElementById('public-units-list').innerHTML = html;
    document.getElementById('admin-agents-list').innerHTML = html;
    
    document.getElementById('admin-reports-list').innerHTML = reportsDB.map(r => `
        <div class="glass-card" style="padding:10px; margin-bottom:5px; font-size:0.8rem;">
            <b>${r.name}</b><br>Agent: ${r.agent} | ${r.date}
        </div>`).reverse().join('');
}

function logout() { localStorage.clear(); location.reload(); }

window.onload = () => {
    handleAuth();
    setInterval(() => { 
        const el = document.getElementById('clock');
        if(el) el.innerText = new Date().toLocaleTimeString('fr-FR'); 
    }, 1000);
};
