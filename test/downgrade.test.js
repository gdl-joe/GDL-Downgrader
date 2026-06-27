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

test('downgradeFile re-encrypts target with the same password (recompile)', async () => {
  const { run, calls } = makeRunner([
    { code: 0, output: 'ok' }, { code: 0, output: 'ok' }
  ]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  await downgradeFile({
    sourceConverter: AC29, targetConverter: AC24,
    sourcePath: '/src/a.gsm', destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp, runCommand: run, password: 'secret'
  });
  // Schritt 2 (xml2libpart) muss -password erhalten, damit der Schutz erhalten bleibt
  assert.ok(calls[1].args.includes('xml2libpart'));
  assert.ok(calls[1].args.includes('-password'));
  assert.ok(calls[1].args.includes('secret'));
});

test('downgradeFile does not pass -password to recompile when none given', async () => {
  const { run, calls } = makeRunner([
    { code: 0, output: 'ok' }, { code: 0, output: 'ok' }
  ]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  await downgradeFile({
    sourceConverter: AC29, targetConverter: AC24,
    sourcePath: '/src/a.gsm', destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp, runCommand: run
  });
  assert.ok(!calls[1].args.includes('-password'));
});

test('downgradeFile reports warnings for commands newer than the target version', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  // Fake-Runner schreibt beim Decompile ein temp.xml mit einem zu neuen Befehl
  const run = async (binPath, args) => {
    if (args.includes('libpart2xml')) {
      const tempXml = args[args.length - 1];
      fs.writeFileSync(tempXml, '<Script_3D><![CDATA[ MEPSYSTEM 1\nBLOCK 1,1,1 ]]></Script_3D>');
    }
    return { code: 0, output: 'ok' };
  };
  const result = await downgradeFile({
    sourceConverter: AC29, targetConverter: AC24,
    sourcePath: '/src/a.gsm', destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp, runCommand: run,
    commandVersions: { MEPSYSTEM: 27, BLOCK: 1 }
  });
  assert.strictEqual(result.status, 'success');
  assert.ok(result.warnings.some(w => w.command === 'MEPSYSTEM' && w.since === 27));
  assert.ok(!result.warnings.some(w => w.command === 'BLOCK'));
});

test('downgradeFile has empty warnings when no commandVersions given', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  const run = async (binPath, args) => {
    if (args.includes('libpart2xml')) {
      fs.writeFileSync(args[args.length - 1], '<Script_3D><![CDATA[ MEPSYSTEM 1 ]]></Script_3D>');
    }
    return { code: 0, output: 'ok' };
  };
  const result = await downgradeFile({
    sourceConverter: AC29, targetConverter: AC24,
    sourcePath: '/src/a.gsm', destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp, runCommand: run
  });
  assert.deepStrictEqual(result.warnings, []);
});

const { runBatch } = require('../lib/downgrade');

const CONVERTERS = [
  { version: 29, path: '/c/29', name: 'AC29' },
  { version: 24, path: '/c/24', name: 'AC24' }
];
const TARGET24 = { version: 24, path: '/c/24', name: 'AC24' };

test('runBatch processes all files and isolates failures', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'batchdst-'));
  // Fake-Runner: 'locked' im Pfad -> decrypt-Fehler, sonst Erfolg
  const run = async (binPath, args) => {
    const joined = args.join(' ');
    if (joined.includes('locked.gsm')) {
      return { code: 1, output: 'Could not decrypt library part (wrong password).' };
    }
    return { code: 0, output: 'ok' };
  };
  const files = [
    { abs: '/src/ok.gsm', rel: 'ok.gsm', sourceVersion: 29 },
    { abs: '/src/locked.gsm', rel: 'locked.gsm', sourceVersion: 29 }
  ];
  const results = await runBatch({
    files, converters: CONVERTERS, targetConverter: TARGET24,
    destDir: dest, tempRoot: tmpRoot, runCommand: run, passwords: {}
  });
  const byRel = Object.fromEntries(results.map(r => [r.rel, r.status]));
  assert.strictEqual(byRel['ok.gsm'], 'success');
  assert.strictEqual(byRel['locked.gsm'], 'password-required');
});

test('runBatch reports error when a file source version has no converter', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'batchx-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'batchxdst-'));
  const run = async () => ({ code: 0, output: 'ok' });
  const results = await runBatch({
    files: [{ abs: '/src/old.gsm', rel: 'old.gsm', sourceVersion: 99 }],
    converters: CONVERTERS, targetConverter: TARGET24,
    destDir: dest, tempRoot: tmpRoot, runCommand: run, passwords: {}
  });
  assert.strictEqual(results[0].status, 'error');
  assert.match(results[0].reason, /source converter/i);
});

test('runBatch uses per-file password from passwords map', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'batch2-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'batch2dst-'));
  let usedPassword = null;
  const run = async (binPath, args) => {
    const i = args.indexOf('-password');
    if (i >= 0) usedPassword = args[i + 1];
    return { code: 0, output: 'ok' };
  };
  await runBatch({
    files: [{ abs: '/src/x.gsm', rel: 'x.gsm', sourceVersion: 29 }],
    converters: CONVERTERS, targetConverter: TARGET24,
    destDir: dest, tempRoot: tmpRoot, runCommand: run,
    passwords: { 'x.gsm': 'pw123' }
  });
  assert.strictEqual(usedPassword, 'pw123');
});
