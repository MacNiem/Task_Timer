// Widoki i zdarzenia aplikacji. Logika i stan: js/store.js (TaskStore).
(() => {
  const S = window.TaskStore;
  const KEY = 'taskTimer.v1';

  // ---------- Stan i zapis ----------
  let storageOk = true;
  const state = (() => {
    try { return S.load(localStorage.getItem(KEY)); }
    catch (e) { storageOk = false; return S.load(null); }
  })();

  function save() {
    try { localStorage.setItem(KEY, S.serialize(state)); storageOk = true; }
    catch (e) { storageOk = false; }
  }

  // Każda akcja użytkownika: zmiana stanu → zapis → nowy widok.
  function act(fn) {
    fn();
    save();
    render();
  }

  const now = () => Date.now();
  const wide = window.matchMedia('(min-width: 768px)');

  // Stan samego widoku (nie zapisywany).
  const ui = { newListOpen: false };

  // ---------- Pomocnicze ----------
  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const listHref = id => `#/lista/${encodeURIComponent(id)}`;
  const doneCount = list => list.tasks.length - S.remaining(list);

  function route() {
    const m = location.hash.match(/^#\/lista\/(.+)$/);
    const listId = m && decodeURIComponent(m[1]);
    if (listId && S.findList(state, listId)) return { view: 'list', listId };
    return { view: 'lists' };
  }

  // ---------- Ekran „Listy” ----------
  function listRow(list) {
    const sub = list.closedAt ? 'Zamknięta'
      : list.tasks.length ? `${doneCount(list)} z ${list.tasks.length} gotowe` : 'Brak zadań';
    const current = wide.matches && list.id === state.selectedId ? ' aria-current="page"' : '';
    return `<li><a class="row" href="${listHref(list.id)}"${current}>
      <span class="row-main"><span class="name">${esc(list.name)}</span><span class="sub">${sub}</span></span>
      <span class="clock" data-total="${list.id}">${S.fmt(S.listTotal(list, now()))}</span>
    </a></li>`;
  }

  function newListForm(cls, label) {
    return `<form class="${cls}" data-form="new-list">
      <input class="field" name="name" maxlength="100" placeholder="Remont łazienki" aria-label="Nazwa listy" autocomplete="off" required>
      <button class="btn btn-main" type="submit">${label}</button>
    </form>`;
  }

  function renderLists() {
    const active = state.lists.filter(l => !l.closedAt);
    const closed = state.lists.filter(l => l.closedAt);

    if (!state.lists.length) {
      return `<section class="screen" aria-label="Listy">
        <div class="empty">
          <h2>Zacznij pierwszą listę</h2>
          <p>Nazwij listę, potem dodaj do niej zadania i mierz czas.</p>
          ${newListForm('', 'Utwórz listę')}
        </div>
      </section>`;
    }

    const addRow = ui.newListOpen
      ? `<li>${newListForm('row-form', 'Utwórz')}</li>`
      : `<li><button class="row row-add" data-act="open-new-list"><span class="plus" aria-hidden="true">+</span>Nowa lista</button></li>`;

    return `<section class="screen" aria-label="Listy">
      <div class="head"><div class="head-top"><h1 class="title title-lists">Listy</h1></div></div>
      <ul class="rows">${active.map(listRow).join('')}${addRow}</ul>
      ${closed.length ? `<details class="closed"${ui.closedOpen ? ' open' : ''}>
        <summary>Zamknięte (${closed.length})</summary>
        <ul class="rows">${closed.map(listRow).join('')}</ul>
      </details>` : ''}
    </section>`;
  }

  // ---------- Ekran listy (Task 3) ----------
  function renderList(list) {
    return `<section class="screen" aria-label="${esc(list.name)}">
      <div class="head">
        <div class="head-top"><a class="back" href="#/">Listy</a></div>
        <h1 class="title">${esc(list.name)}</h1>
      </div>
    </section>`;
  }

  // ---------- Rysowanie ----------
  const $app = document.getElementById('app');

  function render() {
    const r = route();
    if (r.view === 'list') state.selectedId = r.listId;
    const list = r.view === 'list' ? S.findList(state, r.listId) : null;
    $app.innerHTML = list ? renderList(list) : renderLists();
    const autofocus = $app.querySelector('.row-form .field, .empty .field');
    if (autofocus && ui.newListOpen) autofocus.focus();
  }

  // Liczniki tykają bez przebudowy widoku.
  function tick() {
    const t = now();
    document.querySelectorAll('[data-time]').forEach(el => {
      const r = S.running(state);
      const task = r && r.task.id === el.dataset.time ? r.task : null;
      if (task) el.textContent = S.fmt(S.elapsed(task, t));
    });
    document.querySelectorAll('[data-total]').forEach(el => {
      const list = S.findList(state, el.dataset.total);
      if (list) el.textContent = S.fmt(S.listTotal(list, t));
    });
  }

  // ---------- Zdarzenia ----------
  $app.addEventListener('submit', e => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    const name = form.elements.name.value;
    if (form.dataset.form === 'new-list') {
      if (!name.trim()) return;
      let list;
      ui.newListOpen = false;
      act(() => { list = S.createList(state, name, now()); });
      location.hash = listHref(list.id);
    }
  });

  $app.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'open-new-list') { ui.newListOpen = true; render(); }
  });

  $app.addEventListener('toggle', e => {
    if (e.target.matches('details.closed')) ui.closedOpen = e.target.open;
  }, true);

  $app.addEventListener('keydown', e => {
    if (e.key === 'Escape' && ui.newListOpen) { ui.newListOpen = false; render(); }
  });

  window.addEventListener('hashchange', render);
  wide.addEventListener('change', render);
  setInterval(tick, 500);
  render();
})();
