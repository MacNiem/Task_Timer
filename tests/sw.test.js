const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

// Runs sw.js in a fake environment; returns the cache name and what was passed to cache.addAll.
async function install({ cachedVersion = null } = {}) {
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
  ctx.importScripts = (...files) => files.forEach(f => {
    // Model an existing HTTP-cache entry for the original bare import URL.
    const script = cachedVersion && f === 'js/version.js'
      ? `self.APP_VERSION = '${cachedVersion}';`
      : fs.readFileSync(path.join(root, f.split('?')[0]), 'utf8');
    vm.runInContext(script, ctx);
  });
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
  assert.equal(cacheName, `task-timer-${version}-matte-refresh`);
});

test('package.json has the same version as the app', async () => {
  const { version } = await install();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, version);
});

test('legacy cached version import does not keep the worker on an old release', async () => {
  const { cacheName, version } = await install({ cachedVersion: '2.4.2' });
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(version, pkg.version);
  assert.equal(cacheName, `task-timer-${pkg.version}-matte-refresh`);
});

test('worker updates bypass HTTP cache for the worker and imported version script', () => {
  const source = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  assert.match(source, /serviceWorker\.register\('sw\.js',\s*\{\s*updateViaCache:\s*'none'\s*\}\)/);
});
