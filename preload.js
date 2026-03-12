const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Dispositivos e varredura
  listDevices: () => ipcRenderer.invoke('list-devices'),
  startScan: (deviceId, fileType) => ipcRenderer.invoke('start-scan', { deviceId, fileType }),
  chooseDestination: () => ipcRenderer.invoke('choose-destination'),
  recoverFiles: (files, destination) => ipcRenderer.invoke('recover-files', { files, destination }),

  // Páginas legais
  openLegal: (page) => ipcRenderer.invoke('open-legal', page),

  // Tema
  getTheme: () => ipcRenderer.invoke('get-theme'),
  toggleTheme: () => ipcRenderer.invoke('toggle-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (event, theme) => callback(theme))
})
