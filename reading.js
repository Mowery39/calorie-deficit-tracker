(function () {

  const KEYS = {
    current: 'reading-current',
    queue: 'reading-queue',
    finished: 'reading-finished'
  };

  const PAGE_META = {
    calories: {
      eyebrow: 'Personal Ledger \u2014 Weekdays Mon\u2013Fri',
      title: 'Calorie Deficit',
      sub: "Enter what you ate, what you burned, and today's weight. The balance settles itself."
    },
    reading: {
      eyebrow: 'Personal Ledger \u2014 Reading List',
      title: 'Reading',
      sub: 'Track what you\u2019re reading, what\u2019s next, and what you\u2019ve finished.'
    }
  };

  // ---------- Tab switching ----------

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPages = document.querySelectorAll('.tab-page');
  const eyebrowEl = document.getElementById('pageEyebrow');
  const titleEl = document.getElementById('pageTitle');
  const subEl = document.getElementById('pageSub');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
      tabPages.forEach((p) => p.classList.toggle('active', p.id === `page-${tab}`));

      const meta = PAGE_META[tab];
      if (meta) {
        eyebrowEl.textContent = meta.eyebrow;
        titleEl.textContent = meta.title;
        subEl.textContent = meta.sub;
      }
    });
  });

  // ---------- Helpers ----------

  function formatShortDate(date) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
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

  // ---------- State ----------

  let currentBook = load(KEYS.current, null);
  let queue = load(KEYS.queue, []);
  let finished = load(KEYS.finished, []);

  // ---------- Elements ----------

  const noCurrentBook = document.getElementById('noCurrentBook');
  const hasCurrentBook = document.getElementById('hasCurrentBook');
  const startBookForm = document.getElementById('startBookForm');
  const startTitle = document.getElementById('startTitle');
  const startAuthor = document.getElementById('startAuthor');
  const startPages = document.getElementById('startPages');

  const curTitleEl = document.getElementById('curTitle');
  const curAuthorEl = document.getElementById('curAuthor');
  const progressFill = document.getElementById('progressFill');
  const curPageInput = document.getElementById('curPage');
  const curTotalPagesEl = document.getElementById('curTotalPages');
  const paceStatEl = document.getElementById('paceStat');
  const finishBookBtn = document.getElementById('finishBookBtn');
  const dropBookBtn = document.getElementById('dropBookBtn');

  const queueList = document.getElementById('queueList');
  const queueEmpty = document.getElementById('queueEmpty');
  const queueForm = document.getElementById('queueForm');
  const queueTitle = document.getElementById('queueTitle');
  const queueAuthor = document.getElementById('queueAuthor');
  const queuePages = document.getElementById('queuePages');

  const finishedList = document.getElementById('finishedList');
  const finishedEmpty = document.getElementById('finishedEmpty');
  const logPastBookBtn = document.getElementById('logPastBookBtn');
  const logPastForm = document.getElementById('logPastForm');
  const pastTitle = document.getElementById('pastTitle');
  const pastAuthor = document.getElementById('pastAuthor');
  const pastDate = document.getElementById('pastDate');

  // ---------- Render: currently reading ----------

  function renderCurrentBook() {
    if (!currentBook) {
      noCurrentBook.hidden = false;
      hasCurrentBook.hidden = true;
      return;
    }

    noCurrentBook.hidden = true;
    hasCurrentBook.hidden = false;

    curTitleEl.textContent = currentBook.title;
    curAuthorEl.textContent = currentBook.author || '';
    curAuthorEl.style.display = currentBook.author ? '' : 'none';

    curPageInput.value = currentBook.currentPage || '';
    curTotalPagesEl.textContent = currentBook.totalPages;

    const pct = Math.max(0, Math.min(100, ((currentBook.currentPage || 0) / currentBook.totalPages) * 100));
    progressFill.style.width = pct.toFixed(1) + '%';

    const daysSinceStart = Math.max(1, Math.round((new Date(todayISO()) - new Date(currentBook.startedDate)) / 86400000));
    const pagesPerDay = (currentBook.currentPage || 0) / daysSinceStart;
    const pagesLeft = currentBook.totalPages - (currentBook.currentPage || 0);

    if (!currentBook.currentPage) {
      paceStatEl.textContent = 'Log today\u2019s page to start tracking your pace.';
    } else if (pagesLeft <= 0) {
      paceStatEl.textContent = 'Page count says you\u2019re done \u2014 mark it finished!';
    } else if (pagesPerDay > 0) {
      const daysLeft = Math.ceil(pagesLeft / pagesPerDay);
      const finishDate = new Date();
      finishDate.setDate(finishDate.getDate() + daysLeft);
      paceStatEl.textContent = `${pct.toFixed(0)}% done \u00b7 ~${pagesPerDay.toFixed(1)} pages/day \u00b7 finish by ${formatShortDate(finishDate)}`;
    } else {
      paceStatEl.textContent = `${pct.toFixed(0)}% done`;
    }
  }

  startBookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = startTitle.value.trim();
    const totalPages = parseInt(startPages.value, 10);
    if (!title || !totalPages || totalPages < 1) return;

    currentBook = {
      title,
      author: startAuthor.value.trim(),
      totalPages,
      currentPage: 0,
      startedDate: todayISO()
    };
    save(KEYS.current, currentBook);
    startBookForm.reset();
    renderCurrentBook();
  });

  curPageInput.addEventListener('input', () => {
    if (!currentBook) return;
    const val = parseInt(curPageInput.value, 10);
    currentBook.currentPage = isNaN(val) ? 0 : Math.max(0, Math.min(val, currentBook.totalPages));
    save(KEYS.current, currentBook);
    renderCurrentBook();
  });

  finishBookBtn.addEventListener('click', () => {
    if (!currentBook) return;
    if (!confirm(`Mark "${currentBook.title}" as finished?`)) return;

    finished.unshift({
      title: currentBook.title,
      author: currentBook.author,
      finishedDate: todayISO()
    });
    save(KEYS.finished, finished);

    currentBook = null;
    save(KEYS.current, currentBook);

    renderCurrentBook();
    renderFinished();
  });

  dropBookBtn.addEventListener('click', () => {
    if (!currentBook) return;
    if (!confirm(`Remove "${currentBook.title}" without logging it as finished?`)) return;

    currentBook = null;
    save(KEYS.current, currentBook);
    renderCurrentBook();
  });

  // ---------- Render: queue ----------

  function renderQueue() {
    queueList.innerHTML = '';
    queueEmpty.hidden = queue.length > 0;

    queue.forEach((book, i) => {
      const row = document.createElement('div');
      row.className = 'book-row';
      row.innerHTML = `
        <div class="book-row-info">
          <p class="book-row-title">${escapeHtml(book.title)}</p>
          <p class="book-row-meta">${escapeHtml(book.author || '')}${book.pages ? ` \u00b7 ${book.pages}p` : ''}</p>
        </div>
        <div class="book-row-actions">
          <button class="icon-btn" data-action="start" data-index="${i}" type="button">Start</button>
          <button class="icon-btn danger" data-action="remove" data-index="${i}" type="button">Remove</button>
        </div>
      `;
      queueList.appendChild(row);
    });
  }

  queueForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = queueTitle.value.trim();
    if (!title) return;

    queue.push({
      title,
      author: queueAuthor.value.trim(),
      pages: queuePages.value ? parseInt(queuePages.value, 10) : null
    });
    save(KEYS.queue, queue);
    queueForm.reset();
    renderQueue();
  });

  queueList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
    const book = queue[index];
    if (!book) return;

    if (btn.dataset.action === 'remove') {
      queue.splice(index, 1);
      save(KEYS.queue, queue);
      renderQueue();
      return;
    }

    if (btn.dataset.action === 'start') {
      if (currentBook && !confirm(`You're already reading "${currentBook.title}". Replace it with "${book.title}"? (It won't be logged as finished.)`)) {
        return;
      }

      let totalPages = book.pages;
      if (!totalPages) {
        const entered = prompt(`How many pages is "${book.title}"?`);
        totalPages = parseInt(entered, 10);
        if (!totalPages || totalPages < 1) return;
      }

      currentBook = {
        title: book.title,
        author: book.author,
        totalPages,
        currentPage: 0,
        startedDate: todayISO()
      };
      save(KEYS.current, currentBook);

      queue.splice(index, 1);
      save(KEYS.queue, queue);

      renderCurrentBook();
      renderQueue();
    }
  });

  // ---------- Render: finished ----------

  function renderFinished() {
    finishedList.innerHTML = '';
    finishedEmpty.hidden = finished.length > 0;

    finished.forEach((book, i) => {
      const row = document.createElement('div');
      row.className = 'book-row';
      const dateObj = new Date(book.finishedDate);
      const dateLabel = isNaN(dateObj.getTime()) ? '' : formatShortDate(dateObj);
      row.innerHTML = `
        <div class="book-row-info">
          <p class="book-row-title">${escapeHtml(book.title)}</p>
          <p class="book-row-meta">${escapeHtml(book.author || '')}${book.author ? ' \u00b7 ' : ''}${dateLabel}</p>
        </div>
        <div class="book-row-actions">
          <button class="icon-btn danger" data-index="${i}" type="button">Remove</button>
        </div>
      `;
      finishedList.appendChild(row);
    });
  }

  logPastBookBtn.addEventListener('click', () => {
    logPastForm.hidden = !logPastForm.hidden;
    if (!logPastForm.hidden) pastDate.value = todayISO();
  });

  logPastForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = pastTitle.value.trim();
    if (!title) return;

    finished.unshift({
      title,
      author: pastAuthor.value.trim(),
      finishedDate: pastDate.value || todayISO()
    });
    save(KEYS.finished, finished);

    logPastForm.reset();
    logPastForm.hidden = true;
    renderFinished();
  });

  finishedList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-index]');
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
    finished.splice(index, 1);
    save(KEYS.finished, finished);
    renderFinished();
  });

  // ---------- Utility ----------

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ---------- Init ----------

  renderCurrentBook();
  renderQueue();
  renderFinished();

})();
