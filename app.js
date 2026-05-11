// CONFIGURATION
const CLIENT_ID = '1499435168585220187';
const REDIRECT_URI = window.location.href.split('#')[0];
const ADMIN_IDS = ['1443517241147523223']; 

// BASES DE DONNÉES
let discordUser = JSON.parse(localStorage.getItem('fbi_user')) || null;
let citizenDB = JSON.parse(localStorage.getItem('fbi_citizens')) || {};
let reportsDB = JSON.parse(localStorage.getItem('fbi_reports')) || [];
let agentsList = JSON.parse(localStorage.getItem('fbi_agents')) || [];

// 1. GESTION DES ONGLETS (LE CLOISONNEMENT)
document.querySelectorAll('.nav-link').forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        // Retirer la classe active des boutons et du contenu
        document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        // Activer le bon bouton et le bon contenu
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// 2. AUTHENTIFICATION
async function handleAuth() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('access_token');

    if (token) {
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

// 3. LOGIQUE MÉTIER
function saveCitizen() {
    const name = document.getElementById('target-name').value.trim();
    const status = document.getElementById('target-status').value;
    const details = document.getElementById('target-details').value.trim();

    if (!name || !details) return alert("Champs manquants !");

    citizenDB[name] = { status, details };
    reportsDB.push({ id: Date.now(), name, agent: discordUser.name, date: new Date().toLocaleString() });

    localStorage.setItem('fbi_citizens', JSON.stringify(citizenDB));
    localStorage.setItem('fbi_reports', JSON.stringify(reportsDB));

    alert("Dossier archivé.");
    document.getElementById('target-name').value = "";
    document.getElementById('target-details').value = "";
    renderData();
}

function searchCitizen() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    const resultDiv = document.getElementById('search-result');
    
    const key = Object.keys(citizenDB).find(k => k.toLowerCase() === query);

    if (key) {
        const data = citizenDB[key];
        resultDiv.innerHTML = `
            <div class="admin-card" style="margin-top:20px; border-left: 5px solid ${data.status === 'RECHERCHÉ' ? 'red' : 'green'}">
                <h3>${key.toUpperCase()}</h3>
                <p>STATUT: ${data.status}</p>
                <p style="margin-top:10px; font-family:monospace; opacity:0.8">${data.details}</p>
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
    const html = agentsList.map(a => `
        <div style="padding:10px; border-bottom:1px solid #333; display:flex; justify-content:space-between;">
            <span>[${a.b}] ${a.n}</span>
            <button onclick="removeAgent(${a.id})" style="color:red; background:none; border:none; cursor:pointer;">X</button>
        </div>`).join('');
    
    document.getElementById('units-list').innerHTML = html;
    document.getElementById('admin-agents-list').innerHTML = html;
    
    document.getElementById('admin-reports-list').innerHTML = reportsDB.map(r => `
        <div style="padding:10px; border-bottom:1px solid #333; cursor:pointer;" onclick="viewFullReport('${r.name}')">
            <b>${r.name}</b> <br> <small>Par ${r.agent} - ${r.date}</small>
        </div>`).reverse().join('');
}

// REDIRECTION & LOGOUT
function redirectToDiscord() {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    window.location.href = url;
}

function logout() { localStorage.clear(); location.reload(); }

window.onload = () => {
    handleAuth();
    setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString(); }, 1000);
};
