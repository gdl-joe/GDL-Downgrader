const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('node:fs');
const os = require('node:os');
const { scanConverters, detectGsmVersion } = require('./lib/converters');
const { findGsmFiles, runBatch } = require('./lib/downgrade');
const { runCommand } = require('./lib/run-command');

const TEMP_ROOT = path.join(os.homedir(), 'gdl_downgrade_temp');

// Wissensbasis: GDL-Befehl -> ab welcher Archicad-Version verfügbar (pflegbare JSON).
let COMMAND_VERSIONS = {};
try {
  COMMAND_VERSIONS = require('./data/gdl-command-versions.json').commands || {};
} catch (e) {
  COMMAND_VERSIONS = {};
}

// Reste eines evtl. abgestürzten früheren Laufs beim Start entfernen.
try { fs.rmSync(TEMP_ROOT, { recursive: true, force: true }); } catch (e) { /* ignore */ }

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

  // Externe Links (Handbuch, GitHub) im Standard-Browser öffnen, nicht im App-Fenster.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

ipcMain.handle('scan-converters', () => scanConverters());

ipcMain.handle('get-version', () => app.getVersion());

// mode: 'file' -> einzelnes .gsm, 'folder' -> Verzeichnis.
// Getrennte Modi, weil der kombinierte openFile+openDirectory-Dialog auf Windows
// kein Verzeichnis auswählen lässt.
ipcMain.handle('select-source', async (event, mode) => {
  const options = mode === 'folder'
    ? { properties: ['openDirectory'] }
    : { properties: ['openFile'], filters: [{ name: 'GDL Object', extensions: ['gsm'] }] };
  const r = await dialog.showOpenDialog(mainWindow, options);
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

// Startet den Batch; streamt Fortschritt über 'batch-progress' und Log über 'batch-log'.
// params: { files, targetConverterPath, destDir, passwords }
ipcMain.handle('run-downgrade', async (event, params) => {
  const { files, targetConverterPath, destDir, passwords } = params;
  const converters = scanConverters();
  const targetConverter = converters.find(c => c.path === targetConverterPath) || null;
  // Klarer Abbruch statt stiller Fehlschlag jeder Datei, falls der gewählte
  // Ziel-Converter nicht (mehr) gefunden wird.
  if (!targetConverter) {
    return [{ rel: '—', status: 'error', reason: `Ziel-Converter nicht gefunden: ${targetConverterPath}` }];
  }
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  try {
    const results = await runBatch({
      files,
      converters,
      targetConverter,
      destDir,
      tempRoot: TEMP_ROOT,
      runCommand: (bin, args) => runCommand(bin, args, (chunk) =>
        event.sender.send('batch-log', chunk)),
      passwords,
      commandVersions: COMMAND_VERSIONS,
      onProgress: (p) => event.sender.send('batch-progress', p)
    });
    return results;
  } finally {
    // TEMP_ROOT nach dem Lauf entfernen (per-file-Workdirs sind bereits weg).
    try { fs.rmSync(TEMP_ROOT, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
});

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
