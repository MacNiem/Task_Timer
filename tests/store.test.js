const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/store.js');

// Pomocnik: stan z listami zbudowany przez API sklepu
function setup() {
  const state = S.load(null);
  const l1 = S.createList(state, 'Pierwsza', 0);
  const l2 = S.createList(state, 'Druga', 0);
  const a = S.addTask(state, l1.id, 'A');
  const b = S.addTask(state, l2.id, 'B');
  return { state, l1, l2, a, b };
}

test('fmt formatuje H:MM:SS', () => {
  assert.equal(S.fmt(0), '0:00:00');
  assert.equal(S.fmt(3432000), '0:57:12');
  assert.equal(S.fmt(43205000), '12:00:05');
  assert.equal(S.fmt(999), '0:00:00');
});

test('load: brak danych i zły JSON dają pusty stan', () => {
  assert.deepEqual(S.load(null), { lists: [], selectedId: null });
  assert.deepEqual(S.load('{zly'), { lists: [], selectedId: null });
});

test('load: dane v1 z jednym zadaniem wczytują się bez zmian', () => {
  const v1 = {
    lists: [{ id: 'l1', name: 'Serwis', createdAt: 10, closedAt: null,
      tasks: [{ id: 't1', name: 'Olej', elapsedMs: 500, runningSince: 1000, done: false }] }],
    selectedId: 'l1'
  };
  assert.deepEqual(S.load(JSON.stringify(v1)), v1);
});

test('load: z kilku biegnących zadań zostaje najnowsze, reszta dostaje doliczony czas', () => {
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

test('serialize i load dają ten sam stan', () => {
  const { state } = setup();
  assert.deepEqual(S.load(S.serialize(state)), state);
});

test('startTask wstrzymuje zadanie biegnące w innej liście', () => {
  const { state, l1, l2, a, b } = setup();
  S.startTask(state, l1.id, a.id, 1000);
  S.startTask(state, l2.id, b.id, 3000);
  assert.equal(a.elapsedMs, 2000);
  assert.equal(a.runningSince, null);
  assert.equal(S.running(state).task, b);
  assert.equal(S.running(state).list, l2);
});

test('startTask nic nie robi dla zakończonego zadania', () => {
  const { state, l1, a } = setup();
  S.finishTask(state, l1.id, a.id, 0);
  S.startTask(state, l1.id, a.id, 100);
  assert.equal(S.running(state), null);
});

test('startTask nic nie robi na zamkniętej liście', () => {
  const { state, l1, a } = setup();
  S.finishTask(state, l1.id, a.id, 0);
  S.closeList(state, l1.id, 50);
  a.done = false; // nawet gdyby zadanie nie było zakończone
  S.startTask(state, l1.id, a.id, 100);
  assert.equal(S.running(state), null);
});

test('toggleTask dwa razy: start i pauza', () => {
  const { state, l1, a } = setup();
  S.toggleTask(state, l1.id, a.id, 0);
  assert.equal(S.running(state).task, a);
  S.toggleTask(state, l1.id, a.id, 1500);
  assert.equal(a.elapsedMs, 1500);
  assert.equal(S.running(state), null);
});

test('pauseTask dolicza czas', () => {
  const { state, l1, a } = setup();
  S.startTask(state, l1.id, a.id, 200);
  S.pauseTask(state, l1.id, a.id, 700);
  assert.equal(a.elapsedMs, 500);
  assert.equal(a.runningSince, null);
});

test('elapsed liczy biegnące zadanie do teraz', () => {
  assert.equal(S.elapsed({ elapsedMs: 500, runningSince: 1000 }, 4000), 3500);
  assert.equal(S.elapsed({ elapsedMs: 500, runningSince: null }, 4000), 500);
});

test('listTotal sumuje czasy zadań', () => {
  const list = { tasks: [{ elapsedMs: 100, runningSince: null }, { elapsedMs: 0, runningSince: 50 }] };
  assert.equal(S.listTotal(list, 150), 200);
});

test('canClose i remaining', () => {
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

test('closeList blokuje zamknięcie przy niezakończonych zadaniach', () => {
  const { state, l1 } = setup();
  assert.equal(S.closeList(state, l1.id, 99), false);
  assert.equal(l1.closedAt, null);
});

test('closeList zamyka i blokuje zmiany', () => {
  const { state, l1, a } = setup();
  S.finishTask(state, l1.id, a.id, 0);
  assert.equal(S.closeList(state, l1.id, 99), true);
  assert.equal(l1.closedAt, 99);
  assert.equal(S.addTask(state, l1.id, 'Nowe'), null);
  S.reopenTask(state, l1.id, a.id);
  assert.equal(a.done, true);
});

test('finishTask wstrzymuje i kończy, reopenTask wznawia', () => {
  const { state, l1, a } = setup();
  S.startTask(state, l1.id, a.id, 0);
  S.finishTask(state, l1.id, a.id, 300);
  assert.equal(a.done, true);
  assert.equal(a.elapsedMs, 300);
  assert.equal(S.running(state), null);
  S.reopenTask(state, l1.id, a.id);
  assert.equal(a.done, false);
});

test('deleteTask biegnącego zadania kończy odliczanie', () => {
  const { state, l1, a } = setup();
  S.startTask(state, l1.id, a.id, 0);
  S.deleteTask(state, l1.id, a.id);
  assert.equal(S.running(state), null);
  assert.equal(l1.tasks.length, 0);
});

test('deleteList z biegnącym zadaniem czyści running i selectedId', () => {
  const { state, l2, b } = setup();
  S.startTask(state, l2.id, b.id, 0);
  state.selectedId = l2.id;
  S.deleteList(state, l2.id);
  assert.equal(S.running(state), null);
  assert.equal(state.selectedId, null);
  assert.equal(S.findList(state, l2.id), undefined);
});

test('createList ustawia selectedId', () => {
  const state = S.load(null);
  const l = S.createList(state, 'Nowa', 5);
  assert.equal(state.selectedId, l.id);
  assert.equal(l.createdAt, 5);
  assert.equal(l.closedAt, null);
});

test('puste nazwy są odrzucane', () => {
  const { state, l1, a } = setup();
  assert.equal(S.addTask(state, l1.id, '   '), null);
  S.renameList(state, l1.id, '');
  assert.equal(l1.name, 'Pierwsza');
  S.renameTask(state, l1.id, a.id, '  ');
  assert.equal(a.name, 'A');
});

test('renameList i renameTask przycinają spacje', () => {
  const { state, l1, a } = setup();
  S.renameList(state, l1.id, '  Nowa nazwa ');
  S.renameTask(state, l1.id, a.id, ' Zadanie ');
  assert.equal(l1.name, 'Nowa nazwa');
  assert.equal(a.name, 'Zadanie');
});

test('uid daje różne identyfikatory', () => {
  assert.notEqual(S.uid(), S.uid());
});
