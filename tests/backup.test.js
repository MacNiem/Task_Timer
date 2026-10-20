const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/store.js');

function sampleState() {
  const state = S.load(null);
  const list = S.createList(state, 'Garage', 1000);
  const a = S.addTask(state, list.id, 'Oil change');
  S.addTask(state, list.id, 'Chain');
  S.startTask(state, list.id, a.id, 2000);
  return state;
}

test('exportBackup marks the file as a Task Timer backup', () => {
  const data = JSON.parse(S.exportBackup(sampleState(), 5000));
  assert.equal(data.app, 'task-timer');
  assert.equal(data.version, 1);
  assert.equal(data.exportedAt, 5000);
  assert.equal(data.lists.length, 1);
});

test('parseBackup restores the exported lists', () => {
  const state = sampleState();
  const restored = S.parseBackup(S.exportBackup(state, 5000));
  assert.deepEqual(restored.lists, state.lists);
  assert.equal(restored.selectedId, null);
});

test('parseBackup keeps a running task running', () => {
  const restored = S.parseBackup(S.exportBackup(sampleState(), 5000));
  assert.equal(S.running(restored).task.name, 'Oil change');
  assert.equal(S.running(restored).task.runningSince, 2000);
});

test('parseBackup rejects text that is not JSON', () => {
  assert.equal(S.parseBackup('not json'), null);
  assert.equal(S.parseBackup(''), null);
});

test('parseBackup rejects JSON from another app', () => {
  assert.equal(S.parseBackup(JSON.stringify({ lists: [] })), null);
  assert.equal(S.parseBackup(JSON.stringify({ app: 'other', version: 1, lists: [] })), null);
  assert.equal(S.parseBackup(JSON.stringify([1, 2, 3])), null);
});

test('parseBackup rejects a list without a tasks array', () => {
  const bad = { app: 'task-timer', version: 1, lists: [{ id: 'l', name: 'X', createdAt: 1, closedAt: null }] };
  assert.equal(S.parseBackup(JSON.stringify(bad)), null);
});

test('parseBackup rejects wrong field types', () => {
  const task = { id: 't', name: 'T', elapsedMs: '5', runningSince: null, done: false };
  const bad = { app: 'task-timer', version: 1, lists: [{ id: 'l', name: 'X', createdAt: 1, closedAt: null, tasks: [task] }] };
  assert.equal(S.parseBackup(JSON.stringify(bad)), null);
  const badDone = structuredClone(bad);
  badDone.lists[0].tasks[0] = { ...task, elapsedMs: 5, done: 'yes' };
  assert.equal(S.parseBackup(JSON.stringify(badDone)), null);
});

test('parseBackup accepts an empty backup', () => {
  const restored = S.parseBackup(JSON.stringify({ app: 'task-timer', version: 1, exportedAt: 1, lists: [] }));
  assert.deepEqual(restored, { lists: [], selectedId: null });
});

test('parseBackup leaves only one timer running', () => {
  const task = (id, since) => ({ id, name: id, elapsedMs: 0, runningSince: since, done: false });
  const data = { app: 'task-timer', version: 1, exportedAt: 1, lists: [
    { id: 'l1', name: 'A', createdAt: 0, closedAt: null, tasks: [task('a', 1000)] },
    { id: 'l2', name: 'B', createdAt: 0, closedAt: null, tasks: [task('b', 3000)] }
  ] };
  const restored = S.parseBackup(JSON.stringify(data));
  assert.equal(S.running(restored).task.id, 'b');
  assert.equal(restored.lists[0].tasks[0].elapsedMs, 2000);
});
