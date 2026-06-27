const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('node:fs');
const os = require('node:os');
const { scanConverters, detectGsmVersion } = require('./lib/converters');
const { findGsmFiles, runBatch } = require('./lib/downgrade');
const { runCommand } = require('./lib/run-command');

const TEMP_ROOT = path.join(os.homedir(), 'gdl_downgrade_temp');

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

// Startet den Batch; streamt Fortschritt über 'batch-progress' und Log über 'batch-log'.
// params: { files, targetConverterPath, destDir, passwords }
ipcMain.handle('run-downgrade', async (event, params) => {
  const { files, targetConverterPath, destDir, passwords } = params;
  const converters = scanConverters();
  const targetConverter = converters.find(c => c.path === targetConverterPath) || null;
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  const results = await runBatch({
    files,
    converters,
    targetConverter,
    destDir,
    tempRoot: TEMP_ROOT,
    runCommand: (bin, args) => runCommand(bin, args, (chunk) =>
      event.sender.send('batch-log', chunk)),
    passwords,
    onProgress: (p) => event.sender.send('batch-progress', p)
  });
  return results;
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
