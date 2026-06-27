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

const { downgradeFile, PASSWORD_ERROR_MARKER } = require('../lib/downgrade');

const AC29 = { version: 29, path: '/conv/ac29', name: 'AC29' };
const AC24 = { version: 24, path: '/conv/ac24', name: 'AC24' };

// Fake-Runner: zeichnet Aufrufe auf, liefert vorgegebene Ergebnisse
function makeRunner(script) {
  const calls = [];
  const run = async (binPath, args) => {
    calls.push({ binPath, args });
    return script.shift();
  };
  return { run, calls };
}

test('downgradeFile decompiles with source converter and recompiles with target', async () => {
  const { run, calls } = makeRunner([
    { code: 0, output: 'ok' },   // decompile
    { code: 0, output: 'ok' }    // recompile
  ]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  const result = await downgradeFile({
    sourceConverter: AC29,
    targetConverter: AC24,
    sourcePath: '/src/a.gsm',
    destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp,
    runCommand: run
  });
  assert.strictEqual(result.status, 'success');
  // Schritt 1: AC29-Converter mit -compatibility 24
  assert.strictEqual(calls[0].binPath, '/conv/ac29');
  assert.ok(calls[0].args.includes('libpart2xml'));
  assert.ok(calls[0].args.includes('-compatibility'));
  assert.ok(calls[0].args.includes('24'));
  // Schritt 2: AC24-Converter
  assert.strictEqual(calls[1].binPath, '/conv/ac24');
  assert.ok(calls[1].args.includes('xml2libpart'));
});

test('downgradeFile reports password-required on decrypt error', async () => {
  const { run } = makeRunner([
    { code: 1, output: 'error: Could not decrypt library part (wrong password).' }
  ]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  const result = await downgradeFile({
    sourceConverter: AC29, targetConverter: AC24,
    sourcePath: '/src/a.gsm', destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp, runCommand: run
  });
  assert.strictEqual(result.status, 'password-required');
});

test('downgradeFile reports error when source converter missing', async () => {
  const { run } = makeRunner([]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  const result = await downgradeFile({
    sourceConverter: null, targetConverter: AC24,
    sourcePath: '/src/a.gsm', destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp, runCommand: run
  });
  assert.strictEqual(result.status, 'error');
  assert.match(result.reason, /source converter/i);
});

test('downgradeFile passes password to decompile when given', async () => {
  const { run, calls } = makeRunner([
    { code: 0, output: 'ok' }, { code: 0, output: 'ok' }
  ]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  await downgradeFile({
    sourceConverter: AC29, targetConverter: AC24,
    sourcePath: '/src/a.gsm', destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp, runCommand: run, password: 'secret'
  });
  assert.ok(calls[0].args.includes('-password'));
  assert.ok(calls[0].args.includes('secret'));
});
