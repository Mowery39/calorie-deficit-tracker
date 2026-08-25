(function () {

  const STORAGE_KEY = 'budget-checks';

  const RULES = {
    EOM: { bills: 832, groceriesGas: 160, emergencySavings: 50 },
    MOM: { bills: 600, groceriesGas: 160, emergencySavings: 250 }
  };

  const TYPE_LABEL = { EOM: 'EOM', MOM: 'MOM' };

  // ---------- Helpers ----------

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatShortDate(isoStr) {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatMoney(n) {
    const sign = n < 0 ? '-' : '';
    return sign + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return fallback;
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable, fail silently */ }
  }

  function computeAllocation(type, amount) {
    const rule = RULES[type];
    const freeToSpend = amount - (rule.bills + rule.groceriesGas + rule.emergencySavings);
    return {
      bills: rule.bills,
      groceriesGas: rule.groceriesGas,
      emergencySavings: rule.emergencySavings,
      freeToSpend
    };
  }

  // ---------- State ----------

  let checks = load(STORAGE_KEY, []);

  // ---------- Elements ----------

  const paycheckForm = document.getElementById('paycheckForm');
  const checkType = document.getElementById('checkType');
  const checkAmount = document.getElementById('checkAmount');
  const checkDate = document.getElementById('checkDate');

  const paycheckList = document.getElementById('paycheckList');
  const paycheckEmpty = document.getElementById('paycheckEmpty');

  const totalBillsEl = document.getElementById('totalBills');
  const totalGroceriesEl = document.getElementById('totalGroceries');
  const totalSavingsEl = document.getElementById('totalSavings');
  const totalFreeEl = document.getElementById('totalFree');

  // ---------- Render ----------

  function renderTotals() {
    const totals = checks.reduce((acc, c) => {
      acc.bills += c.bills;
      acc.groceriesGas += c.groceriesGas;
      acc.emergencySavings += c.emergencySavings;
      acc.freeToSpend += c.freeToSpend;
      return acc;
    }, { bills: 0, groceriesGas: 0, emergencySavings: 0, freeToSpend: 0 });

    totalBillsEl.textContent = formatMoney(totals.bills);
    totalGroceriesEl.textContent = formatMoney(totals.groceriesGas);
    totalSavingsEl.textContent = formatMoney(totals.emergencySavings);
    totalFreeEl.textContent = formatMoney(totals.freeToSpend);
    totalFreeEl.className = 'stat-value ' + (totals.freeToSpend < 0 ? 'amt-bad' : 'amt-good');
  }

  function renderList() {
    paycheckList.innerHTML = '';
    paycheckEmpty.hidden = checks.length > 0;

    checks.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'paycheck-row';
      const freeClass = c.freeToSpend < 0 ? 'amt-bad' : 'amt-good';

      row.innerHTML = `
        <div class="paycheck-row-head">
          <div class="paycheck-head-left">
            <span class="paycheck-type-badge">${TYPE_LABEL[c.type] || c.type}</span>
            <span class="paycheck-date">${formatShortDate(c.date)}</span>
          </div>
          <div class="paycheck-head-right">
            <span class="paycheck-amount">${formatMoney(c.amount)}</span>
            <button class="icon-btn danger" data-index="${i}" type="button">Remove</button>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-label">Bills</span>
            <span class="stat-value">${formatMoney(c.bills)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Groceries &amp; Gas</span>
            <span class="stat-value">${formatMoney(c.groceriesGas)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Emergency Savings</span>
            <span class="stat-value">${formatMoney(c.emergencySavings)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Free to Spend</span>
            <span class="stat-value ${freeClass}">${formatMoney(c.freeToSpend)}</span>
          </div>
        </div>
      `;
      paycheckList.appendChild(row);
    });
  }

  function renderAll() {
    renderTotals();
    renderList();
  }

  // ---------- Events ----------

  paycheckForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const type = checkType.value;
    const amount = parseFloat(checkAmount.value);
    if (!type || !RULES[type] || isNaN(amount) || amount < 0) return;

    const alloc = computeAllocation(type, amount);

    checks.unshift({
      type,
      amount,
      date: checkDate.value || todayISO(),
      ...alloc
    });

    save(STORAGE_KEY, checks);
    paycheckForm.reset();
    renderAll();
  });

  paycheckList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-index]');
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
    checks.splice(index, 1);
    save(STORAGE_KEY, checks);
    renderAll();
  });

  // ---------- Init ----------

  renderAll();

})();
