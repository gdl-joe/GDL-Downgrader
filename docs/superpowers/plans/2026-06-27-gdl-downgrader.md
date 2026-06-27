# GDL-Downgrader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine plattformübergreifende Electron-App (macOS + Windows), die GDL-Objekte (.gsm) per LP_XMLConverter von einer höheren in eine tiefere Archicad-Version downgraded — einzeln oder als rekursives Verzeichnis, mit automatischer Quellversionserkennung und Passwort-Handling.

**Architecture:** Reines Electron + Vanilla-JS (kein Build-Schritt). Die Engine-Logik liegt in zwei reinen Node-Modulen (`lib/converters.js`, `lib/downgrade.js`), die ohne echten Converter testbar sind (Command-Runner wird injiziert). `main.js` ist dünnes IPC-Routing, `renderer.js` die UI-Logik. Pro Objekt zwei Converter: Quellversion decompiliert mit `-compatibility <ziel>`, Zielversion recompiliert.

**Tech Stack:** Electron 31, Node `node:test` (eingebauter Test-Runner, kein jest/Build), electron-builder (DMG für macOS, NSIS für Windows), Vanilla HTML/CSS/JS, gdlschmiede.de-Dark-Theme.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `package.json` | Electron-Deps, Scripts (`start`, `test`, `dist`), electron-builder-Config |
| `main.js` | Electron-Lifecycle + IPC-Routing (dünn, keine Geschäftslogik) |
| `preload.js` | contextBridge — minimale, sichere IPC-API für den Renderer |
| `lib/converters.js` | `mapVersionCode`, `detectGsmVersion`, `scanConverters`, `findConverter` |
| `lib/downgrade.js` | `findGsmFiles`, `buildDestPath`, `downgradeFile`, `runBatch` |
| `lib/run-command.js` | Echter spawn-basierter Command-Runner (Produktion) |
| `index.html` | UI-Struktur (7-Schritt-Flow) |
| `styles.css` | Dark-Theme nach gdlschmiede.de |
| `renderer.js` | UI-State + Flow, ruft IPC auf |
| `test/converters.test.js` | Unit-Tests für `lib/converters.js` |
| `test/downgrade.test.js` | Unit-Tests für `lib/downgrade.js` |
| `test/fixtures/` | Fake-GSM-Header-Bytes + Fake-Converter-Verzeichnisbäume |

---

## Task 1: Projekt-Setup & Electron-Grundgerüst

**Files:**
- Create: `package.json`, `main.js`, `preload.js`, `index.html`, `styles.css`, `renderer.js`, `.gitignore`

- [ ] **Step 1: Git-Repo initialisieren**

```bash
cd /Users/Jochen/Sites/localhost/GDL-Downgrader
git init
```

- [ ] **Step 2: `.gitignore` anlegen**

```
node_modules/
dist/
.DS_Store
~/gdl_downgrade_temp/
```

- [ ] **Step 3: `package.json` schreiben**

```json
{
  "name": "gdl-downgrader",
  "version": "1.0.0",
  "description": "Downgrade Archicad GDL objects (.gsm) to a lower Archicad version via LP_XMLConverter",
  "main": "main.js",
  "author": "b-prisma / Jochen Sühlo",
  "license": "MIT",
  "scripts": {
    "start": "electron .",
    "test": "node --test",
    "dist": "electron-builder"
  },
  "devDependencies": {
    "electron": "^31.0.0",
    "electron-builder": "^26.0.0"
  },
  "build": {
    "appId": "de.b-prisma.gdl-downgrader",
    "productName": "GDL Downgrader",
    "files": ["main.js", "preload.js", "renderer.js", "index.html", "styles.css", "lib/**/*", "package.json"],
    "mac": { "target": "dmg", "category": "public.app-category.developer-tools" },
    "win": { "target": "nsis" }
  }
}
```

- [ ] **Step 4: Minimales `main.js` (lädt Fenster, noch ohne IPC)**

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 820,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e2430',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

module.exports = { getMainWindow: () => mainWindow };
```

- [ ] **Step 5: Minimales `preload.js` (Platzhalter, wird in Task 8 gefüllt)**

```javascript
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('api', {});
```

- [ ] **Step 6: Minimales `index.html`, `styles.css`, `renderer.js`**

`index.html`:
```html
<!DOCTYPE html>
<html lang="de" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <title>GDL Downgrader</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>GDL Downgrader</h1>
  <script src="renderer.js"></script>
</body>
</html>
```

`styles.css`:
```css
body { background: #1e2430; color: #dde3ec; font-family: sans-serif; }
```

`renderer.js`:
```javascript
console.log('renderer loaded');
```

- [ ] **Step 7: App starten und Fenster prüfen**

Run: `npm install && npm start`
Expected: Ein dunkles Fenster mit Titel "GDL Downgrader" öffnet sich. Schließen.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Electron app shell"
```

---

## Task 2: Versions-Mapping (`mapVersionCode`)

**Files:**
- Create: `lib/converters.js`
- Test: `test/converters.test.js`

- [ ] **Step 1: Failing test schreiben**

`test/converters.test.js`:
```javascript
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
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/converters'`

- [ ] **Step 3: `lib/converters.js` mit `mapVersionCode` (aus GDL-XML-main übernommen)**

```javascript
'use strict';

function mapVersionCode(code) {
  if (code >= 43) return code - 18; // 43->25 ... 47->29 ...
  if (code === 41) return 24;
  if (code === 40) return 23;
  if (code === 39) return 22;
  if (code === 38) return 21;
  if (code === 37) return 20;
  if (code === 36) return 19;
  if (code === 35) return 18;
  if (code === 34) return 17;
  if (code === 32) return 16;
  return null;
}

module.exports = { mapVersionCode };
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add lib/converters.js test/converters.test.js
git commit -m "feat: add version code mapping"
```

---

## Task 3: GSM-Header-Versionserkennung (`detectGsmVersion`)

**Files:**
- Modify: `lib/converters.js`
- Test: `test/converters.test.js`
- Create: `test/fixtures/` (Helper für Fake-GSM-Dateien)

- [ ] **Step 1: Failing test schreiben (am Ende von `test/converters.test.js` anhängen)**

```javascript
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { detectGsmVersion } = require('../lib/converters');

function writeFakeGsm(versionByte) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-fixture-'));
  const file = path.join(dir, 'test.gsm');
  // GSM-Header: Byte 0/1 = 'm''m' (0x6d) Magic, Byte 2 = Versionscode
  const buf = Buffer.from([0x6d, 0x6d, versionByte, 0x00, 0, 0, 0, 0]);
  fs.writeFileSync(file, buf);
  return file;
}

test('detectGsmVersion reads AC29 (code 47) from header', () => {
  const file = writeFakeGsm(47);
  assert.strictEqual(detectGsmVersion(file), 29);
});

test('detectGsmVersion reads AC24 (code 41) from header', () => {
  const file = writeFakeGsm(41);
  assert.strictEqual(detectGsmVersion(file), 24);
});

test('detectGsmVersion returns null for non-GSM magic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-bad-'));
  const file = path.join(dir, 'bad.gsm');
  fs.writeFileSync(file, Buffer.from([0x00, 0x00, 47, 0, 0, 0, 0, 0]));
  assert.strictEqual(detectGsmVersion(file), null);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npm test`
Expected: FAIL — `detectGsmVersion is not a function`

- [ ] **Step 3: `detectGsmVersion` implementieren (Logik aus GDL-XML-main)**

In `lib/converters.js` ergänzen (vor `module.exports`):
```javascript
const fs = require('node:fs');

function detectGsmVersion(gsmPath) {
  try {
    const fd = fs.openSync(gsmPath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    // Magic: 'mm' (0x6d6d) oder 'WW' (0x5757)
    if ((buffer[0] === 0x6d && buffer[1] === 0x6d) ||
        (buffer[0] === 0x57 && buffer[1] === 0x57)) {
      return mapVersionCode(buffer[2]);
    }
  } catch (err) {
    return null;
  }
  return null;
}
```

Und `module.exports` erweitern:
```javascript
module.exports = { mapVersionCode, detectGsmVersion };
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test`
Expected: PASS (6 Tests)

- [ ] **Step 5: Commit**

```bash
git add lib/converters.js test/converters.test.js
git commit -m "feat: detect GSM source version from header"
```

---

## Task 4: Converter-Scan (macOS + Windows)

**Files:**
- Modify: `lib/converters.js`
- Test: `test/converters.test.js`

Der Scan ist plattformabhängig. Um testbar zu sein, bekommt `scanConverters` die zu durchsuchenden Basisverzeichnisse und die Plattform als Parameter injiziert (Default = echte Werte).

- [ ] **Step 1: Failing test schreiben (anhängen)**

```javascript
const { scanConverters, findConverter } = require('../lib/converters');

function makeMacConverterTree() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'graphisoft-'));
  // base/AC29/Archicad 29.app/Contents/MacOS/LP_XMLConverter.app/Contents/MacOS/LP_XMLConverter
  const conv = path.join(base, 'AC29', 'Archicad 29.app', 'Contents', 'MacOS',
    'LP_XMLConverter.app', 'Contents', 'MacOS');
  fs.mkdirSync(conv, { recursive: true });
  fs.writeFileSync(path.join(conv, 'LP_XMLConverter'), '');
  const conv24 = path.join(base, 'AC24', 'Archicad 24.app', 'Contents', 'MacOS',
    'LP_XMLConverter.app', 'Contents', 'MacOS');
  fs.mkdirSync(conv24, { recursive: true });
  fs.writeFileSync(path.join(conv24, 'LP_XMLConverter'), '');
  return base;
}

test('scanConverters finds mac converters sorted descending', () => {
  const base = makeMacConverterTree();
  const result = scanConverters('darwin', [base]);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].version, 29);
  assert.strictEqual(result[1].version, 24);
  assert.ok(result[0].path.endsWith('LP_XMLConverter'));
});

test('findConverter returns the converter for a given version', () => {
  const base = makeMacConverterTree();
  const list = scanConverters('darwin', [base]);
  assert.strictEqual(findConverter(list, 24).version, 24);
  assert.strictEqual(findConverter(list, 99), null);
});

test('scanConverters returns empty array when base dir missing', () => {
  assert.deepStrictEqual(scanConverters('darwin', ['/nonexistent/xyz']), []);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npm test`
Expected: FAIL — `scanConverters is not a function`

- [ ] **Step 3: `scanConverters` + `findConverter` implementieren**

In `lib/converters.js` ergänzen:
```javascript
const pathMod = require('node:path');

// Default-Basisverzeichnisse je Plattform
function defaultBaseDirs(platform) {
  if (platform === 'win32') {
    return ['C:\\Program Files\\GRAPHISOFT', 'C:\\Program Files\\Graphisoft'];
  }
  return ['/Applications/GRAPHISOFT'];
}

// Baut den erwarteten Converter-Pfad innerhalb eines Archicad-App-Ordners
function macConverterPath(appDir) {
  return pathMod.join(appDir, 'Contents', 'MacOS',
    'LP_XMLConverter.app', 'Contents', 'MacOS', 'LP_XMLConverter');
}

function scanConverters(platform = process.platform, baseDirs = null) {
  const bases = baseDirs || defaultBaseDirs(platform);
  const found = [];

  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    let subdirs;
    try { subdirs = fs.readdirSync(base); } catch (e) { continue; }

    for (const subdir of subdirs) {
      const subPath = pathMod.join(base, subdir);
      let stat;
      try { stat = fs.statSync(subPath); } catch (e) { continue; }
      if (!stat.isDirectory()) continue;

      const verMatch = subdir.match(/\d+/);
      const version = verMatch ? parseInt(verMatch[0], 10) : null;

      if (platform === 'win32') {
        // Windows: LP_XMLConverter.exe direkt im Versionsordner (zu verifizieren)
        const exe = pathMod.join(subPath, 'LP_XMLConverter.exe');
        if (fs.existsSync(exe) && version) {
          found.push({ name: subdir, version, path: exe });
        }
      } else {
        // macOS: ein oder mehrere .app im Versionsordner durchsuchen
        let inner;
        try { inner = fs.readdirSync(subPath); } catch (e) { continue; }
        for (const file of inner) {
          if (file.toLowerCase().endsWith('.app') &&
              file.toLowerCase().includes('archicad')) {
            const convPath = macConverterPath(pathMod.join(subPath, file));
            if (fs.existsSync(convPath)) {
              const v = version || (file.match(/\d+/) ? parseInt(file.match(/\d+/)[0], 10) : null);
              found.push({ name: subdir, version: v, path: convPath });
            }
          }
        }
      }
    }
  }
  return found.sort((a, b) => (b.version || 0) - (a.version || 0));
}

function findConverter(list, version) {
  return list.find(c => c.version === version) || null;
}
```

`module.exports` erweitern:
```javascript
module.exports = { mapVersionCode, detectGsmVersion, scanConverters, findConverter, defaultBaseDirs };
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test`
Expected: PASS (9 Tests)

- [ ] **Step 5: Commit**

```bash
git add lib/converters.js test/converters.test.js
git commit -m "feat: scan installed LP_XMLConverters cross-platform"
```

---

## Task 5: Datei-Discovery & Ziel-Pfad-Aufbau

**Files:**
- Create: `lib/downgrade.js`
- Test: `test/downgrade.test.js`

- [ ] **Step 1: Failing test schreiben**

`test/downgrade.test.js`:
```javascript
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
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/downgrade'`

- [ ] **Step 3: `findGsmFiles` + `buildDestPath` implementieren**

`lib/downgrade.js`:
```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Liefert [{ abs, rel }] für alle .gsm unter rootPath (rekursiv).
// rootPath darf eine einzelne .gsm-Datei oder ein Verzeichnis sein.
function findGsmFiles(rootPath) {
  const stat = fs.statSync(rootPath);
  if (stat.isFile()) {
    if (rootPath.toLowerCase().endsWith('.gsm')) {
      return [{ abs: rootPath, rel: path.basename(rootPath) }];
    }
    return [];
  }
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gsm')) {
        results.push({ abs, rel: path.relative(rootPath, abs) });
      }
    }
  }
  walk(rootPath);
  return results;
}

function buildDestPath(destDir, rel) {
  return path.join(destDir, rel);
}

module.exports = { findGsmFiles, buildDestPath };
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test`
Expected: PASS (12 Tests gesamt)

- [ ] **Step 5: Commit**

```bash
git add lib/downgrade.js test/downgrade.test.js
git commit -m "feat: recursive .gsm discovery with structure-preserving dest paths"
```

---

## Task 6: Downgrade einer einzelnen Datei (mit injiziertem Command-Runner)

**Files:**
- Modify: `lib/downgrade.js`
- Test: `test/downgrade.test.js`

`downgradeFile` bekommt einen `runCommand(binPath, args)`-Callback injiziert, der `{ code, output }` (Promise) liefert. Im Test ist das ein Fake, in Produktion der echte spawn-Runner (Task 7b).

- [ ] **Step 1: Failing test schreiben (anhängen)**

```javascript
const { downgradeFile, PASSWORD_ERROR_MARKER } = require('../lib/downgrade');

function fakeConverters() {
  return [
    { version: 29, path: '/conv/ac29' },
    { version: 24, path: '/conv/ac24' }
  ];
}

// Fake-Runner, der aufgezeichnete Aufrufe und vorgegebene Ergebnisse nutzt
function makeRunner(script) {
  const calls = [];
  const run = async (binPath, args) => {
    calls.push({ binPath, args });
    const step = script.shift();
    return step;
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
    converters: fakeConverters(),
    sourcePath: '/src/a.gsm',
    sourceVersion: 29,
    targetVersion: 24,
    destPath: path.join(tmp, 'a.gsm'),
    tempRoot: tmp,
    runCommand: run
  });
  assert.strictEqual(result.status, 'success');
  // Schritt 1 nutzt AC29-Converter mit -compatibility 24
  assert.strictEqual(calls[0].binPath, '/conv/ac29');
  assert.ok(calls[0].args.includes('-compatibility'));
  assert.ok(calls[0].args.includes('24'));
  // Schritt 2 nutzt AC24-Converter
  assert.strictEqual(calls[1].binPath, '/conv/ac24');
  assert.ok(calls[1].args.includes('xml2libpart'));
});

test('downgradeFile reports password-required on decrypt error', async () => {
  const { run } = makeRunner([
    { code: 1, output: 'error: Could not decrypt library part (wrong password).' }
  ]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  const result = await downgradeFile({
    converters: fakeConverters(),
    sourcePath: '/src/a.gsm', sourceVersion: 29, targetVersion: 24,
    destPath: path.join(tmp, 'a.gsm'), tempRoot: tmp, runCommand: run
  });
  assert.strictEqual(result.status, 'password-required');
});

test('downgradeFile reports missing source converter', async () => {
  const { run } = makeRunner([]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  const result = await downgradeFile({
    converters: [{ version: 24, path: '/conv/ac24' }],
    sourcePath: '/src/a.gsm', sourceVersion: 29, targetVersion: 24,
    destPath: path.join(tmp, 'a.gsm'), tempRoot: tmp, runCommand: run
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
    converters: fakeConverters(),
    sourcePath: '/src/a.gsm', sourceVersion: 29, targetVersion: 24,
    destPath: path.join(tmp, 'a.gsm'), tempRoot: tmp, runCommand: run,
    password: 'secret'
  });
  assert.ok(calls[0].args.includes('-password'));
  assert.ok(calls[0].args.includes('secret'));
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npm test`
Expected: FAIL — `downgradeFile is not a function`

- [ ] **Step 3: `downgradeFile` implementieren**

In `lib/downgrade.js` ergänzen:
```javascript
const { findConverter } = require('./converters');

const PASSWORD_ERROR_MARKER = 'Could not decrypt library part';

// Konvertiert eine einzelne .gsm-Datei in die Zielversion.
// opts: { converters, sourcePath, sourceVersion, targetVersion, destPath,
//         tempRoot, runCommand, password? }
async function downgradeFile(opts) {
  const {
    converters, sourcePath, sourceVersion, targetVersion,
    destPath, tempRoot, runCommand, password
  } = opts;

  const sourceConv = findConverter(converters, sourceVersion);
  if (!sourceConv) {
    return { status: 'error', reason: `source converter for AC${sourceVersion} not installed` };
  }
  const targetConv = findConverter(converters, targetVersion);
  if (!targetConv) {
    return { status: 'error', reason: `target converter for AC${targetVersion} not installed` };
  }

  const work = fs.mkdtempSync(path.join(tempRoot, 'work-'));
  const tempXml = path.join(work, 'temp.xml');
  const tempImg = path.join(work, 'images');
  fs.mkdirSync(tempImg, { recursive: true });

  try {
    // Schritt 1: Decompile mit Quell-Converter + -compatibility <ziel>
    const decArgs = ['libpart2xml', '-compatibility', String(targetVersion), '-img', tempImg];
    if (password) decArgs.push('-password', password);
    decArgs.push(sourcePath, tempXml);
    const dec = await runCommand(sourceConv.path, decArgs);
    if (dec.code !== 0) {
      if (dec.output && dec.output.includes(PASSWORD_ERROR_MARKER)) {
        return { status: 'password-required', log: dec.output };
      }
      return { status: 'error', reason: 'decompile failed', log: dec.output };
    }

    // Schritt 2: Recompile mit Ziel-Converter
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const compArgs = ['xml2libpart', '-img', tempImg, tempXml, destPath];
    const comp = await runCommand(targetConv.path, compArgs);
    if (comp.code !== 0) {
      return { status: 'error', reason: 'recompile failed', log: comp.output };
    }
    return { status: 'success', destPath };
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
}
```

`module.exports` erweitern:
```javascript
module.exports = { findGsmFiles, buildDestPath, downgradeFile, PASSWORD_ERROR_MARKER };
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test`
Expected: PASS (16 Tests gesamt)

- [ ] **Step 5: Commit**

```bash
git add lib/downgrade.js test/downgrade.test.js
git commit -m "feat: single-file downgrade with password detection"
```

---

## Task 7: Batch-Orchestrierung & echter Command-Runner

**Files:**
- Modify: `lib/downgrade.js`
- Create: `lib/run-command.js`
- Test: `test/downgrade.test.js`

- [ ] **Step 1: Failing test für `runBatch` schreiben (anhängen)**

```javascript
const { runBatch } = require('../lib/downgrade');

test('runBatch processes all files and isolates failures', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-'));
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'batchsrc-'));
  fs.writeFileSync(path.join(src, 'ok.gsm'), '');
  fs.writeFileSync(path.join(src, 'locked.gsm'), '');
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
    { abs: path.join(src, 'ok.gsm'), rel: 'ok.gsm', sourceVersion: 29 },
    { abs: path.join(src, 'locked.gsm'), rel: 'locked.gsm', sourceVersion: 29 }
  ];

  const results = await runBatch({
    files,
    converters: [{ version: 29, path: '/c/29' }, { version: 24, path: '/c/24' }],
    targetVersion: 24,
    destDir: dest,
    tempRoot: tmpRoot,
    runCommand: run,
    passwords: {}
  });

  const byRel = Object.fromEntries(results.map(r => [r.rel, r.status]));
  assert.strictEqual(byRel['ok.gsm'], 'success');
  assert.strictEqual(byRel['locked.gsm'], 'password-required');
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
    converters: [{ version: 29, path: '/c/29' }, { version: 24, path: '/c/24' }],
    targetVersion: 24, destDir: dest, tempRoot: tmpRoot, runCommand: run,
    passwords: { 'x.gsm': 'pw123' }
  });
  assert.strictEqual(usedPassword, 'pw123');
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npm test`
Expected: FAIL — `runBatch is not a function`

- [ ] **Step 3: `runBatch` implementieren**

In `lib/downgrade.js` ergänzen:
```javascript
// Verarbeitet eine Liste von Dateien sequenziell, isoliert Fehler pro Datei.
// opts: { files:[{abs,rel,sourceVersion}], converters, targetVersion, destDir,
//         tempRoot, runCommand, passwords:{rel->pw}, onProgress? }
async function runBatch(opts) {
  const {
    files, converters, targetVersion, destDir, tempRoot,
    runCommand, passwords = {}, onProgress
  } = opts;

  fs.mkdirSync(tempRoot, { recursive: true });
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (onProgress) onProgress({ index: i, total: files.length, rel: f.rel, phase: 'start' });
    let res;
    try {
      res = await downgradeFile({
        converters,
        sourcePath: f.abs,
        sourceVersion: f.sourceVersion,
        targetVersion,
        destPath: buildDestPath(destDir, f.rel),
        tempRoot,
        runCommand,
        password: passwords[f.rel]
      });
    } catch (err) {
      res = { status: 'error', reason: err.message };
    }
    const entry = { rel: f.rel, ...res };
    results.push(entry);
    if (onProgress) onProgress({ index: i, total: files.length, rel: f.rel, phase: 'done', status: entry.status });
  }
  return results;
}
```

`module.exports` erweitern:
```javascript
module.exports = { findGsmFiles, buildDestPath, downgradeFile, runBatch, PASSWORD_ERROR_MARKER };
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test`
Expected: PASS (18 Tests gesamt)

- [ ] **Step 5: Echten Command-Runner `lib/run-command.js` schreiben**

```javascript
'use strict';

const { spawn } = require('node:child_process');

// Führt einen Befehl aus und liefert { code, output } (stdout+stderr kombiniert).
// onData(chunk) optional für Live-Log-Streaming.
function runCommand(binPath, args, onData) {
  return new Promise((resolve) => {
    let output = '';
    const proc = spawn(binPath, args);
    proc.stdout.on('data', (d) => { const s = d.toString(); output += s; if (onData) onData(s); });
    proc.stderr.on('data', (d) => { const s = d.toString(); output += s; if (onData) onData(s); });
    proc.on('close', (code) => resolve({ code, output }));
    proc.on('error', (err) => resolve({ code: -1, output: `Process error: ${err.message}` }));
  });
}

module.exports = { runCommand };
```

- [ ] **Step 6: Commit**

```bash
git add lib/downgrade.js lib/run-command.js test/downgrade.test.js
git commit -m "feat: batch orchestration and real spawn-based command runner"
```

---

## Task 8: IPC-Verdrahtung (main.js + preload.js)

**Files:**
- Modify: `main.js`, `preload.js`

- [ ] **Step 1: `main.js` um IPC-Handler erweitern**

Oben ergänzen:
```javascript
const { ipcMain, dialog } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const { scanConverters, detectGsmVersion } = require('./lib/converters');
const { findGsmFiles, runBatch } = require('./lib/downgrade');
const { runCommand } = require('./lib/run-command');

const TEMP_ROOT = path.join(os.homedir(), 'gdl_downgrade_temp');
```

Nach `createWindow` die Handler hinzufügen:
```javascript
ipcMain.handle('scan-converters', () => scanConverters());

ipcMain.handle('select-source', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'openDirectory'],
    filters: [{ name: 'GDL Object', extensions: ['gsm'] }]
  });
  return r.filePaths[0] || null;
});

ipcMain.handle('select-dest', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  return r.filePaths[0] || null;
});

// Analysiert die Quelle: Liste aller .gsm mit erkannter Quellversion
ipcMain.handle('analyze-source', (event, sourcePath) => {
  const files = findGsmFiles(sourcePath);
  return files.map(f => ({
    abs: f.abs,
    rel: f.rel,
    sourceVersion: detectGsmVersion(f.abs)
  }));
});

// Startet den Batch; streamt Fortschritt über 'batch-progress'
ipcMain.handle('run-downgrade', async (event, params) => {
  const { files, targetVersion, destDir, passwords } = params;
  const converters = scanConverters();
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  const results = await runBatch({
    files, converters, targetVersion, destDir,
    tempRoot: TEMP_ROOT,
    runCommand: (bin, args) => runCommand(bin, args, (chunk) =>
      event.sender.send('batch-log', chunk)),
    passwords,
    onProgress: (p) => event.sender.send('batch-progress', p)
  });
  return results;
});
```

- [ ] **Step 2: `preload.js` mit der IPC-API füllen**

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scanConverters: () => ipcRenderer.invoke('scan-converters'),
  selectSource: () => ipcRenderer.invoke('select-source'),
  selectDest: () => ipcRenderer.invoke('select-dest'),
  analyzeSource: (p) => ipcRenderer.invoke('analyze-source', p),
  runDowngrade: (params) => ipcRenderer.invoke('run-downgrade', params),
  onProgress: (cb) => ipcRenderer.on('batch-progress', (e, d) => cb(d)),
  onLog: (cb) => ipcRenderer.on('batch-log', (e, d) => cb(d))
});
```

- [ ] **Step 3: App starten, Smoke-Test in DevTools-Konsole**

Run: `npm start`, dann DevTools öffnen, in Konsole: `await window.api.scanConverters()`
Expected: Array der installierten Converter (auf Jochens Rechner mind. AC28).

- [ ] **Step 4: Commit**

```bash
git add main.js preload.js
git commit -m "feat: wire IPC between main process and renderer"
```

---

## Task 9: UI-Struktur & gdlschmiede-Dark-Theme

**Files:**
- Modify: `index.html`, `styles.css`

- [ ] **Step 1: `index.html` mit dem 7-Schritt-Flow aufbauen**

```html
<!DOCTYPE html>
<html lang="de" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <title>GDL Downgrader</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="app-header">
    <span class="logo-mark"></span>
    <h1>GDL <span class="accent">Downgrader</span></h1>
  </header>

  <main class="container">
    <!-- 1. Quelle -->
    <section class="card">
      <div class="section-label">1 · Quelle</div>
      <button id="btn-source" class="btn-secondary">Objekt oder Ordner wählen…</button>
      <div id="source-path" class="path-display"></div>
    </section>

    <!-- 2. Analyse-Tabelle -->
    <section class="card" id="analysis-card" hidden>
      <div class="section-label">2 · Gefundene Objekte</div>
      <table id="analysis-table">
        <thead><tr><th>Objekt</th><th>Quellversion</th><th>Status</th></tr></thead>
        <tbody></tbody>
      </table>
    </section>

    <!-- 3. Zielversion + 4. Zielverzeichnis -->
    <section class="card row">
      <div>
        <div class="section-label">3 · Zielversion</div>
        <select id="target-version"></select>
      </div>
      <div>
        <div class="section-label">4 · Zielverzeichnis</div>
        <button id="btn-dest" class="btn-secondary">Ordner wählen…</button>
        <div id="dest-path" class="path-display"></div>
      </div>
    </section>

    <!-- 5. Passwörter -->
    <section class="card" id="password-card" hidden>
      <div class="section-label">5 · Passwortgeschützte Objekte 🔒</div>
      <div class="pw-bulk">
        <input type="password" id="pw-all" placeholder="Passwort für alle…">
        <button id="btn-apply-all" class="btn-secondary">Auf alle anwenden</button>
      </div>
      <div id="password-list"></div>
    </section>

    <!-- 6. Start + Log -->
    <section class="card">
      <button id="btn-start" class="btn-primary" disabled>Downgrade starten</button>
      <div class="progress-wrap"><div id="progress-bar"></div></div>
      <div class="code-window">
        <div class="code-titlebar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
        </div>
        <pre id="log" class="code-body"></pre>
      </div>
    </section>

    <!-- 7. Zusammenfassung -->
    <section class="card" id="summary-card" hidden>
      <div class="section-label">7 · Ergebnis</div>
      <div id="summary"></div>
    </section>
  </main>

  <script src="renderer.js"></script>
</body>
</html>
```

- [ ] **Step 2: `styles.css` nach gdlschmiede.de schreiben**

```css
:root {
  --accent: #b8823a;
  --accent-light: #d4a05a;
  --accent-dark: #9a6a28;
  --radius: 10px;
  --transition: .22s ease;
}
[data-theme="dark"] {
  --bg: #1e2430;
  --bg2: #252d3d;
  --bg3: #2d3649;
  --border: #374357;
  --text: #dde3ec;
  --text-muted: #8896aa;
  --code-bg: #181f2c;
  --shadow: 0 4px 24px rgba(0,0,0,.35);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.92rem;
  line-height: 1.6;
}
.app-header {
  display: flex; align-items: center; gap: .6rem;
  padding: 1rem 2rem; -webkit-app-region: drag;
  border-bottom: 1px solid var(--border); background: var(--bg2);
}
.app-header h1 { font-size: 1.2rem; margin: 0; font-weight: 700; }
.accent { color: var(--accent); }
.logo-mark {
  width: 28px; height: 28px; border-radius: 7px; background: var(--accent);
}
.container { max-width: 880px; margin: 0 auto; padding: 1.5rem 2rem 4rem; }
.card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.2rem 1.4rem; margin-bottom: 1.1rem;
}
.card.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.section-label {
  font-size: .72rem; font-weight: 600; letter-spacing: .1em;
  text-transform: uppercase; color: var(--text-muted); margin-bottom: .7rem;
}
.btn-primary, .btn-secondary {
  font-family: inherit; font-weight: 600; border-radius: 8px;
  padding: .6rem 1.3rem; cursor: pointer; border: 1px solid var(--border);
  transition: var(--transition);
}
.btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-primary:hover:not(:disabled) { background: var(--accent-dark); transform: translateY(-1px); }
.btn-primary:disabled { opacity: .4; cursor: not-allowed; }
.btn-secondary { background: var(--bg3); color: var(--text); }
.btn-secondary:hover { border-color: var(--accent); }
.path-display { margin-top: .5rem; color: var(--text-muted); font-size: .82rem; word-break: break-all; }
select, input[type="password"] {
  width: 100%; background: var(--bg3); color: var(--text);
  border: 1px solid var(--border); border-radius: 8px; padding: .55rem .7rem;
  font-family: inherit; font-size: .9rem;
}
table { width: 100%; border-collapse: collapse; font-size: .85rem; }
th { text-align: left; color: var(--text-muted); font-weight: 600; padding: .4rem .5rem; border-bottom: 1px solid var(--border); }
td { padding: .4rem .5rem; border-bottom: 1px solid var(--border); }
.status-ok { color: var(--accent-light); }
.status-warn { color: #e5c07b; }
.status-locked { color: #e06c75; }
.pw-bulk { display: flex; gap: .6rem; margin-bottom: .8rem; }
.pw-row { display: flex; gap: .6rem; align-items: center; margin-bottom: .4rem; }
.pw-row span { flex: 1; font-size: .82rem; }
.progress-wrap { height: 6px; background: var(--bg3); border-radius: 3px; margin: 1rem 0; overflow: hidden; }
#progress-bar { height: 100%; width: 0; background: var(--accent); transition: width .2s ease; }
.code-window { background: var(--code-bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.code-titlebar { display: flex; gap: .4rem; padding: .5rem .7rem; background: var(--bg3); border-bottom: 1px solid var(--border); }
.dot { width: 11px; height: 11px; border-radius: 50%; }
.dot-red { background: #ff5f57; } .dot-yellow { background: #febc2e; } .dot-green { background: #28c840; }
.code-body {
  margin: 0; padding: .8rem 1rem; max-height: 260px; overflow-y: auto;
  font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: .78rem;
  line-height: 1.7; color: var(--text); white-space: pre-wrap;
}
.summary-line { padding: .3rem 0; font-size: .85rem; }
```

- [ ] **Step 3: App starten, Layout visuell prüfen**

Run: `npm start`
Expected: Dunkles, gdlschmiede-ähnliches Layout mit Karten, Amber-Akzent, Code-Window. Buttons noch ohne Funktion.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: build UI structure with gdlschmiede dark theme"
```

---

## Task 10: Renderer-Logik & Flow

**Files:**
- Modify: `renderer.js`

- [ ] **Step 1: `renderer.js` mit State und Flow schreiben**

```javascript
'use strict';

const state = {
  sourcePath: null,
  destDir: null,
  files: [],          // [{abs, rel, sourceVersion}]
  converters: [],     // [{version, path, name}]
  passwords: {},      // rel -> pw
  lockedRels: []      // rel der passwortgeschützten Objekte
};

const $ = (id) => document.getElementById(id);

function log(text) {
  const el = $('log');
  el.textContent += text;
  el.scrollTop = el.scrollHeight;
}

async function init() {
  state.converters = await window.api.scanConverters();
  const sel = $('target-version');
  sel.innerHTML = '';
  // Nur installierte Versionen als Ziel anbieten (aufsteigend)
  [...state.converters].sort((a, b) => a.version - b.version).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.version;
    opt.textContent = `Archicad ${c.version}`;
    sel.appendChild(opt);
  });
  window.api.onLog((chunk) => log(chunk));
  window.api.onProgress((p) => {
    if (p.phase === 'done') {
      $('progress-bar').style.width = `${Math.round(((p.index + 1) / p.total) * 100)}%`;
    }
  });
}

function statusCell(f) {
  if (f.sourceVersion == null) return '<span class="status-warn">Version unbekannt</span>';
  const hasConv = state.converters.some(c => c.version === f.sourceVersion);
  if (!hasConv) return `<span class="status-warn">⚠ Converter AC${f.sourceVersion} fehlt</span>`;
  if (state.lockedRels.includes(f.rel)) return '<span class="status-locked">🔒 geschützt</span>';
  return '<span class="status-ok">✓ bereit</span>';
}

function renderAnalysis() {
  const tbody = $('analysis-table').querySelector('tbody');
  tbody.innerHTML = '';
  state.files.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${f.rel}</td>
      <td>${f.sourceVersion != null ? 'AC' + f.sourceVersion : '—'}</td>
      <td>${statusCell(f)}</td>`;
    tbody.appendChild(tr);
  });
  $('analysis-card').hidden = state.files.length === 0;
  updateStartButton();
}

function renderPasswordList() {
  const card = $('password-card');
  const list = $('password-list');
  list.innerHTML = '';
  if (state.lockedRels.length === 0) { card.hidden = true; return; }
  card.hidden = false;
  state.lockedRels.forEach(rel => {
    const row = document.createElement('div');
    row.className = 'pw-row';
    row.innerHTML = `<span>${rel}</span>
      <input type="password" data-rel="${rel}" placeholder="Passwort…">`;
    row.querySelector('input').addEventListener('input', (e) => {
      state.passwords[rel] = e.target.value;
    });
    list.appendChild(row);
  });
}

function updateStartButton() {
  $('btn-start').disabled = !(state.files.length && state.destDir);
}

$('btn-source').addEventListener('click', async () => {
  const p = await window.api.selectSource();
  if (!p) return;
  state.sourcePath = p;
  $('source-path').textContent = p;
  state.files = await window.api.analyzeSource(p);
  state.lockedRels = [];
  renderAnalysis();
});

$('btn-dest').addEventListener('click', async () => {
  const p = await window.api.selectDest();
  if (!p) return;
  state.destDir = p;
  $('dest-path').textContent = p;
  updateStartButton();
});

$('btn-apply-all').addEventListener('click', () => {
  const pw = $('pw-all').value;
  state.lockedRels.forEach(rel => { state.passwords[rel] = pw; });
  document.querySelectorAll('#password-list input').forEach(i => { i.value = pw; });
});

$('btn-start').addEventListener('click', async () => {
  $('btn-start').disabled = true;
  $('log').textContent = '';
  $('progress-bar').style.width = '0';
  const targetVersion = parseInt($('target-version').value, 10);
  const results = await window.api.runDowngrade({
    files: state.files,
    targetVersion,
    destDir: state.destDir,
    passwords: state.passwords
  });
  handleResults(results);
});

function handleResults(results) {
  // Passwortgeschützte Objekte einsammeln
  state.lockedRels = results.filter(r => r.status === 'password-required').map(r => r.rel);
  renderAnalysis();
  renderPasswordList();

  const summary = $('summary');
  summary.innerHTML = '';
  const ok = results.filter(r => r.status === 'success').length;
  const locked = state.lockedRels.length;
  const failed = results.filter(r => r.status === 'error').length;
  summary.innerHTML = `<div class="summary-line status-ok">✓ ${ok} erfolgreich</div>
    <div class="summary-line status-locked">🔒 ${locked} passwortgeschützt (Passwort eingeben und erneut starten)</div>
    <div class="summary-line status-warn">⚠ ${failed} fehlgeschlagen</div>`;
  results.filter(r => r.status === 'error').forEach(r => {
    const d = document.createElement('div');
    d.className = 'summary-line status-warn';
    d.textContent = `${r.rel}: ${r.reason || 'Fehler'}`;
    summary.appendChild(d);
  });
  $('summary-card').hidden = false;
  $('btn-start').disabled = false;
}

init();
```

- [ ] **Step 2: Voller Flow-Smoke-Test (ohne echte Konvertierung möglich, nur UI)**

Run: `npm start`
Expected: Quelle wählen zeigt Tabelle mit Versionen; Zielversion-Dropdown zeigt nur installierte Versionen; Zielverzeichnis aktiviert den Start-Button.

- [ ] **Step 3: Commit**

```bash
git add renderer.js
git commit -m "feat: renderer flow — analyze, target select, password handling, results"
```

---

## Task 11: Manuelle End-to-End-Verifikation & Distribution

**Files:**
- Modify: `package.json` (falls Build-Anpassungen nötig)
- Create: `README.md`

> **Verifikation braucht echte Archicad-Converter und echte Objekte — wird von Jochen durchgeführt.**

- [ ] **Step 1: Echter Downgrade eines ungeschützten Objekts**

Ein AC28-Objekt nach AC24 (oder eine andere auf dem Rechner installierte Zielversion) downgraden.
Expected: Zielobjekt entsteht im Zielverzeichnis, in Archicad/Ziel-Converter ladbar; Log zeigt beide Schritte (libpart2xml → xml2libpart) mit Exit-Code 0.

- [ ] **Step 2: Echter Downgrade eines passwortgeschützten Objekts (`Schematic3DModel.gsm`)**

Ohne Passwort starten.
Expected: Objekt erscheint als 🔒 in der Zusammenfassung, Passwortbereich öffnet sich.
Dann korrektes Passwort eingeben, erneut starten.
Expected: Erfolgreiche Konvertierung. (Mit falschem Passwort: bleibt 🔒.)

- [ ] **Step 3: Verzeichnis-Batch mit Unterordnern**

Einen Ordner mit .gsm in Unterordnern wählen.
Expected: Alle Objekte gefunden, Zielstruktur 1:1 nachgebaut, gemischte Quellversionen je Datei korrekt erkannt.

- [ ] **Step 4: `README.md` mit Kurzanleitung schreiben**

Inhalt: Zweck, Installation (DMG/Installer), Bedienung der 7 Schritte, Hinweis auf benötigte installierte Converter (Quell- UND Zielversion), Windows-Converter-Pfad-Hinweis.

- [ ] **Step 5: Distribution bauen**

Run (macOS): `npm run dist`
Expected: `dist/GDL Downgrader-1.0.0.dmg` entsteht.
Hinweis: Windows-Build (`nsis`) muss auf/für Windows gebaut werden; Cross-Build aus macOS nur eingeschränkt möglich.

- [ ] **Step 6: Commit**

```bash
git add README.md package.json
git commit -m "docs: add README and finalize distribution config"
```

---

## Self-Review-Ergebnis

**Spec-Abdeckung:**
- §2 Zwei-Converter-Downgrade → Task 6 ✓
- §3 Architektur/Modultrennung → Tasks 2–7 ✓
- §4 Converter-Scan Mac+Win + Versionserkennung → Tasks 3, 4 ✓
- §5 UI-Flow (7 Schritte) → Tasks 9, 10 ✓
- §6 Rekursiv + Struktur-Erhalt + Version pro Datei → Tasks 5, 10 ✓
- §7 Passwort-Erkennung (`Could not decrypt library part`) → Task 6 ✓
- §8 Fehlerisolation + Temp-Cleanup → Tasks 6, 7 ✓
- §9 Testing → Tasks 2–7 (Unit), Task 11 (manuell) ✓

**Offene Verifikationspunkte aus Spec §10:**
- Windows-Converter-Pfad → in Task 4 als Annahme implementiert, in Task 11 zu verifizieren.
- Passwort-Muster → bereits verifiziert, in Task 6 fest verdrahtet.
- Subkommando-Namen → Langform `libpart2xml`/`xml2libpart` verwendet (aus GDL-XML-main bestätigt).

**Typkonsistenz:** Converter-Objekt `{name, version, path}`, File-Objekt `{abs, rel, sourceVersion}`, Result `{rel, status, reason?, log?, destPath?}` — durchgängig identisch verwendet.
