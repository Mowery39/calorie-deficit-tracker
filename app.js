const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const ledgerBody = document.getElementById('ledgerBody');
const totalEatenEl = document.getElementById('totalEaten');
const totalBurnedEl = document.getElementById('totalBurned');
const totalBalanceEl = document.getElementById('totalBalance');
const fatValueEl = document.getElementById('fatValue');
const stampLabelEl = document.getElementById('stampLabel');
const stampRingEl = document.getElementById('stamp').querySelector('.stamp-ring');
const weekRangeEl = document.getElementById('weekRange');
const resetBtn = document.getElementById('resetWeek');

// ---------- Week helpers ----------

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

const monday = getMonday(new Date());
const weekKey = 'calorie-ledger-' + monday.toISOString().slice(0, 10);

const friday = new Date(monday);
friday.setDate(friday.getDate() + 4);
weekRangeEl.textContent = `Week of ${formatShort(monday)} \u2013 ${formatShort(friday)}`;

// ---------- State ----------

function loadState() {
  try {
    const raw = localStorage.getItem(weekKey);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt data */ }
  return DAYS.map(() => ({ eaten: '', burned: '' }));
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(weekKey, JSON.stringify(state));
  } catch (e) { /* storage unavailable, fail silently */ }
}

// ---------- Rendering ----------

function buildRows() {
  ledgerBody.innerHTML = '';
  DAYS.forEach((day, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);

    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <span class="col col-day day-name">
        ${day}
        <span class="full-date">${formatShort(date)}</span>
      </span>
      <span class="col col-num">
        <input type="number" inputmode="numeric" min="0" placeholder="0" data-field="eaten" data-index="${i}" value="${state[i].eaten}">
      </span>
      <span class="col col-num">
        <input type="number" inputmode="numeric" min="0" placeholder="0" data-field="burned" data-index="${i}" value="${state[i].burned}">
      </span>
      <span class="col col-num balance-cell" id="balance-${i}">0</span>
    `;
    ledgerBody.appendChild(row);
  });

  ledgerBody.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', onInputChange);
  });
}

function onInputChange(e) {
  const { field, index } = e.target.dataset;
  state[index][field] = e.target.value;
  saveState();
  recalculate();
}

function classify(el, value) {
  el.classList.remove('pos', 'neg', 'zero');
  if (value > 0) el.classList.add('pos');
  else if (value < 0) el.classList.add('neg');
  else el.classList.add('zero');
}

function recalculate() {
  let totalEaten = 0;
  let totalBurned = 0;

  DAYS.forEach((_, i) => {
    const eaten = parseFloat(state[i].eaten) || 0;
    const burned = parseFloat(state[i].burned) || 0;
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

function formatSigned(n) {
  const rounded = Math.round(n);
  return (rounded > 0 ? '+' : '') + rounded.toLocaleString();
}

resetBtn.addEventListener('click', () => {
  if (!confirm('Clear all entries for this week?')) return;
  state = DAYS.map(() => ({ eaten: '', burned: '' }));
  saveState();
  buildRows();
  recalculate();
});

// ---------- Init ----------

buildRows();
recalculate();
