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
    const runningHere = S.running(state)?.list.id === list.id ? ' has-running' : '';
    return `<li><a class="row${runningHere}" href="${listHref(list.id)}"${current}>
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
      ${!closed && total && !hintSeen() ? `<p class="hint">Przytrzymaj zadanie, aby zmienić nazwę lub usunąć.
        <button class="hint-x" data-act="hide-hint" aria-label="Zamknij podpowiedź">×</button></p>` : ''}
      ${footer}
    </section>`;
  }

  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  // ---------- Dok z zegarem biegnącego zadania ----------
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
  const $dock = document.getElementById('dock');

  function renderDock() {
    const r = S.running(state);
    if (!r) { $dock.hidden = true; $dock.innerHTML = ''; return; }
    const shown = shownList();
    const elsewhere = !shown || r.list.id !== shown.id;
    const entering = $dock.hidden;
    $dock.hidden = false;
    $dock.innerHTML = `<div class="dock-in${entering ? ' is-entering' : ''}">
      <a class="dock-info" href="${listHref(r.list.id)}">
        <span class="dock-name"><span class="dot" aria-hidden="true"></span>${esc(r.task.name)}</span>
        ${elsewhere ? `<span class="dock-list">${esc(r.list.name)}</span>` : ''}
        <span class="clock dock-clock" data-time="${r.task.id}">${S.fmt(S.elapsed(r.task, now()))}</span>
      </a>
      <button class="dock-btn dock-pause" data-dock="pause" aria-label="Wstrzymaj">${ICON_PAUSE}</button>
      <button class="dock-btn dock-finish" data-dock="finish" aria-label="Zakończ zadanie">${ICON_CHECK.replace(/16/g, '22')}</button>
    </div>`;
  }

  // ---------- Arkusze (zamiast confirm / prompt) ----------
  const $sheetRoot = document.getElementById('sheet-root');
  let sheet = null; // { actions, opener }

  function openSheet({ title, body, actions, input, cancel = true }, opener) {
    sheet = { actions, opener: opener || sheet?.opener || document.activeElement };
    $sheetRoot.innerHTML = `<div class="sheet-backdrop">
      <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <h2 class="sheet-title" id="sheet-title">${esc(title)}</h2>
        ${body ? `<p class="sheet-body">${esc(body)}</p>` : ''}
        ${input ? `<input class="field sheet-field" name="value" value="${esc(input.value)}" maxlength="${input.maxlength || 200}" aria-label="${esc(title)}" autocomplete="off">` : ''}
        <div class="sheet-actions">
          ${actions.map((a, i) => `<button class="sheet-btn${a.danger ? ' is-danger' : ''}" type="${input && i === 0 ? 'submit' : 'button'}" data-sheet="${i}">${esc(a.label)}</button>`).join('')}
          ${cancel ? '<button class="sheet-btn is-cancel" type="button" data-sheet="cancel">Anuluj</button>' : ''}
        </div>
      </form>
    </div>`;
    const first = $sheetRoot.querySelector('.sheet-field, .sheet-btn');
    first.focus();
    if (first.select) first.select();
  }

  function closeSheet(restoreFocus = true) {
    if (!sheet) return;
    const opener = sheet.opener;
    sheet = null;
    $sheetRoot.innerHTML = '';
    if (restoreFocus && opener && opener.isConnected) opener.focus();
  }

  function runSheetAction(i) {
    const action = sheet.actions[i];
    const field = $sheetRoot.querySelector('.sheet-field');
    const keep = sheet;
    action.run(field ? field.value : undefined);
    if (sheet === keep) closeSheet(); // akcja nie otworzyła kolejnego arkusza
  }

  $sheetRoot.addEventListener('click', e => {
    if (e.target.classList.contains('sheet-backdrop')) return closeSheet();
    const btn = e.target.closest('[data-sheet]');
    if (!btn || btn.type === 'submit') return;
    if (btn.dataset.sheet === 'cancel') closeSheet();
    else runSheetAction(Number(btn.dataset.sheet));
  });
  $sheetRoot.addEventListener('submit', e => { e.preventDefault(); runSheetAction(0); });
  $sheetRoot.addEventListener('keydown', e => {
    if (e.key === 'Escape') return closeSheet();
    if (e.key !== 'Tab') return;
    const items = [...$sheetRoot.querySelectorAll('input, button')];
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });

  // ---------- Menu listy i zadania ----------
  function askRenameList(list) {
    openSheet({ title: 'Zmień nazwę listy', input: { value: list.name, maxlength: 100 },
      actions: [{ label: 'Zapisz', run: v => act(() => S.renameList(state, list.id, v)) }] });
  }

  function askCloseList(list, opener) {
    const left = S.remaining(list);
    if (!S.canClose(list)) {
      return openSheet({ title: 'Nie można zamknąć listy', cancel: false,
        body: list.tasks.length ? `Zakończ najpierw wszystkie zadania (zostało: ${left}).` : 'Dodaj i zakończ co najmniej jedno zadanie.',
        actions: [{ label: 'OK', run: () => {} }] }, opener);
    }
    openSheet({ title: 'Zamknąć listę?', body: `Zamknąć listę „${list.name}”? Potem nie da się jej zmieniać.`,
      actions: [{ label: 'Zamknij listę', run: () => act(() => S.closeList(state, list.id, now())) }] }, opener);
  }

  function askDeleteList(list) {
    openSheet({ title: 'Usunąć listę?', body: `Usunąć listę „${list.name}”? Tego nie da się cofnąć.`,
      actions: [{ label: 'Usuń listę', danger: true, run: () => {
        act(() => S.deleteList(state, list.id));
        location.hash = '#/';
      } }] });
  }

  document.addEventListener('listmenu', e => {
    const list = S.findList(state, e.detail.listId);
    const actions = list.closedAt
      ? [{ label: 'Zapisz do PDF', run: () => printList(list) }]
      : [{ label: 'Zmień nazwę', run: () => askRenameList(list) },
         { label: 'Zamknij listę', run: () => askCloseList(list) }];
    actions.push({ label: 'Usuń listę', danger: true, run: () => askDeleteList(list) });
    openSheet({ title: list.name, actions }, e.detail.opener);
  });

  document.addEventListener('taskmenu', e => {
    const list = S.findList(state, e.detail.listId);
    const task = list && list.tasks.find(t => t.id === e.detail.taskId);
    if (!task || list.closedAt) return;
    hideHint();
    openSheet({ title: task.name, actions: [
      { label: 'Zmień nazwę', run: () => openSheet({ title: 'Zmień nazwę zadania', input: { value: task.name },
        actions: [{ label: 'Zapisz', run: v => act(() => S.renameTask(state, list.id, task.id, v)) }] }) },
      { label: 'Usuń zadanie', danger: true, run: () => openSheet({ title: 'Usunąć zadanie?',
        body: `Usunąć zadanie „${task.name}”?`,
        actions: [{ label: 'Usuń zadanie', danger: true, run: () => act(() => S.deleteTask(state, list.id, task.id)) }] }) }
    ] }, e.detail.opener);
  });

  document.addEventListener('closelist', e => askCloseList(S.findList(state, e.detail.listId), e.detail.opener));
  document.addEventListener('printlist', e => printList(S.findList(state, e.detail.listId)));

  // ---------- Podpowiedź o przytrzymaniu ----------
  const HINT_KEY = 'taskTimer.hintSeen';
  function hintSeen() {
    try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return true; }
  }
  function hideHint() {
    if (hintSeen()) return;
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
    const el = $app.querySelector('.hint');
    if (el) el.remove();
  }

  // ---------- Raport PDF (okno drukowania) ----------
  function printList(list) {
    const t = now();
    const rows = list.tasks.map((task, i) => `<tr>
      <td class="n">${i + 1}</td><td>${esc(task.name)}</td><td class="t">${S.fmt(S.elapsed(task, t))}</td></tr>`).join('');
    const fmtDate = ts => new Date(ts).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
    document.getElementById('printReport').innerHTML = `
      <h1>${esc(list.name)}</h1>
      <div class="meta">Utworzono: ${fmtDate(list.createdAt)}<br>Zamknięto: ${fmtDate(list.closedAt)}<br>Liczba zadań: ${list.tasks.length}</div>
      <table>
        <thead><tr><th class="n">#</th><th>Zadanie</th><th class="t">Czas</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td></td><td>Łącznie</td><td class="t">${S.fmt(S.listTotal(list, t))}</td></tr></tfoot>
      </table>
      <div class="footer">Wygenerowano: ${fmtDate(t)}, Task Timer</div>`;
    // Tytuł strony staje się domyślną nazwą pliku przy „Zapisz jako PDF”.
    const prevTitle = document.title;
    document.title = `${list.name} - raport czasu`;
    window.addEventListener('afterprint', () => { document.title = prevTitle; }, { once: true });
    window.print();
  }

  $dock.addEventListener('click', e => {
    const btn = e.target.closest('[data-dock]');
    const r = S.running(state);
    if (!btn || !r) return;
    if (btn.dataset.dock === 'pause') act(() => S.pauseTask(state, r.list.id, r.task.id, now()));
    else act(() => S.finishTask(state, r.list.id, r.task.id, now()));
  });

  // ---------- Rysowanie ----------
  const $app = document.getElementById('app');

  // Lista widoczna na ekranie: na telefonie tylko z adresu, na tablecie też ostatnio wybrana.
  function shownList() {
    const r = route();
    if (r.view === 'list') return S.findList(state, r.listId);
    return wide.matches ? S.findList(state, state.selectedId) || null : null;
  }

  function render() {
    const r = route();
    if (r.view === 'list') state.selectedId = r.listId;
    const list = shownList();
    if (ui.addOpen && (!list || ui.addOpen !== list.id)) ui.addOpen = null;
    if (wide.matches) {
      // Tablet / komputer: listy po lewej, wybrana lista po prawej, dok w prawej kolumnie.
      const shown = list;
      $app.innerHTML = `<div class="col-lists">${renderLists()}</div>
        <div class="col-main">${shown ? renderList(shown) : `<section class="screen"><div class="empty">
          <h2>Wybierz listę</h2><p>Stuknij listę po lewej albo utwórz nową.</p></div></section>`}</div>`;
      $app.querySelector('.col-main').appendChild($dock);
    } else {
      $app.innerHTML = list ? renderList(list) : renderLists();
      if ($dock.parentNode !== document.body) document.body.insertBefore($dock, $sheetRoot);
    }
    if (ui.newListOpen || ui.focusAdd) {
      const field = $app.querySelector('.row-form .field');
      if (field) field.focus();
      ui.focusAdd = false;
    }
    renderDock();
    document.getElementById('warn').hidden = storageOk;
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
      case 'hide-hint': hideHint(); break;
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

  // Na telefonie karta bywa zamykana bez beforeunload — zapis przy schowaniu strony.
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // PWA: praca bez internetu i trwały zapis (bez service workera przy file://).
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  window.addEventListener('hashchange', render);
  wide.addEventListener('change', render);
  setInterval(tick, 500);
  render();
})();
