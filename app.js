const SUPABASE_URL = "https://llwfdvxjtozfjxwibibu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsd2ZkdnhqdG96Zmp4d2liaWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTQyNzcsImV4cCI6MjA5MjkzMDI3N30.14s54yYS-YVgPunxDlak6nNlelH_ETOa0HJB1Jfpv2k";
const HEADERS = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`
};

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
        const res = await fetch(`${SUPABASE_URL}/rest/v1/matchs?select=*&order=id.asc`, { headers: HEADERS });
        if (!res.ok) throw new Error(res.status);
        ALL_MATCHES = await res.json();
        renderDashboard();
        setConnectionStatus('online', 'Connecté');
    } catch (err) {
        setConnectionStatus('offline', 'Erreur liaison');
    }
}

async function saveMatch(event) {
    event.preventDefault();
    const btn = document.getElementById('submit-btn');

    const cucu_rouge  = document.getElementById('bonus-cucu').checked  ? 1 : 0;
    const clean_sheet = document.getElementById('bonus-clean').checked ? 1 : 0;

    const score_a = parseInt(document.getElementById('score-a').value) || 0;
    const score_b = parseInt(document.getElementById('score-b').value) || 0;
    const gagnant = score_a > score_b ? 'A' : (score_b > score_a ? 'B' : 'D');

    const match = {
        date:        new Date().toLocaleDateString('fr-FR'),
        heure:       new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
        j_a1:        document.getElementById('team-a1').value,
        j_a2:        document.getElementById('team-a2').value,
        j_a3:        document.getElementById('team-a3').value,
        j_b1:        document.getElementById('team-b1').value,
        j_b2:        document.getElementById('team-b2').value,
        j_b3:        document.getElementById('team-b3').value,
        score_a, score_b, gagnant, cucu_rouge, clean_sheet
    };

    btn.disabled = true;
    btn.textContent = "ENVOI...";

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/matchs`, {
            method: 'POST',
            headers: { ...HEADERS, "Prefer": "return=representation" },
            body: JSON.stringify(match)
        });
        if (!res.ok) throw new Error(await res.text());

        const [saved] = await res.json();
        ALL_MATCHES.push(saved);

        showSuccess();
        renderDashboard();
        event.target.reset();
        document.getElementById('bonus-preview').textContent = '= 1 pt';
        document.getElementById('bonus-preview').className = 'bonus-preview';
    } catch (err) {
        alert("Erreur d'enregistrement : " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "ENREGISTRER LE MATCH";
    }
}

// ── POINTS VICTOIRE ──────────────────────────────────────
// 0 bonus → 1 pt | 1 bonus → 2 pts | 2 bonus → 4 pts
function bonusPoints(cucu_rouge, clean_sheet) {
    const count = Number(cucu_rouge || 0) + Number(clean_sheet || 0);
    if (count === 2) return 4;
    if (count === 1) return 2;
    return 1;
}

function calculateStats(matches) {
    let stats = {};

    matches.forEach(m => {
        const pts   = bonusPoints(m.cucu_rouge, m.clean_sheet);
        const isWinA = m.gagnant === 'A';
        const isWinB = m.gagnant === 'B';

        const players = [
            { n: m.j_a1, w: isWinA },
            { n: m.j_a2, w: isWinA },
            { n: m.j_a3, w: isWinA },
            { n: m.j_b1, w: isWinB },
            { n: m.j_b2, w: isWinB },
            { n: m.j_b3, w: isWinB },
        ];

        players.forEach(p => {
            if (!p.n || p.n.trim() === "" || p.n === "undefined") return;
            if (!stats[p.n]) stats[p.n] = { name: p.n, m: 0, v: 0, d: 0, pts: 0, cucu: 0, clean: 0 };

            stats[p.n].m++;
            if (p.w) {
                stats[p.n].v++;
                stats[p.n].pts  += pts;
                stats[p.n].cucu  += Number(m.cucu_rouge  || 0);
                stats[p.n].clean += Number(m.clean_sheet || 0);
            } else if (m.gagnant !== 'D') {
                stats[p.n].d++;
            }
        });
    });

    return Object.values(stats).map(s => ({
        name:    s.name,
        ratio:   s.m > 0 ? (s.pts / s.m).toFixed(2) : '0.00',
        points:  s.pts,
        cucu:    s.cucu,
        clean:   s.clean,
        matches: s.m,
        wins:    s.v,
        losses:  s.d,
    })).sort((a, b) => b.ratio - a.ratio || b.points - a.points || b.wins - a.wins);
}

function renderDashboard() {
    const today = new Date().toLocaleDateString('fr-FR');
    renderTable('global-ranking-body', calculateStats(ALL_MATCHES));
    populateDatePicker(today);
}

function populateDatePicker(defaultDate) {
    const dates = [...new Set(ALL_MATCHES.map(m => m.date))]
        .filter(Boolean)
        .sort((a, b) => {
            const toISO = d => d.split('/').reverse().join('-');
            return toISO(b).localeCompare(toISO(a));
        });

    const picker = document.getElementById('date-picker');
    const current = picker.value || defaultDate;

    picker.innerHTML = dates.length
        ? dates.map(d => `<option value="${d}" ${d === current ? 'selected' : ''}>${d === new Date().toLocaleDateString('fr-FR') ? `${d} — Aujourd'hui` : d}</option>`).join('')
        : '<option value="">— Aucun match —</option>';

    const selected = picker.value;
    renderTable('today-ranking-body', calculateStats(ALL_MATCHES.filter(m => m.date === selected)));

    picker.onchange = () => {
        renderTable('today-ranking-body', calculateStats(ALL_MATCHES.filter(m => m.date === picker.value)));
    };
}

function renderTable(id, data) {
    const b = document.getElementById(id);
    if (!b) return;
    b.innerHTML = data.map((p, i) => `
        <tr>
            <td><span class="rank">${i + 1}</span> ${p.name}</td>
            <td style="font-weight:bold; color:#00d4ff; font-family:'Share Tech Mono',monospace">${p.ratio}</td>
            <td style="font-weight:bold; color:#00d4ff">${p.points}</td>
            <td style="color:#ff6b6b">${p.cucu}</td>
            <td style="color:#74c0fc">${p.clean}</td>
            <td>${p.matches}</td>
            <td style="color:#00e676">${p.wins}</td>
            <td style="color:#ff4444">${p.losses}</td>
        </tr>
    `).join('') || '<tr><td colspan="8" style="text-align:center;opacity:0.4">Aucun match</td></tr>';
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
    document.querySelector('.live-dot').style.background =
        status === 'online' ? '#00e676' : (status === 'loading' ? '#ffd700' : '#ff4444');
}

function showSuccess() {
    const f = document.getElementById('success-flash');
    f.style.display = 'flex';
    setTimeout(() => f.style.display = 'none', 2000);
}
