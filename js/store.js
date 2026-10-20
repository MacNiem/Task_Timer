// App state and task logic — no DOM access.
// In the browser: window.TaskStore, in Node: module.exports.
(function (root) {
  const empty = () => ({ lists: [], selectedId: null });
  const isRunning = task => task.runningSince != null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function elapsed(task, now) {
    return task.elapsedMs + (isRunning(task) ? now - task.runningSince : 0);
  }

  function listTotal(list, now) {
    return list.tasks.reduce((sum, t) => sum + elapsed(t, now), 0);
  }

  function fmt(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function allTasks(state) {
    return state.lists.flatMap(list => list.tasks.map(task => ({ list, task })));
  }

  function stop(task, now) {
    if (isRunning(task)) {
      task.elapsedMs += now - task.runningSince;
      task.runningSince = null;
    }
  }

  // Older data could have several running tasks at once (one timer per list).
  // The most recently started one keeps running; the others are counted up to its start.
  function migrate(state) {
    const runningNow = allTasks(state).filter(x => isRunning(x.task));
    if (runningNow.length < 2) return;
    const newest = runningNow.reduce((a, b) => (b.task.runningSince > a.task.runningSince ? b : a));
    runningNow.forEach(x => { if (x !== newest) stop(x.task, newest.task.runningSince); });
  }

  function load(raw) {
    if (!raw) return empty();
    let state;
    try { state = JSON.parse(raw); } catch (e) { return empty(); }
    if (!state || !Array.isArray(state.lists)) return empty();
    if (state.selectedId === undefined) state.selectedId = null;
    migrate(state);
    return state;
  }

  function serialize(state) {
    return JSON.stringify(state);
  }

  const findList = (state, listId) => state.lists.find(l => l.id === listId);
  const findTask = (state, listId, taskId) => {
    const list = findList(state, listId);
    return list && list.tasks.find(t => t.id === taskId);
  };
  const clean = name => String(name || '').trim();

  function createList(state, name, now) {
    const list = { id: uid(), name: clean(name), createdAt: now, closedAt: null, tasks: [] };
    state.lists.push(list);
    state.selectedId = list.id;
    return list;
  }

  function renameList(state, listId, name) {
    const list = findList(state, listId);
    if (list && clean(name)) list.name = clean(name);
  }

  function deleteList(state, listId) {
    state.lists = state.lists.filter(l => l.id !== listId);
    if (state.selectedId === listId) state.selectedId = null;
  }

  function addTask(state, listId, name) {
    const list = findList(state, listId);
    if (!list || list.closedAt || !clean(name)) return null;
    const task = { id: uid(), name: clean(name), elapsedMs: 0, runningSince: null, done: false };
    list.tasks.push(task);
    return task;
  }

  function renameTask(state, listId, taskId, name) {
    const task = findTask(state, listId, taskId);
    if (task && clean(name)) task.name = clean(name);
  }

  function deleteTask(state, listId, taskId) {
    const list = findList(state, listId);
    if (list) list.tasks = list.tasks.filter(t => t.id !== taskId);
  }

  function startTask(state, listId, taskId, now) {
    const list = findList(state, listId);
    const task = findTask(state, listId, taskId);
    if (!task || list.closedAt || task.done) return;
    // Only one task in the whole app can be timed at once.
    allTasks(state).forEach(x => { if (x.task !== task) stop(x.task, now); });
    if (!isRunning(task)) task.runningSince = now;
  }

  function pauseTask(state, listId, taskId, now) {
    const task = findTask(state, listId, taskId);
    if (task) stop(task, now);
  }

  function toggleTask(state, listId, taskId, now) {
    const task = findTask(state, listId, taskId);
    if (!task) return;
    if (isRunning(task)) stop(task, now);
    else startTask(state, listId, taskId, now);
  }

  function finishTask(state, listId, taskId, now) {
    const list = findList(state, listId);
    const task = findTask(state, listId, taskId);
    if (!task || list.closedAt) return;
    stop(task, now);
    task.done = true;
  }

  function reopenTask(state, listId, taskId) {
    const list = findList(state, listId);
    const task = findTask(state, listId, taskId);
    if (task && !list.closedAt) task.done = false;
  }

  const remaining = list => list.tasks.filter(t => !t.done).length;
  const canClose = list => list.tasks.length > 0 && remaining(list) === 0;

  function closeList(state, listId, now) {
    const list = findList(state, listId);
    if (!list || list.closedAt || !canClose(list)) return false;
    list.tasks.forEach(t => stop(t, now));
    list.closedAt = now;
    return true;
  }

  function running(state) {
    return allTasks(state).find(x => isRunning(x.task)) || null;
  }

  const TaskStore = {
    load, serialize, uid, findList, createList, renameList, deleteList,
    addTask, renameTask, deleteTask, startTask, pauseTask, toggleTask,
    finishTask, reopenTask, remaining, canClose, closeList, running,
    elapsed, listTotal, fmt
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TaskStore;
  else root.TaskStore = TaskStore;
})(this);
