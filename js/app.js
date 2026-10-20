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

  // ---------- Ekran listy ----------
  const ICON_CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';

  function taskState(task) {
    if (task.done) return { cls: 'is-done', label: 'Zakończone' };
    if (task.runningSince != null) return { cls: 'is-running', label: 'Biegnie' };
    if (task.elapsedMs > 0) return { cls: 'is-paused', label: 'Wstrzymane' };
    return { cls: '', label: 'Nie zaczęte' };
  }

  function taskRow(list, task) {
    const st = taskState(task);
    const running = task.runningSince != null;
    const time = `<span class="clock" data-time="${task.id}">${S.fmt(S.elapsed(task, now()))}</span>`;
    const info = `<span class="row-main"><span class="name">${esc(task.name)}</span><span class="sub">${st.label}</span></span>`;
    const mark = task.done ? ICON_CHECK : running ? ICON_PLAY : '';

    if (list.closedAt) {
      return `<li class="task ${st.cls}"><span class="check" aria-hidden="true">${mark}</span>
        <div class="row task-main">${info}${time}</div></li>`;
    }
    return `<li class="task ${st.cls}">
      <button class="check" data-act="check" data-task="${task.id}" aria-label="${task.done ? 'Wznów zadanie' : 'Zakończ zadanie'}">${mark}</button>
      <button class="row task-main" data-act="toggle" data-task="${task.id}" aria-pressed="${running}">${info}${time}</button>
    </li>`;
  }

  function renderList(list) {
    const total = list.tasks.length;
    const done = doneCount(list);
    const closed = !!list.closedAt;
    const empty = total === 0 && !closed;
    const addOpen = empty || ui.addOpen === list.id;

    const addRow = closed ? '' : addOpen
      ? `<li><form class="row-form" data-form="new-task">
          <input class="field" name="name" maxlength="200" placeholder="Hydraulika" aria-label="Nazwa zadania" autocomplete="off" enterkeyhint="done">
          <button class="btn btn-main" type="submit">Dodaj</button>
        </form></li>`
      : `<li><button class="row row-add" data-act="open-add"><span class="plus" aria-hidden="true">+</span>Dodaj zadanie</button></li>`;

    let footer = '';
    if (closed) footer = `<button class="btn btn-main btn-wide" data-act="print">Zapisz do PDF</button>`;
    else if (S.canClose(list)) footer = `<button class="btn btn-done btn-wide" data-act="close">Zamknij listę</button>`;

    return `<section class="screen" aria-label="${esc(list.name)}">
      <div class="head">
        <div class="head-top">
          ${wide.matches ? '' : '<a class="back" href="#/">Listy</a>'}
          <button class="icon-btn" data-act="list-menu" aria-label="Menu listy">⋯</button>
        </div>
        <h1 class="title">${esc(list.name)}${closed ? '<span class="badge">Zamknięta</span>' : ''}</h1>
        <div class="meta">
          <span>${empty ? 'Dodaj pierwsze zadanie' : `${done} z ${total} gotowe`}</span>
          <span class="clock" data-total="${list.id}">${S.fmt(S.listTotal(list, now()))}</span>
        </div>
        <div class="progress" aria-hidden="true"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
      </div>
      <ul class="rows tasks">${list.tasks.map(t => taskRow(list, t)).join('')}${addRow}</ul>
      ${footer}
    </section>`;
  }

  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  // ---------- Rysowanie ----------
  const $app = document.getElementById('app');

  function render() {
    const r = route();
    if (r.view === 'list') state.selectedId = r.listId;
    const list = r.view === 'list' ? S.findList(state, r.listId) : null;
    if (ui.addOpen && (!list || ui.addOpen !== list.id)) ui.addOpen = null;
    $app.innerHTML = list ? renderList(list) : renderLists();
    if (ui.newListOpen || ui.focusAdd) {
      const field = $app.querySelector('.row-form .field');
      if (field) field.focus();
      ui.focusAdd = false;
    }
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
    } else if (form.dataset.form === 'new-task') {
      if (!name.trim()) return;
      const listId = state.selectedId;
      ui.addOpen = listId;
      ui.focusAdd = true;
      act(() => S.addTask(state, listId, name));
    }
  });

  $app.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    const list = S.findList(state, state.selectedId);
    const taskId = btn.dataset.task;
    switch (btn.dataset.act) {
      case 'open-new-list': ui.newListOpen = true; render(); break;
      case 'open-add': ui.addOpen = list.id; ui.focusAdd = true; render(); break;
      case 'toggle': act(() => S.toggleTask(state, list.id, taskId, now())); break;
      case 'check': {
        const task = list.tasks.find(t => t.id === taskId);
        act(() => task.done ? S.reopenTask(state, list.id, taskId) : S.finishTask(state, list.id, taskId, now()));
        break;
      }
      case 'list-menu': emit('listmenu', { listId: list.id, opener: btn }); break;
      case 'close': emit('closelist', { listId: list.id, opener: btn }); break;
      case 'print': emit('printlist', { listId: list.id }); break;
    }
  });

  // Długie przytrzymanie / prawy klik na zadaniu → menu zadania.
  let pressTimer = null, pressStart = null, suppressClick = false, lastMenuAt = 0;
  function openTaskMenu(btn) {
    if (Date.now() - lastMenuAt < 700) return;
    lastMenuAt = Date.now();
    emit('taskmenu', { listId: state.selectedId, taskId: btn.dataset.task, opener: btn });
  }
  function cancelPress() { clearTimeout(pressTimer); pressTimer = null; }
  $app.addEventListener('pointerdown', e => {
    const btn = e.target.closest('[data-act="toggle"]');
    if (!btn || e.button !== 0) return;
    pressStart = { x: e.clientX, y: e.clientY };
    pressTimer = setTimeout(() => { pressTimer = null; suppressClick = true; openTaskMenu(btn); }, 500);
  });
  $app.addEventListener('pointermove', e => {
    if (pressTimer && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10) cancelPress();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => $app.addEventListener(t, cancelPress));
  $app.addEventListener('contextmenu', e => {
    const btn = e.target.closest('[data-act="toggle"]');
    if (!btn) return;
    e.preventDefault();
    cancelPress();
    openTaskMenu(btn);
  });

  // Puste pole dodawania zamyka się po utracie fokusu (lista z zadaniami).
  $app.addEventListener('focusout', e => {
    if (!e.target.matches('[data-form="new-task"] .field') || e.target.value.trim()) return;
    setTimeout(() => {
      if ($app.contains(document.activeElement) && document.activeElement.closest('[data-form="new-task"]')) return;
      if (ui.addOpen) { ui.addOpen = null; render(); }
    }, 0);
  });

  $app.addEventListener('toggle', e => {
    if (e.target.matches('details.closed')) ui.closedOpen = e.target.open;
  }, true);

  $app.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (ui.newListOpen) { ui.newListOpen = false; render(); }
    if (ui.addOpen) { ui.addOpen = null; render(); }
  });

  window.addEventListener('hashchange', render);
  wide.addEventListener('change', render);
  setInterval(tick, 500);
  render();
})();
