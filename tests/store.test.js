const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/store.js');

// Helper: state with lists built through the store API
function setup() {
  const state = S.load(null);
  const l1 = S.createList(state, 'First', 0);
  const l2 = S.createList(state, 'Second', 0);
  const a = S.addTask(state, l1.id, 'A');
  const b = S.addTask(state, l2.id, 'B');
  return { state, l1, l2, a, b };
}

test('fmt formats H:MM:SS', () => {
  assert.equal(S.fmt(0), '0:00:00');
  assert.equal(S.fmt(3432000), '0:57:12');
  assert.equal(S.fmt(43205000), '12:00:05');
  assert.equal(S.fmt(999), '0:00:00');
});

test('clock moving backwards never produces negative elapsed time', () => {
  const { state, l1, a } = setup();
  S.startTask(state, l1.id, a.id, 2000);
  assert.equal(S.elapsed(a, 1000), 0);
  S.pauseTask(state, l1.id, a.id, 1000);
  assert.equal(a.elapsedMs, 0);
  assert.equal(S.fmt(-1000), '0:00:00');
});

test('load safely rejects malformed stored lists and tasks', () => {
  for (const lists of [[{}], [null], [{id:'x', name:'X', createdAt:0, closedAt:null, tasks:[{}]}]]) {
    assert.deepEqual(S.load(JSON.stringify({lists})), {lists:[], selectedId:null});
  }
});

test('load: no data and bad JSON give an empty state', () => {
  assert.deepEqual(S.load(null), { lists: [], selectedId: null });
  assert.deepEqual(S.load('{bad'), { lists: [], selectedId: null });
});

test('load: v1 data with one task loads unchanged', () => {
  const v1 = {
    lists: [{ id: 'l1', name: 'Service', createdAt: 10, closedAt: null,
      tasks: [{ id: 't1', name: 'Oil', elapsedMs: 500, runningSince: 1000, done: false }] }],
    selectedId: 'l1'
  };
  assert.deepEqual(S.load(JSON.stringify(v1)), v1);
});

test('load: of several running tasks the newest keeps running, the rest get their time added', () => {
  const raw = JSON.stringify({
    lists: [
      { id: 'l1', name: 'X', createdAt: 0, closedAt: null,
        tasks: [{ id: 'a', name: 'A', elapsedMs: 0, runningSince: 1000, done: false }] },
      { id: 'l2', name: 'Y', createdAt: 0, closedAt: null,
        tasks: [{ id: 'b', name: 'B', elapsedMs: 0, runningSince: 5000, done: false }] }
    ],
    selectedId: null
  });
  const state = S.load(raw);
  const a = state.lists[0].tasks[0];
  const b = state.lists[1].tasks[0];
  assert.equal(b.runningSince, 5000);
  assert.equal(a.runningSince, null);
  assert.equal(a.elapsedMs, 4000);
});

test('serialize and load round-trip the state', () => {
  const { state } = setup();
  assert.deepEqual(S.load(S.serialize(state)), state);
});

test('startTask pauses a task running in another list', () => {
  const { state, l1, l2, a, b } = setup();
  S.startTask(state, l1.id, a.id, 1000);
  S.startTask(state, l2.id, b.id, 3000);
  assert.equal(a.elapsedMs, 2000);
  assert.equal(a.runningSince, null);
  assert.equal(S.running(state).task, b);
  assert.equal(S.running(state).list, l2);
});

test('startTask does nothing for a finished task', () => {
  const { state, l1, a } = setup();
  S.finishTask(state, l1.id, a.id, 0);
  S.startTask(state, l1.id, a.id, 100);
  assert.equal(S.running(state), null);
});

test('startTask does nothing on a closed list', () => {
  const { state, l1, a } = setup();
  S.finishTask(state, l1.id, a.id, 0);
  S.closeList(state, l1.id, 50);
  a.done = false; // even if the task were not finished
  S.startTask(state, l1.id, a.id, 100);
  assert.equal(S.running(state), null);
});

test('toggleTask twice: start then pause', () => {
  const { state, l1, a } = setup();
  S.toggleTask(state, l1.id, a.id, 0);
  assert.equal(S.running(state).task, a);
  S.toggleTask(state, l1.id, a.id, 1500);
  assert.equal(a.elapsedMs, 1500);
  assert.equal(S.running(state), null);
});

test('pauseTask adds the elapsed time', () => {
  const { state, l1, a } = setup();
  S.startTask(state, l1.id, a.id, 200);
  S.pauseTask(state, l1.id, a.id, 700);
  assert.equal(a.elapsedMs, 500);
  assert.equal(a.runningSince, null);
});

test('elapsed counts a running task up to now', () => {
  assert.equal(S.elapsed({ elapsedMs: 500, runningSince: 1000 }, 4000), 3500);
  assert.equal(S.elapsed({ elapsedMs: 500, runningSince: null }, 4000), 500);
});

test('listTotal sums task times', () => {
  const list = { tasks: [{ elapsedMs: 100, runningSince: null }, { elapsedMs: 0, runningSince: 50 }] };
  assert.equal(S.listTotal(list, 150), 200);
});

test('canClose and remaining', () => {
  const { state, l1, a } = setup();
  assert.equal(S.canClose({ tasks: [] }), false);
  const a2 = S.addTask(state, l1.id, 'A2');
  S.finishTask(state, l1.id, a.id, 0);
  assert.equal(S.canClose(l1), false);
  assert.equal(S.remaining(l1), 1);
  S.finishTask(state, l1.id, a2.id, 0);
  assert.equal(S.canClose(l1), true);
  assert.equal(S.remaining(l1), 0);
});

test('closeList refuses while tasks are unfinished', () => {
  const { state, l1 } = setup();
  assert.equal(S.closeList(state, l1.id, 99), false);
  assert.equal(l1.closedAt, null);
});

test('closeList closes the list and blocks changes', () => {
  const { state, l1, a } = setup();
  S.finishTask(state, l1.id, a.id, 0);
  assert.equal(S.closeList(state, l1.id, 99), true);
  assert.equal(l1.closedAt, 99);
  assert.equal(S.addTask(state, l1.id, 'New'), null);
  S.reopenTask(state, l1.id, a.id);
  assert.equal(a.done, true);
});

test('finishTask stops and finishes, reopenTask reopens', () => {
  const { state, l1, a } = setup();
  S.startTask(state, l1.id, a.id, 0);
  S.finishTask(state, l1.id, a.id, 300);
  assert.equal(a.done, true);
  assert.equal(a.elapsedMs, 300);
  assert.equal(S.running(state), null);
  S.reopenTask(state, l1.id, a.id);
  assert.equal(a.done, false);
});

test('deleteTask on the running task stops timing', () => {
  const { state, l1, a } = setup();
  S.startTask(state, l1.id, a.id, 0);
  S.deleteTask(state, l1.id, a.id);
  assert.equal(S.running(state), null);
  assert.equal(l1.tasks.length, 0);
});

test('deleteList with a running task clears running and selectedId', () => {
  const { state, l2, b } = setup();
  S.startTask(state, l2.id, b.id, 0);
  state.selectedId = l2.id;
  S.deleteList(state, l2.id);
  assert.equal(S.running(state), null);
  assert.equal(state.selectedId, null);
  assert.equal(S.findList(state, l2.id), undefined);
});

test('createList sets selectedId', () => {
  const state = S.load(null);
  const l = S.createList(state, 'New', 5);
  assert.equal(state.selectedId, l.id);
  assert.equal(l.createdAt, 5);
  assert.equal(l.closedAt, null);
});

test('blank names are rejected', () => {
  const { state, l1, a } = setup();
  assert.equal(S.addTask(state, l1.id, '   '), null);
  S.renameList(state, l1.id, '');
  assert.equal(l1.name, 'First');
  S.renameTask(state, l1.id, a.id, '  ');
  assert.equal(a.name, 'A');
});

test('renameList and renameTask trim spaces', () => {
  const { state, l1, a } = setup();
  S.renameList(state, l1.id, '  New name ');
  S.renameTask(state, l1.id, a.id, ' Task ');
  assert.equal(l1.name, 'New name');
  assert.equal(a.name, 'Task');
});

test('uid returns distinct ids', () => {
  assert.notEqual(S.uid(), S.uid());
});
