// --- CONFIGURATION ---
const CLIENT_ID = '1499435168585220187'; // Ton ID Sensity
const REDIRECT_URI = window.location.href.split('#')[0]; // URL actuelle pour retour
const ADMIN_IDS = ['1443517241147523223']; // <--- REMPLACE ICI PAR TON ID NUMÉRIQUE DISCORD (ex: '28123456789')

// --- ÉTAT GLOBAL (Stockage local) ---
let discordUser = JSON.parse(localStorage.getItem('fbi_user')) || null;
let citizenDB = JSON.parse(localStorage.getItem('fbi_citizens')) || {};
let reportsDB = JSON.parse(localStorage.getItem('fbi_reports')) || [];
let agentsList = JSON.parse(localStorage.getItem('fbi_agents')) || [];

// --- 1. SYSTÈME D'AUTHENTIFICATION DISCORD ---

function redirectToDiscord() {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    window.location.href = authUrl;
}

async function handleDiscordAuth() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get('access_token');

    // Si on a un jeton dans l'URL, on l'utilise pour récupérer le profil
    if (token) {
        try {
            const resp = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await resp.json();
            
            // Stockage des infos utilisateur
            discordUser = {
                id: data.id,
                name: data.username,
                // URL de l'avatar Discord (Gère les avatars manquants par défaut)
                avatar: data.avatar 
                    ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
            };
            
            localStorage.setItem('fbi_user', JSON.stringify(discordUser));
            window.location.hash = ""; // Nettoyer l'URL
        } catch (e) {
            console.error("Erreur Auth Discord:", e);
        }
    }
    initAppAccess();
}

function initAppAccess() {
    const lock = document.getElementById('auth-lock');
    const app = document.getElementById('main-app');

    if (discordUser) {
        // Débloquer l'accès
        lock.classList.add('hidden');
        app.classList.remove('blur');
        app.style.pointerEvents = 'auto';
        
        // Remplir le profil
        document.getElementById('user-avatar').src = discordUser.avatar;
        document.getElementById('user-tag').innerText = discordUser.name.toUpperCase();
        
        // Afficher section admin si droits requis
        if (ADMIN_IDS.includes(discordUser.id)) {
            document.getElementById('admin-only').style.display = 'block';
        }
        
        renderLists(); // Charger les données
    } else {
        // Bloquer l'accès
        lock.classList.remove('hidden');
        app.classList.add('blur');
        app.style.pointerEvents = 'none';
    }
}

function logout() {
    localStorage.removeItem('fbi_user');
    location.reload();
}

// --- 2. LOGIQUE DES ONGLETS (CLOISONNEMENT) ---

document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', function() {
        const targetId = this.getAttribute('data-tab');

        // 1. Retirer 'active' de tous les boutons du menu
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
        
        // 2. Retirer 'active' de TOUTES les sections de contenu
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // 3. Activer uniquement la sélection
        this.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) {
            targetPane.classList.add('active');
        }
    });
});

// --- 3. FONCTIONS MÉTIER (Base de données) ---

function searchCitizen() {
    const input = document.getElementById('search-input');
    const resultArea = document.getElementById('search-result');
    if (!input || !resultArea) return;

    const val = input.value.trim().toLowerCase();
    if (!val) return;

    resultArea.innerHTML = ""; // Vider précédent

    const foundKey = Object.keys(citizenDB).find(k => k.toLowerCase() === val);

    if (foundKey) {
        const d = citizenDB[foundKey];
        const statusColor = d.status === 'RECHERCHÉ' ? 'red' : 'green';
        resultArea.innerHTML = `
            <div class="glass-card result-card" style="border-left: 5px solid ${statusColor}">
                <small style="color:var(--gold); font-size:0.7rem;">● STATUT : ${d.status}</small>
                <h2 style="text-transform:uppercase; font-size:1.8rem; margin:10px 0;">${foundKey}</h2>
                <hr style="opacity:0.1; margin:15px 0;">
                <p style="font-family: monospace; font-size:0.9rem; white-space:pre-wrap; background:rgba(0,0,0,0.2); padding:15px; border-radius:2px;">${d.crimes}</p>
                <button onclick="deleteCitizen('${foundKey}')" class="revoke-btn" style="margin-top:20px;">[ EFFACER LE DOSSIER ]</button>
            </div>`;
    } else {
        resultArea.innerHTML = `<p style="color:red; margin-top:20px;">Individu inconnu.</p>`;
    }
}

function saveCitizen() {
    const name = document.getElementById('target-name').value.trim();
    const status = document.getElementById('target-status').value;
    const details = document.getElementById('target-details').value.trim();

    if (!name || !details) return alert("ERREUR : Champs manquants.");

    citizenDB[name] = { status, crimes: details };
    reportsDB.push({ id: Date.now(), name, agent: discordUser.name, date: new Date().toLocaleString() });

    localStorage.setItem('fbi_citizens', JSON.stringify(citizenDB));
    localStorage.setItem('fbi_reports', JSON.stringify(reportsDB));

    alert("Dossier archivé.");
    location.reload(); // Recharger pour nettoyer
}

function addAgent() {
    const name = document.getElementById('adm-name').value.trim();
    const badge = document.getElementById('adm-badge').value.trim();
    if (!name || !badge) return;

    agentsList.push({ id: Date.now(), name, badge });
    localStorage.setItem('fbi_agents', JSON.stringify(agentsList));
    
    document.getElementById('adm-name').value = "";
    document.getElementById('adm-badge').value = "";
    renderLists();
}

function renderLists() {
    const isAdmin = ADMIN_IDS.includes(discordUser.id);
    
    // Rendu Agents (Unifié Public + Admin)
    const htmlAgents = agentsList.map(a => `
        <div class="glass-card" style="padding:15px; margin-bottom:5px; display:flex; justify-content:space-between;">
            <span><b style="color:var(--gold)">[${a.badge}]</b> ${a.name}</span>
            ${isAdmin ? `<button onclick="removeAgent(${a.id})" class="revoke-btn">RÉVOQUER</button>` : ''}
        </div>
    `).join('');
    
    document.getElementById('public-units-list').innerHTML = htmlAgents;
    document.getElementById('admin-agents-list').innerHTML = htmlAgents;
    
    // Rendu Rapports Admin
    document.getElementById('admin-reports-list').innerHTML = reportsDB.map(r => `
        <div class="glass-card" style="padding:10px; margin-bottom:5px; cursor:pointer;" onclick="openReport(${r.id})">
            <b>${r.name}</b><br>Agent: ${r.agent} | ${r.date}
        </div>`).reverse().join('');
}

// --- UTILS ---
function removeAgent(id) {
    if(confirm("Confirmer la révocation ?")) {
        agentsList = agentsList.filter(a => a.id !== id);
        localStorage.setItem('fbi_agents', JSON.stringify(agentsList));
        renderLists();
    }
}
function deleteCitizen(name) {
    if(confirm("Effacer définitivement ce dossier ?")) {
        delete citizenDB[name];
        localStorage.setItem('fbi_db', JSON.stringify(citizenDB));
        searchCitizen();
    }
}

// --- INIT & CLOCK ---
window.onload = () => {
    handleDiscordAuth();
    setInterval(() => {
        const clockEl = document.getElementById('clock');
        if(clockEl) clockEl.innerText = new Date().toLocaleTimeString('fr-FR');
    }, 1000);
};
