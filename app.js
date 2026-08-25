const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const STORAGE_PREFIX = 'calorie-ledger-';

const ledgerBody = document.getElementById('ledgerBody');
const totalEatenEl = document.getElementById('totalEaten');
const totalBurnedEl = document.getElementById('totalBurned');
const totalBalanceEl = document.getElementById('totalBalance');
const avgWeightEl = document.getElementById('avgWeight');
const fatValueEl = document.getElementById('fatValue');
const stampLabelEl = document.getElementById('stampLabel');
const stampRingEl = document.getElementById('stamp').querySelector('.stamp-ring');
const weekLabelEl = document.getElementById('weekRange');
const resetBtn = document.getElementById('resetWeek');
const prevBtn = document.getElementById('prevWeek');
const nextBtn = document.getElementById('nextWeek');
const jumpTodayBtn = document.getElementById('jumpToday');
const chartContainer = document.getElementById('chartContainer');

// ---------- Date helpers ----------

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShort(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function keyFor(monday) {
  return STORAGE_PREFIX + isoDate(monday);
}

const thisWeekMonday = getMonday(new Date());
let currentMonday = new Date(thisWeekMonday);

// ---------- State ----------

function defaultState() {
  return { days: DAYS.map(() => ({ eaten: '', burned: '', weight: '' })) };
}

function loadState(monday) {
  try {
    const raw = localStorage.getItem(keyFor(monday));
    if (raw) {
      const parsed = JSON.parse(raw);

      // oldest format: bare array of {eaten, burned}
      if (Array.isArray(parsed)) {
        return { days: parsed.map((d) => ({ eaten: d.eaten || '', burned: d.burned || '', weight: '' })) };
      }

      // previous format: { weight: <one weekly value>, days: [{eaten,burned}] }
      if (parsed.days) {
        const days = parsed.days.map((d, i) => ({
          eaten: d.eaten || '',
          burned: d.burned || '',
          weight: d.weight !== undefined && d.weight !== '' ? d.weight : (i === 4 && parsed.weight ? parsed.weight : '')
        }));
        while (days.length < 5) days.push({ eaten: '', burned: '', weight: '' });
        return { days };
      }
    }
  } catch (e) { /* ignore corrupt data */ }
  return defaultState();
}

let state = loadState(currentMonday);

function saveState() {
  try {
    localStorage.setItem(keyFor(currentMonday), JSON.stringify(state));
  } catch (e) { /* storage unavailable, fail silently */ }
}

// ---------- Week navigation ----------

function renderWeekLabel() {
  const friday = new Date(currentMonday);
  friday.setDate(friday.getDate() + 4);
  weekLabelEl.textContent = `Week of ${formatShort(currentMonday)} \u2013 ${formatShort(friday)}`;

  const atCurrent = isoDate(currentMonday) === isoDate(thisWeekMonday);
  nextBtn.disabled = atCurrent;
  jumpTodayBtn.hidden = atCurrent;
}

function switchWeek() {
  state = loadState(currentMonday);
  renderWeekLabel();
  buildRows();
  recalculate();
}

prevBtn.addEventListener('click', () => {
  currentMonday.setDate(currentMonday.getDate() - 7);
  switchWeek();
});

nextBtn.addEventListener('click', () => {
  if (isoDate(currentMonday) >= isoDate(thisWeekMonday)) return;
  currentMonday.setDate(currentMonday.getDate() + 7);
  switchWeek();
});

jumpTodayBtn.addEventListener('click', () => {
  currentMonday = new Date(thisWeekMonday);
  switchWeek();
});

// ---------- Rendering: ledger rows ----------

function buildRows() {
  ledgerBody.innerHTML = '';
  DAYS.forEach((day, i) => {
    const date = new Date(currentMonday);
    date.setDate(date.getDate() + i);

    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <span class="col col-day day-name">
        ${day}
        <span class="full-date">${formatShort(date)}</span>
      </span>
      <span class="col col-num">
        <input type="number" inputmode="numeric" min="0" placeholder="0" data-field="eaten" data-index="${i}" value="${state.days[i].eaten}">
      </span>
      <span class="col col-num">
        <input type="number" inputmode="numeric" min="0" placeholder="0" data-field="burned" data-index="${i}" value="${state.days[i].burned}">
      </span>
      <span class="col col-num balance-cell" id="balance-${i}">0</span>
      <span class="col col-num">
        <input type="number" inputmode="decimal" step="0.1" min="0" placeholder="&mdash;" data-field="weight" data-index="${i}" value="${state.days[i].weight}">
      </span>
    `;
    ledgerBody.appendChild(row);
  });

  ledgerBody.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', onInputChange);
  });
}

function onInputChange(e) {
  const { field, index } = e.target.dataset;
  state.days[index][field] = e.target.value;
  saveState();
  recalculate();
  if (field === 'weight') renderChart();
}

function classify(el, value) {
  el.classList.remove('pos', 'neg', 'zero');
  if (value > 0) el.classList.add('pos');
  else if (value < 0) el.classList.add('neg');
  else el.classList.add('zero');
}

function formatSigned(n) {
  const rounded = Math.round(n);
  return (rounded > 0 ? '+' : '') + rounded.toLocaleString();
}

function weekAverageWeight(days) {
  const values = days.map((d) => parseFloat(d.weight)).filter((v) => !isNaN(v) && v > 0);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function recalculate() {
  let totalEaten = 0;
  let totalBurned = 0;

  DAYS.forEach((_, i) => {
    const eaten = parseFloat(state.days[i].eaten) || 0;
    const burned = parseFloat(state.days[i].burned) || 0;
    const balance = eaten - burned;

    totalEaten += eaten;
    totalBurned += burned;

    const balanceEl = document.getElementById(`balance-${i}`);
    balanceEl.textContent = formatSigned(balance);
    classify(balanceEl, balance);
  });

  const totalBalance = totalEaten - totalBurned;

  totalEatenEl.textContent = totalEaten.toLocaleString();
  totalBurnedEl.textContent = totalBurned.toLocaleString();
  totalBalanceEl.textContent = formatSigned(totalBalance);
  classify(totalBalanceEl, totalBalance);

  const avg = weekAverageWeight(state.days);
  avgWeightEl.textContent = avg === null ? '\u2014' : avg.toFixed(1);

  const fatChange = totalBalance / 3500;
  fatValueEl.textContent = Math.abs(fatChange).toFixed(2);

  stampRingEl.classList.remove('loss', 'gain');
  if (totalBalance < 0) {
    stampRingEl.classList.add('loss');
    stampLabelEl.textContent = 'estimated fat lost this week';
  } else if (totalBalance > 0) {
    stampRingEl.classList.add('gain');
    stampLabelEl.textContent = 'estimated fat gained this week';
  } else {
    stampLabelEl.textContent = 'estimated change this week';
  }
}

resetBtn.addEventListener('click', () => {
  if (!confirm('Clear all entries for this week, including weights?')) return;
  state = defaultState();
  saveState();
  buildRows();
  recalculate();
  renderChart();
});

// ---------- Weight trend chart ----------

function getAllWeeklyAverages() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const dateStr = key.slice(STORAGE_PREFIX.length);
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(key));
    } catch (e) { continue; }

    const days = Array.isArray(raw) ? raw : raw && raw.days;
    if (!days) continue;

    const avg = weekAverageWeight(days);
    if (avg !== null) entries.push({ date, weight: avg });
  }
  entries.sort((a, b) => a.date - b.date);
  return entries;
}

function renderChart() {
  const entries = getAllWeeklyAverages();

  if (entries.length === 0) {
    chartContainer.innerHTML = `<p class="chart-empty">Log a weight this week to start your trend.</p>`;
    return;
  }
  if (entries.length === 1) {
    chartContainer.innerHTML = `<p class="chart-empty">One more week of weigh-ins and your trend line will appear.</p>`;
    return;
  }

  const width = 640;
  const height = 220;
  const padding = 32;

  const weights = entries.map((e) => e.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = (maxW - minW) || 1;
  const xStep = (width - padding * 2) / (entries.length - 1);

  const points = entries.map((e, i) => {
    const x = padding + i * xStep;
    const y = height - padding - ((e.weight - minW) / range) * (height - padding * 2);
    return { x, y, e };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1))
    .join(' ');

  const dots = points
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" class="chart-dot"><title>${formatShort(p.e.date)}: ${p.e.weight.toFixed(1)} lb avg</title></circle>`)
    .join('');

  const netChange = entries[entries.length - 1].weight - entries[0].weight;
  let statClass = 'flat';
  let statLine;
  if (netChange < -0.05) {
    statClass = 'loss';
    statLine = `<span class="stat-num ${statClass}">down ${Math.abs(netChange).toFixed(1)} lb</span> since ${formatShort(entries[0].date)}`;
  } else if (netChange > 0.05) {
    statClass = 'gain';
    statLine = `<span class="stat-num ${statClass}">up ${Math.abs(netChange).toFixed(1)} lb</span> since ${formatShort(entries[0].date)}`;
  } else {
    statLine = `<span class="stat-num ${statClass}">holding steady</span> since ${formatShort(entries[0].date)}`;
  }

  chartContainer.innerHTML = `
    <p class="chart-stat">Weekly average weight ${statLine}.</p>
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" preserveAspectRatio="xMidYMid meet">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="chart-axis" />
      <path d="${pathD}" class="chart-line" fill="none" />
      ${dots}
    </svg>
    <div class="chart-labels">
      <span>${formatShort(entries[0].date)}</span>
      <span>${formatShort(entries[entries.length - 1].date)}</span>
    </div>
  `;
}

// ---------- Init ----------

renderWeekLabel();
buildRows();
recalculate();
renderChart();
