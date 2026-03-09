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

// Expor variáveis de ambiente seguras para o renderer (sem expor segredos)
contextBridge.exposeInMainWorld('__ENV__', {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  API_URL: process.env.API_URL || 'http://localhost:3001'
})
