// CONFIG
const ADMIN_IDS = ['1443517241147523223']; 

// BASES
let citizenDB = JSON.parse(localStorage.getItem('fbi_db')) || {};
let reportsDB = JSON.parse(localStorage.getItem('fbi_reports')) || [];

// --- NAVIGATION (FONCTIONNELLE) ---
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');

        // Nettoyage complet
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        // Activation
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
    });
});

// --- RECHERCHE ---
function searchCitizen() {
    const val = document.getElementById('search-input').value.trim().toLowerCase();
    const res = document.getElementById('search-result');
    if(!val) return;

    const key = Object.keys(citizenDB).find(k => k.toLowerCase() === val);
    if(key) {
        const d = citizenDB[key];
        res.innerHTML = `
            <div class="glass-card" style="margin-top:20px; border-left: 5px solid ${d.status === 'RECHERCHÉ' ? 'red' : 'green'}">
                <small style="color:var(--gold)">STATUT: ${d.status}</small>
                <h2 style="margin:10px 0">${key.toUpperCase()}</h2>
                <p style="font-family:monospace; opacity:0.8">${d.crimes}</p>
            </div>`;
    } else {
        res.innerHTML = `<p style="color:red; margin-top:20px;">Individu inconnu.</p>`;
    }
}

// --- CREATION ---
function submitFullReport() {
    const title = document.getElementById('report-title').value.trim();
    const status = document.getElementById('report-status').value;
    const content = document.getElementById('report-content').value.trim();

    if(!title || !content) return alert("Champs vides.");

    citizenDB[title] = { status, crimes: content };
    reportsDB.push({ id: Date.now(), title, agent: "Agent", date: new Date().toLocaleString(), content });
    
    localStorage.setItem('fbi_db', JSON.stringify(citizenDB));
    localStorage.setItem('fbi_reports', JSON.stringify(reportsDB));

    alert("Dossier créé.");
    location.reload(); 
}

// Initialisation au chargement
window.onload = () => {
    // Vérification admin
    const user = JSON.parse(localStorage.getItem('fbi_discord_user'));
    if(user && ADMIN_IDS.includes(user.id)) {
        document.getElementById('admin-nav-section').style.display = 'block';
    }
    
    // Horloge
    setInterval(() => {
        document.getElementById('clock').innerText = new Date().toLocaleTimeString();
    }, 1000);
};
