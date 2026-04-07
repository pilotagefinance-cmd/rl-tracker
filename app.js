const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwd1ydvS52MZaUQsvkeWaJzIVzuFCH4JcFvnEi291hzwomMp78CRa6sxMlvqmCv6pUXpg/exec";

let ALL_MATCHES = [];

document.addEventListener('DOMContentLoaded', () => {
    initDate();
    initTabs();
    refreshData();
    document.getElementById('match-form').addEventListener('submit', saveMatch);
});

async function refreshData() {
    setConnectionStatus('loading', 'Synchro...');
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        ALL_MATCHES = Array.isArray(data) ? data : [];
        renderDashboard();
        setConnectionStatus('online', 'Connecté');
    } catch (err) {
        setConnectionStatus('offline', 'Erreur liaison');
    }
}

async function saveMatch(event) {
    event.preventDefault();
    const btn = document.getElementById('submit-btn');
    
    const data = {
        date: new Date().toLocaleDateString('fr-FR'),
        heure: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
        jA1: document.getElementById('team-a1').value,
        jA2: document.getElementById('team-a2').value,
        jA3: document.getElementById('team-a3').value,
        jB1: document.getElementById('team-b1').value,
        jB2: document.getElementById('team-b2').value,
        jB3: document.getElementById('team-b3').value,
        scoreA: parseInt(document.getElementById('score-a').value) || 0,
        scoreB: parseInt(document.getElementById('score-b').value) || 0
    };

    const gagnant = data.scoreA > data.scoreB ? 'A' : (data.scoreB > data.scoreA ? 'B' : 'D');
    const rowArray = [data.date, data.heure, data.jA1, data.jA2, data.jA3, data.jB1, data.jB2, data.jB3, data.scoreA, data.scoreB, gagnant];

    btn.disabled = true;
    btn.textContent = "ENVOI...";

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ row: rowArray })
        });

        ALL_MATCHES.push({
            "Date": data.date, 
            "J_A1": data.jA1, "J_A2": data.jA2, "J_A3": data.jA3,
            "J_B1": data.jB1, "J_B2": data.jB2, "J_B3": data.jB3,
            "Score_A": data.scoreA, "Score_B": data.scoreB, "Gagnant": gagnant
        });

        showSuccess();
        renderDashboard();
        event.target.reset();
    } catch (err) {
        alert("Erreur d'enregistrement");
    } finally {
        btn.disabled = false;
        btn.textContent = "ENREGISTRER LE MATCH";
    }
}

function calculateStats(matches) {
    let stats = {};
    matches.forEach(m => {
        const players = [
            { n: m.J_A1 || m.Joueur_A1, w: m.Gagnant === 'A', g: m.Score_A, o: m.Score_B },
            { n: m.J_A2 || m.Joueur_A2, w: m.Gagnant === 'A', g: m.Score_A, o: m.Score_B },
            { n: m.J_A3 || m.Joueur_A3, w: m.Gagnant === 'A', g: m.Score_A, o: m.Score_B },
            { n: m.J_B1 || m.Joueur_B1, w: m.Gagnant === 'B', g: m.Score_B, o: m.Score_A },
            { n: m.J_B2 || m.Joueur_B2, w: m.Gagnant === 'B', g: m.Score_B, o: m.Score_A },
            { n: m.J_B3 || m.Joueur_B3, w: m.Gagnant === 'B', g: m.Score_B, o: m.Score_A }
        ];

        players.forEach(p => {
            if (!p.n || p.n.trim() === "" || p.n === "undefined") return;
            if (!stats[p.n]) stats[p.n] = { name: p.n, m: 0, v: 0, d: 0, gf: 0, ga: 0 };
            
            stats[p.n].m++;
            if (p.w) stats[p.n].v++; 
            else if (m.Gagnant !== 'D') stats[p.n].d++;
            
            stats[p.n].gf += Number(p.g || 0);
            stats[p.n].ga += Number(p.o || 0);
        });
    });

    return Object.values(stats).map(s => ({
        name: s.name,
        points: s.v, 
        matches: s.m,
        wins: s.v,
        losses: s.d,
        diff: s.gf - s.ga
    })).sort((a, b) => b.points - a.points || b.diff - a.diff);
}

function renderDashboard() {
    const today = new Date().toLocaleDateString('fr-FR');
    renderTable('global-ranking-body', calculateStats(ALL_MATCHES));
    renderTable('today-ranking-body', calculateStats(ALL_MATCHES.filter(m => m.Date === today)));
}

function renderTable(id, data) {
    const b = document.getElementById(id);
    if (!b) return;
    b.innerHTML = data.map((p, i) => `
        <tr>
            <td><span class="rank">${i+1}</span> ${p.name}</td>
            <td style="font-weight:bold; color:#00d4ff">${p.points}</td>
            <td>${p.matches}</td>
            <td style="color:#00e676">${p.wins}</td>
            <td style="color:#ff4444">${p.losses}</td>
        </tr>
    `).join('') || '<tr><td colspan="5">Aucun match</td></tr>';
}

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
}

function initDate() {
    const d = new Date();
    document.getElementById('current-date').textContent = d.toLocaleDateString('fr-FR', {day:'numeric', month:'short'}).toUpperCase();
}

function setConnectionStatus(status, text) {
    document.getElementById('connection-text').textContent = text;
    document.querySelector('.live-dot').style.background = status === 'online' ? '#00e676' : (status === 'loading' ? '#ffd700' : '#ff4444');
}

function showSuccess() {
    const f = document.getElementById('success-flash');
    f.style.display = 'flex';
    setTimeout(() => f.style.display = 'none', 2000);
}