// App views and events. Logic and state: js/store.js (TaskStore).
(() => {
  const S = window.TaskStore;
  const KEY = 'taskTimer.v1';

  // ---------- State and saving ----------
  let storageOk = true;
  const state = (() => {
    try { return S.load(localStorage.getItem(KEY)); }
    catch (e) { storageOk = false; return S.load(null); }
  })();

  function save() {
    try { localStorage.setItem(KEY, S.serialize(state)); storageOk = true; }
    catch (e) { storageOk = false; }
  }

  // Every user action: change state → save → render.
  function act(fn) {
    const key = focusKey(document.activeElement);
    fn();
    save();
    render();
    restoreFocus(key);
  }

  // The view is rebuilt from scratch, so focus is found again by the element's attributes.
  function focusKey(el) {
    if (!el || !el.closest || !el.closest('#app, #dock')) return null;
    if (el.dataset.act) return `[data-act="${el.dataset.act}"]` + (el.dataset.task ? `[data-task="${el.dataset.task}"]` : '');
    if (el.dataset.dock) return `[data-dock="${el.dataset.dock}"]`;
    if (el.matches('a[href]')) return `a[href="${el.getAttribute('href')}"]`;
    return null;
  }
  function restoreFocus(key) {
    if (!key || (document.activeElement && document.activeElement !== document.body)) return;
    const el = document.querySelector(`#app ${key}, #dock ${key}`);
    if (el) el.focus();
  }

  const now = () => Date.now();
  const wide = window.matchMedia('(min-width: 768px)');

  // View-only state (not saved).
  const ui = { newListOpen: false };

  let undoAction = null;
  let undoTimer = null;
  function clearUndo() {
    clearTimeout(undoTimer);
    undoTimer = null;
    undoAction = null;
    $toast.hidden = true;
    $toast.innerHTML = "";
  }
  const $toast = document.getElementById('toast');
  function offerUndo(message, restore) {
    clearUndo();
    undoAction = restore;
    $toast.hidden = false;
    $toast.innerHTML = '<span></span><button type="button">Undo</button>';
    $toast.querySelector('span').textContent = message;
    undoTimer = setTimeout(clearUndo, 10000);
  }
  $toast.addEventListener('click', e => {
    if (!e.target.closest('button') || !undoAction) return;
    const restore = undoAction;
    clearUndo();
    act(restore);
  });
  function pauseTimer(listId, taskId) {
    S.pauseTask(state, listId, taskId, now());
  }
  function dockTask() {
    return S.running(state);
  }

  // ---------- Helpers ----------
  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const listHref = id => `#/list/${encodeURIComponent(id)}`;
  const doneCount = list => list.tasks.length - S.remaining(list);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function route() {
    // #/lista/ is the address from the Polish version — old links still work.
    const m = location.hash.match(/^#\/lista?\/(.+)$/);
    const listId = m && decodeURIComponent(m[1]);
    if (listId && S.findList(state, listId)) return { view: 'list', listId };
    return { view: 'lists' };
  }

  // ---------- "My lists" screen ----------
  function listRow(list) {
    const sub = list.closedAt ? 'Closed'
      : list.tasks.length ? `${doneCount(list)} of ${list.tasks.length} done` : 'No tasks';
    const current = wide.matches && list.id === state.selectedId ? ' aria-current="page"' : '';
    const runningHere = S.running(state)?.list.id === list.id ? ' has-running' : '';
    return `<li><a class="row list-row${runningHere}" href="${listHref(list.id)}"${current}>
      <span class="row-main"><span class="name">${esc(list.name)}</span><span class="sub">${sub}</span></span>
      <span class="clock" data-total="${list.id}">${S.fmt(S.listTotal(list, now()))}</span>
    </a></li>`;
  }

  function newListForm(cls, label) {
    return `<form class="${cls}" data-form="new-list">
      <input class="field" name="name" maxlength="100" placeholder="e.g. Website project" aria-label="List name" autocomplete="off" required>
      <button class="btn btn-main" type="submit">${label}</button>
    </form>`;
  }

  const LISTS_MENU_BUTTON = '<button class="icon-btn" data-act="lists-menu" aria-label="Menu">⋮</button>';

  function renderLists() {
    const active = state.lists.filter(l => !l.closedAt);
    const closed = state.lists.filter(l => l.closedAt);

    if (!state.lists.length) {
      return `<section class="screen" aria-label="My lists">
        <div class="head"><div class="head-top lists-head"><div><div class="brand"><img src="icons/icon.svg" alt="" width="28" height="28">Task Timer</div><h1 class="title title-lists">My lists</h1></div>${LISTS_MENU_BUTTON}</div></div>
        <div class="empty">
          <h2>Create your first list</h2>
          <p>Name a list, add tasks and track your time.</p>
          ${newListForm('', 'Create list')}
        </div>
      </section>`;
    }

    const addRow = ui.newListOpen
      ? `<li>${newListForm('row-form', 'Create')}</li>`
      : `<li><button class="row row-add" data-act="open-new-list"><span class="plus" aria-hidden="true">+</span>New list</button></li>`;

    return `<section class="screen" aria-label="My lists">
      <div class="head"><div class="head-top lists-head"><div><div class="brand"><img src="icons/icon.svg" alt="" width="28" height="28">Task Timer</div><h1 class="title title-lists">My lists</h1></div>${LISTS_MENU_BUTTON}</div></div>
      <ul class="rows">${active.map(listRow).join('')}${addRow}</ul>
      ${closed.length ? `<details class="closed"${ui.closedOpen ? ' open' : ''}>
        <summary>Archive (${closed.length})</summary>
        <ul class="rows">${closed.map(listRow).join('')}</ul>
      </details>` : ''}
    </section>`;
  }

  // ---------- List screen ----------
  const ICON_CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';

  function taskState(task) {
    if (task.done) return { cls: 'is-done', label: 'Done' };
    if (task.runningSince != null) return { cls: 'is-running', label: 'Running' };
    if (task.elapsedMs > 0) return { cls: 'is-paused', label: 'Paused' };
    return { cls: '', label: 'Not started' };
  }

  function taskRow(list, task) {
    const st = taskState(task);
    const running = task.runningSince != null;
    const info = '<div class="row-main"><span class="name">' + esc(task.name) + '</span><span class="sub">' + st.label + '</span></div>';
    const time = '<span class="clock" data-time="' + task.id + '">' + S.fmt(S.elapsed(task, now())) + '</span>';
    const mark = task.done ? ICON_CHECK : '';
    if (list.closedAt) return '<li class="task ' + st.cls + '"><span class="check" aria-hidden="true">' + mark + '</span><div class="row task-main">' + info + time + '</div></li>';
    return '<li class="task ' + st.cls + '">' +
      '<button class="check" data-act="check" data-task="' + task.id + '" aria-label="' + (task.done ? 'Reopen: ' : 'Finish: ') + esc(task.name) + '">' + mark + '</button>' +
      '<div class="row task-main">' + info + time + '</div>' +
      (!task.done ? '<button class="task-control' + (running ? ' active' : '') + '" data-act="toggle" data-task="' + task.id + '" aria-label="' + (running ? 'Pause: ' : 'Start: ') + esc(task.name) + '">' + (running ? ICON_PAUSE : ICON_PLAY) + '</button>' : '') +
      '<button class="icon-btn task-menu" data-act="task-menu" data-task="' + task.id + '" aria-label="Task menu: ' + esc(task.name) + '">⋮</button></li>';
  }

  const ADD_TASK_BUTTON = '<button class="row row-add" data-act="open-add"><span class="plus" aria-hidden="true">+</span>Add task</button>';

  function renderList(list) {
    const total = list.tasks.length;
    const done = doneCount(list);
    const closed = !!list.closedAt;
    const empty = total === 0 && !closed;
    const addOpen = empty || ui.addOpen === list.id;

    const addRow = closed ? '' : addOpen
      ? `<li><form class="row-form" data-form="new-task">
          <input class="field" name="name" maxlength="200" placeholder="e.g. Prepare the project" aria-label="Task name" autocomplete="off" enterkeyhint="done">
          <button class="btn btn-main" type="submit">Add</button>
        </form></li>`
      : `<li>${ADD_TASK_BUTTON}</li>`;

    let footer = '';
    if (closed) footer = `<button class="btn btn-main btn-wide" data-act="print">Save as PDF</button>`;
    else if (S.canClose(list)) footer = `<button class="btn btn-done btn-wide" data-act="close">Close list</button>`;

    return `<section class="screen" aria-label="${esc(list.name)}">
      <div class="head">
        <div class="head-top">
          ${wide.matches ? '' : '<a class="back" href="#/">My lists</a>'}
          <button class="icon-btn" data-act="list-menu" aria-label="List menu">⋮</button>
        </div>
        <h1 class="title">${esc(list.name)}${closed ? '<span class="badge">Closed</span>' : ''}</h1>
        <div class="summary-card"><div class="total"><span>Total time</span><span class="clock" data-total="${list.id}">${S.fmt(S.listTotal(list, now()))}</span></div><div class="summary-progress"><div class="meta">
          <span>${empty ? 'Add your first task' : `${done} of ${total} done`}</span>
        </div>
        <div class="progress" role="progressbar" aria-label="Task progress" aria-valuemin="0" aria-valuemax="${total || 1}" aria-valuenow="${done}"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div></div></div>
      </div>
      <ul class="rows tasks">${list.tasks.map(t => taskRow(list, t)).join('')}${addRow}</ul>
      ${!closed && total && !hintSeen() ? `<p class="hint">Use the task menu to rename or delete a task.
        <button class="hint-x" data-act="hide-hint" aria-label="Dismiss tip">×</button></p>` : ''}
      ${footer}
    </section>`;
  }

  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  // ---------- Dock with the running task's clock ----------
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
  const $dock = document.getElementById('dock');

  function renderDock() {
    const r = dockTask();
    if (!r) { $dock.hidden = true; $dock.innerHTML = ''; return; }
    $dock.hidden = false;
    $dock.innerHTML = '<div class="dock-in">' +
      '<a class="dock-info" href="' + listHref(r.list.id) + '"><span class="dock-name">' + esc(r.task.name) + '</span><span class="dock-list">' + 'Running' + ' · ' + esc(r.list.name) + '</span></a>' +
      '<span class="clock dock-clock" data-time="' + r.task.id + '">' + S.fmt(S.elapsed(r.task, now())) + '</span>' +
      '<button class="dock-btn dock-pause" data-dock="pause">' + ICON_PAUSE + '<span>Pause</span></button>' +
      '<button class="dock-btn dock-finish" data-dock="finish">' + ICON_CHECK + '<span>Finish</span></button></div>';
  }

  // ---------- Sheets (instead of confirm / prompt) ----------
  const $sheetRoot = document.getElementById('sheet-root');
  let sheet = null; // { actions, opener, openerKey }

  function openSheet({ title, body, actions, input, cancel = true }, opener) {
    const from = opener || sheet?.opener || document.activeElement;
    sheet = { actions, opener: from, openerKey: sheet?.openerKey || focusKey(from) };
    setInert(true);
    $sheetRoot.innerHTML = `<div class="sheet-backdrop">
      <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <h2 class="sheet-title" id="sheet-title">${esc(title)}</h2>
        ${body ? `<p class="sheet-body">${esc(body)}</p>` : ''}
        ${input ? `<input class="field sheet-field" name="value" value="${esc(input.value)}" maxlength="${input.maxlength || 200}" aria-label="${esc(title)}" autocomplete="off">` : ''}
        <div class="sheet-actions">
          ${actions.map((a, i) => `<button class="sheet-btn${a.danger ? ' is-danger' : ''}" type="${input && i === 0 ? 'submit' : 'button'}" data-sheet="${i}">${esc(a.label)}</button>`).join('')}
          ${cancel ? '<button class="sheet-btn is-cancel" type="button" data-sheet="cancel">Cancel</button>' : ''}
        </div>
      </form>
    </div>`;
    const first = $sheetRoot.querySelector('.sheet-field, .sheet-btn');
    first.focus();
    if (first.select) first.select();
  }

  function closeSheet(refocus = true) {
    if (!sheet) return;
    const { opener, openerKey } = sheet;
    sheet = null;
    $sheetRoot.innerHTML = '';
    setInert(false);
    if (!refocus) return;
    if (opener && opener.isConnected) opener.focus();
    else restoreFocus(openerKey);
  }

  function setInert(on) {
    ['app', 'dock', 'warn', 'update', 'toast'].forEach(id => { document.getElementById(id).inert = on; });
  }

  function runSheetAction(i) {
    const action = sheet.actions[i];
    const field = $sheetRoot.querySelector('.sheet-field');
    const keep = sheet;
    action.run(field ? field.value : undefined);
    if (sheet === keep) closeSheet(); // the action did not open another sheet
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

  // ---------- List and task menus ----------
  function askRenameList(list) {
    openSheet({ title: 'Rename list', input: { value: list.name, maxlength: 100 },
      actions: [{ label: 'Save', run: v => act(() => S.renameList(state, list.id, v)) }] });
  }

  function askCloseList(list, opener) {
    const left = S.remaining(list);
    if (!S.canClose(list)) {
      return openSheet({ title: 'Can’t close this list', cancel: false,
        body: list.tasks.length ? `Finish all tasks first. Remaining: ${left}.` : 'Add and finish at least one task.',
        actions: [{ label: 'OK', run: () => {} }] }, opener);
    }
    openSheet({ title: 'Close list?', body: `Close “${list.name}” and move it to the archive? You can reopen it later.`,
      actions: [{ label: 'Close list', run: () => act(() => S.closeList(state, list.id, now())) }] }, opener);
  }

  function askDeleteList(list) {
    openSheet({ title: 'Delete list?', body: `Delete “${list.name}”? You can undo this for 10 seconds.`,
      actions: [{ label: 'Delete list', danger: true, run: () => {
        const index = state.lists.indexOf(list);
        list.tasks.forEach(task => S.pauseTask(state, list.id, task.id, now()));
        act(() => S.deleteList(state, list.id));
        offerUndo('List deleted', () => { state.lists.splice(index, 0, list); state.selectedId = list.id; });
        location.hash = '#/';
      } }] });
  }

  document.addEventListener('listmenu', e => {
    const list = S.findList(state, e.detail.listId);
    const actions = list.closedAt
      ? [{ label: 'Save as PDF', run: () => printList(list) }, { label: 'Reopen list', run: () => act(() => { list.closedAt = null; }) }]
      : [{ label: 'Rename', run: () => askRenameList(list) },
         { label: 'Close list', run: () => askCloseList(list) }];
    actions.push({ label: 'Delete list', danger: true, run: () => askDeleteList(list) });
    openSheet({ title: list.name, actions }, e.detail.opener);
  });

  document.addEventListener('taskmenu', e => {
    const list = S.findList(state, e.detail.listId);
    const task = list && list.tasks.find(t => t.id === e.detail.taskId);
    if (!task || list.closedAt) return;
    hideHint();
    openSheet({ title: task.name, actions: [
      { label: 'Rename', run: () => openSheet({ title: 'Rename task', input: { value: task.name },
        actions: [{ label: 'Save', run: v => act(() => S.renameTask(state, list.id, task.id, v)) }] }) },
      { label: 'Delete task', danger: true, run: () => openSheet({ title: 'Delete task?',
        body: `Delete “${task.name}”? You can undo this for 10 seconds.`,
        actions: [{ label: 'Delete task', danger: true, run: () => {
          const index = list.tasks.indexOf(task);
          S.pauseTask(state, list.id, task.id, now());
          act(() => S.deleteTask(state, list.id, task.id));
          offerUndo('Task deleted', () => {
            const current = S.findList(state, list.id);
            if (current) { current.closedAt = null; current.tasks.splice(index, 0, task); }
          });
        } }] }) }
    ] }, e.detail.opener);
  });

  document.addEventListener('closelist', e => askCloseList(S.findList(state, e.detail.listId), e.detail.opener));
  document.addEventListener('printlist', e => printList(S.findList(state, e.detail.listId)));

  // ---------- Press-and-hold tip ----------
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

  // ---------- PDF report (print dialog) ----------
  function printList(list) {
    const t = now();
    const rows = list.tasks.map((task, i) => `<tr>
      <td class="n">${i + 1}</td><td>${esc(task.name)}</td><td class="t">${S.fmt(S.elapsed(task, t))}</td></tr>`).join('');
    const fmtDate = ts => new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    document.getElementById('printReport').innerHTML = `
      <h1>${esc(list.name)}</h1>
      <div class="meta">Created: ${fmtDate(list.createdAt)}<br>Closed: ${fmtDate(list.closedAt)}<br>Tasks: ${list.tasks.length}</div>
      <table>
        <thead><tr><th class="n">#</th><th>Task</th><th class="t">Time</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td></td><td>Total time</td><td class="t">${S.fmt(S.listTotal(list, t))}</td></tr></tfoot>
      </table>
      <div class="footer">Generated: ${fmtDate(t)}, Task Timer</div>`;
    // The page title becomes the default file name in "Save as PDF".
    const prevTitle = document.title;
    document.title = `${list.name} - time report`;
    window.addEventListener('afterprint', () => { document.title = prevTitle; }, { once: true });
    window.print();
  }

  // ---------- Theme (Auto / Light / Dark) ----------
  const THEME_KEY = 'taskTimer.theme';
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const THEME_COLORS = { light: '#EEF1F4', dark: '#161C24' };

  function themePref() {
    try { return S.themePref(localStorage.getItem(THEME_KEY)); } catch (e) { return 'auto'; }
  }

  function applyTheme() {
    const pref = themePref();
    if (pref === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = pref;
    // The browser / system bar colour: both meta tags get the colour of the theme shown now.
    const color = THEME_COLORS[S.resolveTheme(pref, systemDark.matches)];
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = color; });
  }

  function askTheme() {
    const current = themePref();
    const option = (value, label) => ({ label: label + (current === value ? ' ✓' : ''), run: () => {
      try { localStorage.setItem(THEME_KEY, value); } catch (e) {}
      applyTheme();
    } });
    openSheet({ title: 'Theme', actions: [
      option('auto', 'Auto (system)'), option('light', 'Light'), option('dark', 'Dark')
    ] });
  }

  systemDark.addEventListener('change', applyTheme);
  applyTheme();

  // ---------- Backup (export / import) ----------
  const $importFile = document.getElementById('importFile');

  function exportBackupFile() {
    const name = `task-timer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([S.exportBackup(state, now())], name, { type: 'application/json' });
    // Phones: the system share sheet (save to Files / Drive, send by email). Desktop: plain download.
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Task Timer backup' }).catch(() => {});
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  $importFile.addEventListener('change', async () => {
    const file = $importFile.files[0];
    $importFile.value = '';
    if (!file) return;
    const backup = S.parseBackup(await file.text());
    if (!backup) {
      openSheet({ title: 'Can’t import', body: 'This file is not a Task Timer backup.', cancel: false,
        actions: [{ label: 'OK', run: () => {} }] });
      return;
    }
    const n = backup.lists.length;
    openSheet({ title: 'Replace all data?',
      body: `Your current data will be replaced by the backup. Lists: ${n}.`,
      actions: [{ label: 'Replace data', danger: true, run: () => {
        clearUndo();
        act(() => { state.lists = backup.lists; state.selectedId = null; delete state.pausedTask; });
        location.hash = '#/';
      } }] });
  });

  $dock.addEventListener('click', e => {
    const btn = e.target.closest('[data-dock]');
    const r = dockTask();
    if (!btn || !r) return;
    if (btn.dataset.dock === 'pause') act(() => pauseTimer(r.list.id, r.task.id));
    else act(() => S.finishTask(state, r.list.id, r.task.id, now()));
  });

  // ---------- Rendering ----------
  const $app = document.getElementById('app');

  // The list on screen: on a phone only from the address, on a tablet also the last selected one.
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
      // Tablet / desktop: lists on the left, selected list on the right, dock in the right column.
      const shown = list;
      $app.innerHTML = `<div class="col-lists">${renderLists()}</div>
        <div class="col-main">${shown ? renderList(shown) : `<section class="screen"><div class="empty">
          <h2>Choose a list</h2><p>Choose a list on the left or create a new one.</p></div></section>`}</div>`;
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

  // Clocks tick without rebuilding the view.
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

  // ---------- Events ----------
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
    if (Date.now() < suppressClickUntil) { e.preventDefault(); return; }
    const list = S.findList(state, state.selectedId);
    const taskId = btn.dataset.task;
    switch (btn.dataset.act) {
      case 'open-new-list': ui.newListOpen = true; render(); break;
      case 'open-add': ui.addOpen = list.id; ui.focusAdd = true; render(); break;
      case 'toggle': act(() => {
        const task = list.tasks.find(t => t.id === taskId);
        if (task.runningSince != null) pauseTimer(list.id, taskId);
        else { S.startTask(state, list.id, taskId, now()); }
      }); break;
      case 'task-menu': emit('taskmenu', { listId: list.id, taskId, opener: btn }); break;
      case 'check': {
        const task = list.tasks.find(t => t.id === taskId);
        act(() => task.done ? S.reopenTask(state, list.id, taskId) : S.finishTask(state, list.id, taskId, now()));
        break;
      }
      case 'list-menu': emit('listmenu', { listId: list.id, opener: btn }); break;
      case 'close': emit('closelist', { listId: list.id, opener: btn }); break;
      case 'print': emit('printlist', { listId: list.id }); break;
      case 'hide-hint': hideHint(); break;
      case 'lists-menu': openSheet({ title: 'Menu', body: `Task Timer ${window.APP_VERSION}`, actions: [
        { label: 'Theme', run: askTheme },
        { label: 'Export backup', run: exportBackupFile },
        { label: 'Import backup', run: () => $importFile.click() }
      ] }, btn); break;
    }
  });

  // Press and hold / right-click on a task → task menu.
  let pressTimer = null, pressStart = null, suppressClickUntil = 0, lastMenuAt = 0;
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
    // A click arriving right after a press-and-hold must not toggle the task.
    pressTimer = setTimeout(() => { pressTimer = null; suppressClickUntil = Date.now() + 600; openTaskMenu(btn); }, 500);
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

  // An empty "add task" field closes when it loses focus (list with tasks).
  $app.addEventListener('focusout', e => {
    if (!e.target.matches('[data-form="new-task"] .field') || e.target.value.trim()) return;
    setTimeout(() => {
      if ($app.contains(document.activeElement) && document.activeElement.closest('[data-form="new-task"]')) return;
      const li = $app.querySelector('[data-form="new-task"]')?.parentElement;
      if (!ui.addOpen || !li) return;
      const list = S.findList(state, ui.addOpen);
      if (!list || !list.tasks.length) return; // empty list: the field stays
      ui.addOpen = null;
      li.innerHTML = ADD_TASK_BUTTON;
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

  // Phones often close the tab without beforeunload — save when the page is hidden.
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // PWA: offline use and persistent storage (no service worker on file://).
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // A page already controlled by a service worker that gets a new one = a new version was installed.
    // (On the very first visit there is no controller yet, so no bar.)
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) document.getElementById('update').hidden = false;
    });
    navigator.serviceWorker.register('sw.js').then(reg => {
      // Apps left open in the background check for a new version when they come back.
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  }
  document.getElementById('updateReload').addEventListener('click', () => location.reload());
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // The back gesture / button changes the address — an open sheet belonged to the previous screen.
  window.addEventListener('hashchange', () => { closeSheet(false); render(); });
  wide.addEventListener('change', render);
  setInterval(tick, 500);
  render();
})();
