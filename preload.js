const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  listDevices: () => ipcRenderer.invoke('list-devices'),
  startScan: (deviceId, fileType) => ipcRenderer.invoke('start-scan', { deviceId, fileType }),
  chooseDestination: () => ipcRenderer.invoke('choose-destination'),
  recoverFiles: (files, destination) => ipcRenderer.invoke('recover-files', { files, destination })
})
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (event, theme) => callback(theme))
})