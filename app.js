import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AcbXX3KgvqD7B8Y4WjCu6yNx1Prfu5cNHz",
    authDomain: "fbi1-28747.firebaseapp.com",
    projectId: "fbi1-28747",
    storageBucket: "fbi1-28747.firebasestorage.app",
    messagingSenderId: "650026420895",
    appId: "1:650026420895:web:73f582a196ab9ba73e30aa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLIENT_ID = '1499435168585220187';
const REDIRECT_URI = window.location.href.split('#')[0];
const ADMIN_IDS = ['1443517241147523223']; 

// --- INITIALISATION ---
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('fbi_user');
    if (window.location.hash.includes('access_token')) {
        handleAuth();
    } else if (savedUser) {
        window.discordUser = JSON.parse(savedUser);
        initApp();
    }
});

async function handleAuth() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('access_token');
    if (token) {
        try {
            const res = await fetch('https://discord.com/api/users/@me', { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            const data = await res.json();
            
            // Sécurité Avatar : Si l'utilisateur n'a pas d'avatar, on met l'image par défaut de Discord
            const avatarUrl = data.avatar 
                ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` 
                : `https://cdn.discordapp.com/embed/avatars/${data.discriminator % 5}.png`;

            window.discordUser = { 
                id: data.id, 
                name: data.username, 
                avatar: avatarUrl 
            };

            localStorage.setItem('fbi_user', JSON.stringify(window.discordUser));
            window.location.hash = "";
            initApp();
        } catch (error) {
            console.error("Erreur Auth:", error);
        }
    }
}

function initApp() {
    const authLock = document.getElementById('auth-lock');
    const mainApp = document.getElementById('main-app');
    
    if (authLock) authLock.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    
    document.getElementById('user-avatar').src = window.discordUser.avatar;
    document.getElementById('user-tag').innerText = window.discordUser.name.toUpperCase();
    
    if (ADMIN_IDS.includes(window.discordUser.id)) {
        const adminSec = document.getElementById('admin-section');
        if (adminSec) adminSec.style.display = 'block';
    }
    syncData();
}

// --- FONCTIONS CLOUD ---
async function saveToCloud() {
    const name = document.getElementById('target-name').value.trim();
    const status = document.getElementById('target-status').value;
    const details = document.getElementById('target-details').value.trim();

    if(!name || !details) return alert("Champs obligatoires !");

    try {
        await setDoc(doc(db, "citizens", name.toLowerCase()), {
            name, status, details, agent: window.discordUser.name, date: new Date().toLocaleString()
        });
        alert("Dossier synchronisé avec succès.");
        document.getElementById('target-name').value = "";
        document.getElementById('target-details').value = "";
    } catch (e) {
        alert("Erreur de permission : Vérifiez vos règles Firebase.");
    }
}

async function searchInCloud() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    if(!query) return;
    
    const docSnap = await getDoc(doc(db, "citizens", query));
    const result = document.getElementById('search-result');

    if (docSnap.exists()) {
        const d = docSnap.data();
        result.innerHTML = `
            <div class="glass-card" style="border-left:5px solid ${d.status === 'RECHERCHÉ' ? '#ff4d4d' : '#4dff4d'}; margin-top:20px;">
                <h3 style="color:var(--gold)">${d.name.toUpperCase()}</h3>
                <p style="margin: 10px 0;">${d.details}</p>
                <small style="opacity:0.6">Agent : ${d.agent} | ${d.date}</small>
            </div>`;
    } else {
        result.innerHTML = `<p style="color:#ff4d4d; margin-top:20px;">Individu introuvable dans la base de données.</p>`;
    }
}

function syncData() {
    onSnapshot(collection(db, "citizens"), (snapshot) => {
        const list = document.getElementById('units-list');
        if (!list) return;
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="glass-card" style="margin-bottom:10px;"><b>${d.name}</b> - <span style="color:var(--gold)">${d.status}</span></div>`;
        });
    });
}

// --- ÉVÉNEMENTS ---
document.getElementById('login-btn').onclick = () => {
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
};

document.querySelectorAll('.nav-link').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-link, .tab-pane').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if(target) target.classList.add('active');
    };
});

document.getElementById('save-exec').onclick = saveToCloud;
document.getElementById('search-exec').onclick = searchInCloud;
document.getElementById('logout-btn').onclick = () => { 
    localStorage.clear(); 
    location.reload(); 
};

setInterval(() => { 
    const clock = document.getElementById('clock');
    if(clock) clock.innerText = new Date().toLocaleTimeString('fr-FR'); 
}, 1000);
