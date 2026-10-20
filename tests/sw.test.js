const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Uruchamia sw.js w sztucznym środowisku i zwraca to, co trafiło do cache.addAll.
async function installedRequests() {
  const handlers = {};
  let added = null;
  class FakeRequest { constructor(url, init = {}) { this.url = url; this.cache = init.cache; } }
  const ctx = {
    Request: FakeRequest,
    self: { addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting: () => Promise.resolve() },
    caches: { open: async () => ({ addAll: async reqs => { added = reqs; } }) }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), ctx);
  let done;
  handlers.install({ waitUntil: p => { done = p; } });
  await done;
  return added;
}

test('instalacja service workera pobiera pliki z sieci, nie z pamięci HTTP', async () => {
  const reqs = await installedRequests();
  assert.ok(reqs.length > 0);
  for (const r of reqs) {
    assert.equal(typeof r, 'object', `plik ${r} dodany jako tekst, nie Request`);
    assert.equal(r.cache, 'reload');
  }
});

test('service worker zapisuje wszystkie pliki aplikacji', async () => {
  const urls = (await installedRequests()).map(r => (typeof r === 'string' ? r : r.url));
  for (const f of ['./', 'index.html', 'css/app.css', 'js/store.js', 'js/app.js', 'manifest.webmanifest']) {
    assert.ok(urls.includes(f), `brak ${f}`);
  }
});
