const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  renderVideo: (scenes, outputFileName) => ipcRenderer.invoke('render-video', scenes, outputFileName),
  onRenderProgress: (callback) => ipcRenderer.on('render-progress', (_event, value) => callback(value)),
  selectFolder: () => ipcRenderer.invoke('select-folder')
});
