const { test } = require('node:test');
const assert = require('node:assert');
const { mapVersionCode } = require('../lib/converters');

test('mapVersionCode maps modern codes (>=43) to AC version', () => {
  assert.strictEqual(mapVersionCode(43), 25);
  assert.strictEqual(mapVersionCode(46), 28);
  assert.strictEqual(mapVersionCode(47), 29);
});

test('mapVersionCode maps legacy codes', () => {
  assert.strictEqual(mapVersionCode(41), 24);
  assert.strictEqual(mapVersionCode(40), 23);
  assert.strictEqual(mapVersionCode(32), 16);
});

test('mapVersionCode returns null for unknown codes', () => {
  assert.strictEqual(mapVersionCode(0), null);
  assert.strictEqual(mapVersionCode(33), null);
});
