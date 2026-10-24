const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

// Runs sw.js in a fake environment; returns the cache name and what was passed to cache.addAll.
async function install() {
  const handlers = {};
  let added = null, cacheName = null;
  class FakeRequest { constructor(url, init = {}) { this.url = url; this.cache = init.cache; } }
  const ctx = {
    Request: FakeRequest,
    caches: { open: async name => { cacheName = name; return { addAll: async reqs => { added = reqs; } }; } }
  };
  ctx.self = ctx;
  ctx.addEventListener = (type, fn) => { handlers[type] = fn; };
  ctx.skipWaiting = () => Promise.resolve();
  ctx.importScripts = (...files) => files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx));
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), ctx);
  let done;
  handlers.install({ waitUntil: p => { done = p; } });
  await done;
  return { added, cacheName, version: ctx.APP_VERSION };
}

test('service worker install fetches files from the network, not the HTTP cache', async () => {
  const { added } = await install();
  assert.ok(added.length > 0);
  for (const r of added) {
    assert.equal(typeof r, 'object', `file ${r} added as a string, not a Request`);
    assert.equal(r.cache, 'reload');
  }
});

test('service worker caches all app files', async () => {
  const urls = (await install()).added.map(r => (typeof r === 'string' ? r : r.url));
  for (const f of ['./', 'index.html', 'css/app.css', 'js/version.js', 'js/store.js', 'js/app.js', 'manifest.webmanifest']) {
    assert.ok(urls.includes(f), `missing ${f}`);
  }
});

test('the cache name comes from the app version', async () => {
  const { cacheName, version } = await install();
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(cacheName, `task-timer-${version}`);
});

test('package.json has the same version as the app', async () => {
  const { version } = await install();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, version);
});
