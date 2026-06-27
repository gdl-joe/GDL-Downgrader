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
