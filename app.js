import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURATION FIREBASE (À REMPLIR) ---
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

// --- CONFIG DISCORD ---
const CLIENT_ID = '1499435168585220187';
const REDIRECT_URI = window.location.href.split('#')[0];
const ADMIN_IDS = ['1443517241147523223']; 

// --- PERSISTANCE F5 ---
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
        const res = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        window.discordUser = { id: data.id, name: data.username, avatar: `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` };
        localStorage.setItem('fbi_user', JSON.stringify(window.discordUser));
        window.location.hash = "";
        initApp();
    }
}

function initApp() {
    document.getElementById('auth-lock').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-avatar').src = window.discordUser.avatar;
    document.getElementById('user-tag').innerText = window.discordUser.name.toUpperCase();
    
    if (ADMIN_IDS.includes(window.discordUser.id)) {
        document.getElementById('admin-section').style.display = 'block';
    }
    syncData();
}

// --- LOGIQUE FIREBASE ---
async function saveToCloud() {
    const name = document.getElementById('target-name').value.trim();
    const status = document.getElementById('target-status').value;
    const details = document.getElementById('target-details').value.trim();

    if(!name || !details) return alert("Champs obligatoires !");

    await setDoc(doc(db, "citizens", name.toLowerCase()), {
        name, status, details, agent: window.discordUser.name, date: new Date().toLocaleString()
    });
    alert("Dossier synchronisé.");
}

async function searchInCloud() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const docSnap = await getDoc(doc(db, "citizens", query));
    const result = document.getElementById('search-result');

    if (docSnap.exists()) {
        const d = docSnap.data();
        result.innerHTML = `<div class="glass-card" style="border-left:5px solid ${d.status === 'RECHERCHÉ' ? 'red' : 'green'}">
            <h3>${d.name}</h3><p>${d.details}</p><small>Agent : ${d.agent}</small></div>`;
    } else {
        result.innerHTML = "Individu introuvable.";
    }
}

function syncData() {
    onSnapshot(collection(db, "citizens"), (snapshot) => {
        const list = document.getElementById('units-list');
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="glass-card"><b>${d.name}</b> (${d.status})</div>`;
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
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});

document.getElementById('save-exec').onclick = saveToCloud;
document.getElementById('search-exec').onclick = searchInCloud;
document.getElementById('logout-btn').onclick = () => { localStorage.clear(); location.reload(); };

setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString(); }, 1000);
