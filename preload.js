const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scanConverters: () => ipcRenderer.invoke('scan-converters'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  selectSource: (mode) => ipcRenderer.invoke('select-source', mode),
  selectDest: () => ipcRenderer.invoke('select-dest'),
  analyzeSource: (p) => ipcRenderer.invoke('analyze-source', p),
  confirmOverwrite: (params) => ipcRenderer.invoke('confirm-overwrite', params),
  runDowngrade: (params) => ipcRenderer.invoke('run-downgrade', params),
  // Vorherige Listener entfernen, damit ein Reload keine Listener akkumuliert
  // (sonst feuern Log/Progress mehrfach).
  onProgress: (cb) => {
    ipcRenderer.removeAllListeners('batch-progress');
    ipcRenderer.on('batch-progress', (e, d) => cb(d));
  },
  onLog: (cb) => {
    ipcRenderer.removeAllListeners('batch-log');
    ipcRenderer.on('batch-log', (e, d) => cb(d));
  }
});
