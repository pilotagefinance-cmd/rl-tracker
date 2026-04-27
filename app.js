/* ============================================================
   RL TRACKER — APPLICATION LOGIC
   Google Sheets API v4 (lecture publique + écriture via API Key)
   Structure Sheets: Date | Heure | J_A1 | J_A2 | J_B1 | J_B2 | Score_A | Score_B | Gagnant
   ============================================================ */

// ────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────

let CONFIG = {
  apiKey: '',
  sheetId: '',
  sheetName: 'Matchs',          // onglet Google Sheets
  players: [],
  isDemo: false
};

let ALL_MATCHES = [];           // cache de tous les matchs
let DEMO_MATCHES = [];          // données démo
let isLoading = false;

// ────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initDate();
  initParticles();
  initTabs();
  loadConfig();
  initScoreListeners();
  initSettingsFab();
});

function initDate() {
  const now = new Date();
  const opts = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  document.getElementById('current-date').textContent =
    now.toLocaleDateString('fr-FR', opts).toUpperCase();
}

// ────────────────────────────────────────────────
// PARTICLES BACKGROUND
// ────────────────────────────────────────────────

function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      alpha: Math.random() * 0.5 + 0.1
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 60 }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5 || p.x < -5 || p.x > W + 5) Object.assign(p, createParticle(), { y: H + 5 });
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init(); draw();
}

// ────────────────────────────────────────────────
// TABS
// ────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
      if (tab === 'history') renderHistory();
    });
  });
}

// ────────────────────────────────────────────────
// CONFIG & AUTH
// ────────────────────────────────────────────────

function loadConfig() {
  const saved = localStorage.getItem('rl-tracker-config');
  if (saved) {
    try {
      CONFIG = { ...CONFIG, ...JSON.parse(saved) };
      hideModal();
      startApp();
      return;
    } catch(e) {}
  }
  showModal();
  document.getElementById('save-config-btn').addEventListener('click', saveConfig);
  document.getElementById('demo-btn').addEventListener('click', startDemo);
}

function saveConfig() {
  const apiKey = document.getElementById('cfg-api-key').value.trim();
  const sheetId = document.getElementById('cfg-sheet-id').value.trim();
  const playersRaw = document.getElementById('cfg-players').value.trim();

  if (!apiKey || !sheetId || !playersRaw) {
    showConfigError('Tous les champs sont requis.');
    return;
  }

  const players = playersRaw.split(',').map(p => p.trim()).filter(Boolean);
  if (players.length < 4) {
    showConfigError('Il faut au minimum 4 joueurs.');
    return;
  }

  CONFIG = { apiKey, sheetId, sheetName: 'Matchs', players, isDemo: false };
  localStorage.setItem('rl-tracker-config', JSON.stringify(CONFIG));
  hideModal();
  startApp();
}

function startDemo() {
  CONFIG.players = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];
  CONFIG.isDemo = true;
  DEMO_MATCHES = generateDemoData();
  hideModal();
  startApp();
}

function showModal() {
  document.getElementById('config-modal').style.display = 'flex';
}

function hideModal() {
  document.getElementById('config-modal').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
}

function showConfigError(msg) {
  const el = document.getElementById('config-error');
  el.textContent = msg; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

function initSettingsFab() {
  document.getElementById('settings-btn').addEventListener('click', () => {
    // Pré-remplir les champs
    document.getElementById('cfg-api-key').value = CONFIG.apiKey || '';
    document.getElementById('cfg-sheet-id').value = CONFIG.sheetId || '';
    document.getElementById('cfg-players').value = CONFIG.players.join(', ');
    showModal();
    document.getElementById('save-config-btn').onclick = () => {
      localStorage.removeItem('rl-tracker-config');
      saveConfig();
    };
  });
}

// ────────────────────────────────────────────────
// DEMO DATA
// ────────────────────────────────────────────────

function generateDemoData() {
  const players = CONFIG.players;
  const today = new Date().toLocaleDateString('fr-FR');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('fr-FR');
  const matches = [];

  const addMatch = (date, time, a1, a2, b1, b2, sa, sb) => {
    const winner = sa > sb ? 'A' : sb > sa ? 'B' : 'D';
    matches.push({ date, time, a1, a2, b1, b2, scoreA: sa, scoreB: sb, winner });
  };

  // Yesterday
  addMatch(yesterday, '19:02', players[0], players[1], players[2], players[3], 5, 3);
  addMatch(yesterday, '19:18', players[2], players[0], players[1], players[3], 2, 4);
  addMatch(yesterday, '19:35', players[1], players[3], players[0], players[2], 6, 2);
  addMatch(yesterday, '19:52', players[0], players[3], players[1], players[2], 3, 5);
  addMatch(yesterday, '20:10', players[2], players[1], players[3], players[0], 4, 4);

  // Today
  addMatch(today, '20:05', players[0], players[2], players[1], players[3], 7, 4);
  addMatch(today, '20:22', players[1], players[2], players[0], players[3], 3, 5);
  addMatch(today, '20:40', players[3], players[0], players[2], players[1], 6, 2);

  return matches;
}

// ────────────────────────────────────────────────
// APP START
// ────────────────────────────────────────────────

function startApp() {
  populatePlayerSelects();
  setConnectionStatus('live', 'CONNECTÉ');
  loadAndRender();

  document.getElementById('refresh-btn').addEventListener('click', loadAndRender);
  document.getElementById('submit-match-btn').addEventListener('click', submitMatch);

  // Date filter
  const df = document.getElementById('date-filter');
  df.valueAsDate = new Date();
  df.addEventListener('change', renderHistory);
  document.getElementById('clear-filter-btn').addEventListener('click', () => {
    df.value = ''; renderHistory();
  });
}

async function loadAndRender() {
  if (isLoading) return;
  isLoading = true;
  setConnectionStatus('pending', 'CHARGEMENT…');

  try {
    if (CONFIG.isDemo) {
      ALL_MATCHES = [...DEMO_MATCHES];
    } else {
      ALL_MATCHES = await fetchFromSheets();
    }
    renderDashboard();
    renderHistory();
    setConnectionStatus('live', 'CONNECTÉ');
    document.getElementById('last-refresh').textContent =
      'Mis à jour à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    console.error(err);
    setConnectionStatus('error', 'ERREUR API');
  } finally {
    isLoading = false;
  }
}

// ────────────────────────────────────────────────
// GOOGLE SHEETS API
// ────────────────────────────────────────────────

async function fetchFromSheets() {
  const range = encodeURIComponent(`${CONFIG.sheetName}!A2:I`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values/${range}?key=${CONFIG.apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const data = await res.json();
  const rows = data.values || [];

  return rows.map(r => ({
    date:   r[0] || '',
    time:   r[1] || '',
    a1:     r[2] || '',
    a2:     r[3] || '',
    b1:     r[4] || '',
    b2:     r[5] || '',
    scoreA: parseInt(r[6]) || 0,
    scoreB: parseInt(r[7]) || 0,
    winner: r[8] || ''   // 'A', 'B', ou 'D' (draw)
  })).filter(m => m.a1 && m.b1);
}

async function appendToSheets(row) {
  const range = encodeURIComponent(`${CONFIG.sheetName}!A:I`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values/${range}:append?valueInputOption=RAW&key=${CONFIG.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Erreur d\'écriture');
  }
  return res.json();
}

// ────────────────────────────────────────────────
// STATS ENGINE
// ────────────────────────────────────────────────

function computeStats(matches) {
  const stats = {};

  CONFIG.players.forEach(p => {
    stats[p] = { player: p, played: 0, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0 };
  });

  matches.forEach(m => {
    const { a1, a2, b1, b2, scoreA, scoreB, winner } = m;
    const teamA = [a1, a2].filter(Boolean);
    const teamB = [b1, b2].filter(Boolean);

    const allP = [...teamA, ...teamB];
    allP.forEach(p => {
      if (!stats[p]) stats[p] = { player: p, played: 0, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0 };
    });

    teamA.forEach(p => {
      if (!stats[p]) return;
      stats[p].played++;
      stats[p].goalsFor += scoreA;
      stats[p].goalsAgainst += scoreB;
      if (winner === 'A') stats[p].wins++;
      else if (winner === 'B') stats[p].losses++;
      else stats[p].draws++;
    });

    teamB.forEach(p => {
      if (!stats[p]) return;
      stats[p].played++;
      stats[p].goalsFor += scoreB;
      stats[p].goalsAgainst += scoreA;
      if (winner === 'B') stats[p].wins++;
      else if (winner === 'A') stats[p].losses++;
      else stats[p].draws++;
    });
  });

  return Object.values(stats)
    .filter(s => s.played > 0)
    .map(s => ({
      ...s,
      ratio: s.played > 0 ? (s.goalsFor / s.played).toFixed(2) : 0,
      diff: s.goalsFor - s.goalsAgainst
    }))
    .sort((a, b) => b.ratio - a.ratio || b.wins - a.wins || b.diff - a.diff);
}

// ────────────────────────────────────────────────
// RENDER DASHBOARD
// ────────────────────────────────────────────────

function renderDashboard() {
  const todayStr = new Date().toLocaleDateString('fr-FR');
  const todayMatches = ALL_MATCHES.filter(m => m.date === todayStr);

  // KPIs
  const totalGoalsToday = todayMatches.reduce((s, m) => s + m.scoreA + m.scoreB, 0);
  document.getElementById('kpi-matches').querySelector('.kpi-value').textContent = todayMatches.length || '0';
  document.getElementById('kpi-goals').querySelector('.kpi-value').textContent = totalGoalsToday || '0';

  const todayStats = computeStats(todayMatches);
  document.getElementById('kpi-leader').querySelector('.kpi-value').textContent =
    todayStats.length ? todayStats[0].player.toUpperCase() : '—';

  // Current streak (derniers matchs du top joueur)
  const streak = computeStreak(todayMatches);
  document.getElementById('kpi-streak').querySelector('.kpi-value').textContent = streak;

  // Tables
  renderLeaderboard('global-tbody', computeStats(ALL_MATCHES));
  renderLeaderboard('today-tbody', todayStats);
}

function computeStreak(matches) {
  if (!matches.length) return '—';
  // Streak basé sur le dernier gagnant répété
  let count = 0, lastWinner = null;
  const rev = [...matches].reverse();
  for (const m of rev) {
    const winner = m.winner === 'A' ? `${m.a1}/${m.a2}` : `${m.b1}/${m.b2}`;
    if (!lastWinner) lastWinner = winner;
    if (winner === lastWinner) count++;
    else break;
  }
  return count > 1 ? `${count}x 🔥` : '—';
}

function renderLeaderboard(tbodyId, stats) {
  const tbody = document.getElementById(tbodyId);
  if (!stats.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucune donnée disponible</td></tr>';
    return;
  }

  tbody.innerHTML = stats.map((s, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const initial = s.player.charAt(0).toUpperCase();
    const diffClass = s.diff > 0 ? 'diff-pos' : s.diff < 0 ? 'diff-neg' : 'diff-zero';
    const diffStr = s.diff > 0 ? `+${s.diff}` : `${s.diff}`;

    return `
      <tr>
        <td class="rank-cell ${rankClass}">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}</td>
        <td>
          <div class="player-name-cell">
            <div class="player-avatar ${rankClass}">${initial}</div>
            ${s.player}
          </div>
        </td>
        <td>${s.played}</td>
        <td class="win-cell">${s.wins}</td>
        <td class="loss-cell">${s.losses}</td>
        <td style="color:var(--accent);font-weight:600;font-family:var(--font-mono)">${s.ratio}</td>
        <td class="${diffClass}">${diffStr}</td>
      </tr>
    `;
  }).join('');
}

// ────────────────────────────────────────────────
// RENDER HISTORY
// ────────────────────────────────────────────────

function renderHistory() {
  const df = document.getElementById('date-filter');
  let filtered = ALL_MATCHES;

  if (df.value) {
    // Convertir yyyy-mm-dd → fr locale
    const [y, mo, d] = df.value.split('-');
    const target = `${d.padStart(2,'0')}/${mo.padStart(2,'0')}/${y}`;
    filtered = ALL_MATCHES.filter(m => m.date === target);
  }

  const list = document.getElementById('history-list');
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">Aucun match trouvé pour cette période.</div>';
    return;
  }

  const sorted = [...filtered].reverse();

  list.innerHTML = sorted.map(m => {
    const winnerIsA = m.winner === 'A';
    const winnerIsB = m.winner === 'B';
    const teamAClass = winnerIsA ? 'match-win-team' : '';
    const teamBClass = winnerIsB ? 'match-win-team' : '';
    const scoreAClass = winnerIsA ? 'style="color:var(--win)"' : '';
    const scoreBClass = winnerIsB ? 'style="color:#a78bfa"' : '';

    return `
      <div class="match-card">
        <div class="match-team">
          <div class="match-team-label">ÉQUIPE A</div>
          <div class="match-team-name ${teamAClass}">${m.a1} · ${m.a2}</div>
        </div>
        <div class="match-score-display">
          <span ${scoreAClass}>${m.scoreA}</span>
          <span style="color:var(--text-muted);font-size:18px"> — </span>
          <span ${scoreBClass}>${m.scoreB}</span>
        </div>
        <div class="match-team" style="text-align:right">
          <div class="match-team-label">ÉQUIPE B</div>
          <div class="match-team-name ${teamBClass}">${m.b1} · ${m.b2}</div>
        </div>
        <div class="match-meta">
          <span>${m.date}</span>
          <span>${m.time}</span>
          <span style="color:${m.winner==='A'?'var(--accent)':'#a78bfa'}">
            ${m.winner === 'A' ? `${m.a1}/${m.a2}` : m.winner === 'B' ? `${m.b1}/${m.b2}` : 'ÉGALITÉ'} WIN
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ────────────────────────────────────────────────
// SCORE LISTENERS
// ────────────────────────────────────────────────

function initScoreListeners() {
  ['score-a', 'score-b'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateWinnerPreview);
  });
}

function updateWinnerPreview() {
  const sa = parseInt(document.getElementById('score-a').value) || 0;
  const sb = parseInt(document.getElementById('score-b').value) || 0;
  const a1 = document.getElementById('team-a1').value;
  const a2 = document.getElementById('team-a2').value;
  const b1 = document.getElementById('team-b1').value;
  const b2 = document.getElementById('team-b2').value;

  const display = document.getElementById('winner-display');
  display.className = 'winner-value';

  if (!a1 || !b1) {
    display.textContent = 'Sélectionne les joueurs d\'abord';
    return;
  }

  if (sa > sb) {
    display.textContent = `🏆 ${a1} & ${a2 || '?'} GAGNENT (${sa}-${sb})`;
    display.classList.add('team-a-wins');
  } else if (sb > sa) {
    display.textContent = `🏆 ${b1} & ${b2 || '?'} GAGNENT (${sb}-${sa})`;
    display.classList.add('team-b-wins');
  } else {
    display.textContent = `🤝 ÉGALITÉ (${sa}-${sb})`;
    display.classList.add('draw');
  }
}

// ────────────────────────────────────────────────
// PLAYER SELECTS
// ────────────────────────────────────────────────

function populatePlayerSelects() {
  const selects = ['team-a1', 'team-a2', 'team-b1', 'team-b2'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">— Choisir —</option>';
    CONFIG.players.forEach(p => {
      sel.innerHTML += `<option value="${p}">${p}</option>`;
    });
    sel.addEventListener('change', updateWinnerPreview);
  });
}

// ────────────────────────────────────────────────
// SUBMIT MATCH
// ────────────────────────────────────────────────

async function submitMatch() {
  const a1 = document.getElementById('team-a1').value;
  const a2 = document.getElementById('team-a2').value;
  const b1 = document.getElementById('team-b1').value;
  const b2 = document.getElementById('team-b2').value;
  const sa = parseInt(document.getElementById('score-a').value) || 0;
  const sb = parseInt(document.getElementById('score-b').value) || 0;

  const errorEl = document.getElementById('submit-error');
  errorEl.style.display = 'none';

  // Validation
  if (!a1 || !a2 || !b1 || !b2) {
    errorEl.textContent = 'Sélectionne les 4 joueurs.';
    errorEl.style.display = 'block'; return;
  }

  const chosen = [a1, a2, b1, b2];
  if (new Set(chosen).size < 4) {
    errorEl.textContent = 'Chaque joueur ne peut apparaître qu\'une fois.';
    errorEl.style.display = 'block'; return;
  }

  const winner = sa > sb ? 'A' : sb > sa ? 'B' : 'D';
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR');
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const newMatch = { date, time, a1, a2, b1, b2, scoreA: sa, scoreB: sb, winner };
  const row = [date, time, a1, a2, b1, b2, sa, sb, winner];

  const btn = document.getElementById('submit-match-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> ENVOI…';

  try {
    if (CONFIG.isDemo) {
      DEMO_MATCHES.push(newMatch);
      ALL_MATCHES = [...DEMO_MATCHES];
    } else {
      await appendToSheets(row);
      ALL_MATCHES.push(newMatch);
    }

    // Reset form
    ['team-a1','team-a2','team-b1','team-b2'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('score-a').value = 0;
    document.getElementById('score-b').value = 0;
    document.getElementById('winner-display').textContent = 'Entrez le score pour voir le gagnant';
    document.getElementById('winner-display').className = 'winner-value';

    // Success flash
    const flash = document.getElementById('success-flash');
    flash.style.display = 'flex';
    setTimeout(() => flash.style.display = 'none', 3000);

    // Refresh dashboard
    renderDashboard();

  } catch (err) {
    errorEl.textContent = `Erreur : ${err.message}`;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ENREGISTRER LE MATCH`;
  }
}

// ────────────────────────────────────────────────
// CONNECTION STATUS
// ────────────────────────────────────────────────

function setConnectionStatus(state, text) {
  const dot = document.querySelector('.live-badge .live-dot');
  const label = document.getElementById('connection-text');
  dot.className = 'live-dot';
  if (state === 'error') dot.classList.add('error');
  if (state === 'pending') dot.classList.add('pending');
  label.textContent = text;
}
