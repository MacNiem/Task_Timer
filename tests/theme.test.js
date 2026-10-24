const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/store.js');

test('resolveTheme follows the system in auto mode', () => {
  assert.equal(S.resolveTheme('auto', false), 'light');
  assert.equal(S.resolveTheme('auto', true), 'dark');
});

test('resolveTheme uses the chosen theme regardless of the system', () => {
  assert.equal(S.resolveTheme('light', true), 'light');
  assert.equal(S.resolveTheme('dark', false), 'dark');
});

test('resolveTheme treats unknown or missing values as auto', () => {
  assert.equal(S.resolveTheme(null, true), 'dark');
  assert.equal(S.resolveTheme('purple', false), 'light');
});

test('themePref keeps only known preferences', () => {
  assert.equal(S.themePref('light'), 'light');
  assert.equal(S.themePref('dark'), 'dark');
  assert.equal(S.themePref('auto'), 'auto');
  assert.equal(S.themePref(null), 'auto');
  assert.equal(S.themePref('purple'), 'auto');
});
