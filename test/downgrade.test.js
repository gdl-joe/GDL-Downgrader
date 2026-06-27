const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findGsmFiles, buildDestPath } = require('../lib/downgrade');

function makeLibrary() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lib-'));
  fs.writeFileSync(path.join(root, 'a.gsm'), '');
  const sub = path.join(root, 'sub');
  fs.mkdirSync(sub);
  fs.writeFileSync(path.join(sub, 'b.gsm'), '');
  fs.writeFileSync(path.join(sub, 'notes.txt'), '');
  return root;
}

test('findGsmFiles finds .gsm recursively with relative paths', () => {
  const root = makeLibrary();
  const files = findGsmFiles(root).map(f => f.rel).sort();
  assert.deepStrictEqual(files, ['a.gsm', path.join('sub', 'b.gsm')]);
});

test('findGsmFiles on a single file returns that file', () => {
  const root = makeLibrary();
  const single = path.join(root, 'a.gsm');
  const files = findGsmFiles(single);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].rel, 'a.gsm');
});

test('buildDestPath preserves relative structure under destDir', () => {
  const dest = buildDestPath('/out', path.join('sub', 'b.gsm'));
  assert.strictEqual(dest, path.join('/out', 'sub', 'b.gsm'));
});
