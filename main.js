const { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme } = require('electron')
const path = require('path')
const fs = require('fs')
const fsp = require('fs').promises
const { exec } = require('child_process')

let mainWindow
let currentTheme = null

function detectSystemTheme() {
  currentTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  return currentTheme
}
detectSystemTheme()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900, height: 600, resizable: true, maximizable: true,
    fullscreenable: true, center: true,
    icon: path.join(__dirname, 'images', 'FilesFy.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true
    }
  })
  mainWindow.loadFile(path.join(__dirname, 'electron.html'))
  mainWindow.maximize()
  mainWindow.on('closed', () => { mainWindow = null })
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark'
  if (mainWindow) mainWindow.webContents.send('theme-changed', currentTheme)
  return currentTheme
}
function getCurrentTheme() { return currentTheme }
function setTheme(theme) {
  if (theme === 'dark' || theme === 'light') {
    currentTheme = theme
    if (mainWindow) mainWindow.webContents.send('theme-changed', currentTheme)
  }
  return currentTheme
}

function createMenu() {
  const template = [
    { label: 'Arquivo', submenu: [{ label: 'Sair', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }] },
    { label: 'Editar', submenu: [
        { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Refazer', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Colar', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Selecionar Tudo', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
    ]},
    { label: 'Exibir', submenu: [
        { label: 'Recarregar', accelerator: 'F5', role: 'reload' },
        { label: 'Forcar Recarregar', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Ferramentas de Desenvolvimento', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Tema', submenu: [
            { label: 'Tema Escuro', type: 'radio', checked: currentTheme === 'dark', click: () => setTheme('dark') },
            { label: 'Tema Claro', type: 'radio', checked: currentTheme === 'light', click: () => setTheme('light') },
            { type: 'separator' },
            { label: 'Alternar Tema', accelerator: 'CmdOrCtrl+Shift+T', click: toggleTheme }
        ]},
        { type: 'separator' },
        { label: 'Tela Cheia', accelerator: 'F11', role: 'togglefullscreen' }
    ]},
    { label: 'Janela', submenu: [
        { label: 'Minimizar', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Maximizar', role: 'maximize' },
        { label: 'Fechar', accelerator: 'CmdOrCtrl+W', role: 'close' }
    ]},
    { label: 'Ajuda', submenu: [{ label: 'Sobre Filesfy', click: () => {
        dialog.showMessageBox(mainWindow, {
          type: 'info', title: 'Sobre Filesfy', message: 'Filesfy - Recuperacao de Dados',
          detail: 'Versao 1.0.0\n\nAplicacao de desktop para recuperacao de arquivos deletados.\n\n2026 Filesfy Inc.'
        })
    }}]}
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  createWindow(); createMenu()
  nativeTheme.on('updated', () => {
    detectSystemTheme()
    if (mainWindow) mainWindow.webContents.send('theme-changed', currentTheme)
    createMenu()
  })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// ─── Utilitarios ───────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  const n = Number(bytes)
  if (!n || isNaN(n)) return '-'
  if (n >= 1099511627776) return (n / 1099511627776).toFixed(1) + ' TB'
  if (n >= 1073741824)    return (n / 1073741824).toFixed(1) + ' GB'
  if (n >= 1048576)       return (n / 1048576).toFixed(0) + ' MB'
  return (n / 1024).toFixed(0) + ' KB'
}

function driveTypeLabel(dt) {
  if (dt === '2') return 'Pendrive'
  if (dt === '3') return 'HD interno'
  if (dt === '4') return 'Rede'
  return 'Disco'
}

function execPromise(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { encoding: 'utf8', windowsHide: true }, (err, stdout) => resolve(err ? '' : stdout))
  })
}

const FILE_EXTS = {
  all:   null,
  photo: ['.jpg','.jpeg','.png','.gif','.bmp','.webp','.tiff','.heic','.raw','.cr2','.nef'],
  video: ['.mp4','.avi','.mkv','.mov','.wmv','.flv','.webm','.m4v','.3gp','.ts'],
  audio: ['.mp3','.wav','.aac','.flac','.ogg','.wma','.m4a','.opus','.aiff'],
  doc:   ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.odt','.csv','.rtf'],
}

const FILE_TYPE_LABEL = {
  '.jpg':'Foto','.jpeg':'Foto','.png':'Foto','.gif':'Foto','.bmp':'Foto',
  '.webp':'Foto','.tiff':'Foto','.heic':'Foto','.raw':'Foto','.cr2':'Foto','.nef':'Foto',
  '.mp4':'Video','.avi':'Video','.mkv':'Video','.mov':'Video','.wmv':'Video',
  '.flv':'Video','.webm':'Video','.m4v':'Video','.3gp':'Video','.ts':'Video',
  '.mp3':'Musica','.wav':'Musica','.aac':'Musica','.flac':'Musica','.ogg':'Musica',
  '.wma':'Musica','.m4a':'Musica','.opus':'Musica','.aiff':'Musica',
  '.pdf':'Documento','.doc':'Documento','.docx':'Documento','.odt':'Documento','.rtf':'Documento',
  '.xls':'Planilha','.xlsx':'Planilha','.csv':'Planilha',
  '.ppt':'Apresentacao','.pptx':'Apresentacao',
  '.txt':'Texto',
}

const SKIP_DIRS = new Set([
  'Windows','System32','$Recycle.Bin','Program Files','Program Files (x86)',
  'ProgramData','node_modules','.git','AppData','Recovery','System Volume Information'
])

async function scanDirectory(dirPath, exts, results, maxFiles) {
  if (results.length >= maxFiles) return
  let entries
  try { entries = await fsp.readdir(dirPath, { withFileTypes: true }) } catch (_) { return }
  for (const entry of entries) {
    if (results.length >= maxFiles) break
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      await scanDirectory(path.join(dirPath, entry.name), exts, results, maxFiles)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (exts && !exts.includes(ext)) continue
      try {
        const fullPath = path.join(dirPath, entry.name)
        const stat = await fsp.stat(fullPath)
        results.push({ id: 0, name: entry.name, type: FILE_TYPE_LABEL[ext] || 'Arquivo', size: formatBytes(stat.size), path: fullPath, status: 'Disponivel' })
      } catch (_) {}
    }
  }
}

async function scanRecycleBin(driveLetter, exts) {
  const results = []
  const recyclePath = driveLetter + ':\\$Recycle.Bin'
  let sidDirs
  try { sidDirs = await fsp.readdir(recyclePath, { withFileTypes: true }) } catch (_) { return results }
  for (const sid of sidDirs) {
    if (!sid.isDirectory()) continue
    let files
    try { files = await fsp.readdir(path.join(recyclePath, sid.name), { withFileTypes: true }) } catch (_) { continue }
    for (const f of files) {
      if (!f.name.startsWith('$R')) continue
      const fullPath = path.join(recyclePath, sid.name, f.name)
      const ext = path.extname(f.name).toLowerCase()
      if (exts && !exts.includes(ext)) continue
      try {
        const stat = await fsp.stat(fullPath)
        const metaPath = path.join(recyclePath, sid.name, '$I' + f.name.slice(2))
        let originalName = f.name
        try {
          const meta = await fsp.readFile(metaPath)
          const raw = meta.slice(28).toString('utf16le').replace(/\0/g, '')
          if (raw) originalName = path.basename(raw)
        } catch (_) {}
        results.push({ id: 0, name: originalName, type: FILE_TYPE_LABEL[path.extname(originalName).toLowerCase()] || FILE_TYPE_LABEL[ext] || 'Arquivo', size: formatBytes(stat.size), path: fullPath, status: 'Deletado' })
      } catch (_) {}
    }
  }
  return results
}

// ─── IPC: list-devices ─────────────────────────────────────────────────────────

const EXTRA_DEVICES = [
  { id: 'PHONE1', label: 'Smartphone',        size: '-', type: 'Smartphone'        },
  { id: 'CAM1',   label: 'Camera Digital',    size: '-', type: 'Camera digital'    },
  { id: 'MEM1',   label: 'Cartao de Memoria', size: '-', type: 'Cartao de memoria' },
]

ipcMain.handle('list-devices', async () => {
  const EXTRA = [
    { id: 'PHONE1', label: 'Smartphone',        size: '-', type: 'Smartphone'        },
    { id: 'CAM1',   label: 'Camera Digital',    size: '-', type: 'Camera digital'    },
    { id: 'MEM1',   label: 'Cartao de Memoria', size: '-', type: 'Cartao de memoria' },
  ]
  try {
    const out = await execPromise('wmic logicaldisk get DeviceID,DriveType,Size,VolumeName /format:csv')
    const drives = []
    for (const line of out.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('Node'))) {
      const parts = line.split(',')
      if (parts.length < 5) continue
      const [, deviceID, driveType, size, volumeName] = parts
      if (!deviceID) continue
      const letter = deviceID.replace(':', '').trim()
      if (['0','1','5','6'].includes(driveType.trim())) continue
      const volName = (volumeName || '').trim()
      drives.push({
        id: letter,
        label: volName ? volName + ' (' + letter + ':)' : 'Disco Local (' + letter + ':)',
        size: formatBytes(size.trim()),
        type: driveTypeLabel(driveType.trim())
      })
    }
    if (drives.length === 0) drives.push({ id: 'C', label: 'Disco Local (C:)', size: '-', type: 'HD interno' })
    return [...drives, ...EXTRA]
  } catch (_) {
    return [{ id: 'C', label: 'Disco Local (C:)', size: '-', type: 'HD interno' }, ...EXTRA]
  }
})

// ─── IPC: tema ─────────────────────────────────────────────────────────────────

ipcMain.handle('get-theme', () => getCurrentTheme())
ipcMain.handle('toggle-theme', () => toggleTheme())
ipcMain.handle('set-theme', (_, theme) => setTheme(theme))

// ─── IPC: start-scan ───────────────────────────────────────────────────────────

ipcMain.handle('start-scan', async (event, { deviceId, fileType }) => {
  console.log('[scan] dispositivo:', deviceId, '| tipo:', fileType)
  const exts = FILE_EXTS[fileType] || null
  const allFiles = []
  const isSpecial = ['PHONE1','CAM1','MEM1'].includes(String(deviceId).toUpperCase())

  if (isSpecial) {
    try {
      const out = await execPromise('wmic logicaldisk where DriveType=2 get DeviceID /format:csv')
      const letters = out.split('\n').map(l=>l.trim())
        .filter(l=>l&&!l.startsWith('Node')&&l.includes(':'))
        .map(l=>{ const m=l.match(/([A-Z]):/i); return m?m[1].toUpperCase():null })
        .filter(Boolean)
      if (letters.length === 0) return { progress: 100, files: [], message: 'Nenhum dispositivo removivel detectado.' }
      for (const letter of letters) {
        const bin = await scanRecycleBin(letter, exts)
        allFiles.push(...bin)
        await scanDirectory(letter + ':\\', exts, allFiles, 500)
      }
    } catch (_) {
      return { progress: 100, files: [], message: 'Nao foi possivel detectar dispositivos removiveis.' }
    }
  } else {
    const letter = String(deviceId).replace(':', '').trim().toUpperCase()
    const root   = letter + ':\\'
    const bin = await scanRecycleBin(letter, exts)
    allFiles.push(...bin)
    const dirs = [
      path.join(root, 'Users'), path.join(root, 'Documentos'), path.join(root, 'Fotos'),
      path.join(root, 'Videos'), path.join(root, 'Musicas'), path.join(root, 'Downloads'),
    ]
    if (letter !== 'C' && letter !== 'D') dirs.push(root)
    for (const dir of dirs) {
      if (allFiles.length >= 500) break
      try { await fsp.access(dir); await scanDirectory(dir, exts, allFiles, 500) } catch (_) {}
    }
  }

  allFiles.forEach((f, i) => { f.id = i + 1 })
  console.log('[scan] encontrados:', allFiles.length)
  return { progress: 100, files: allFiles }
})

// ─── IPC: choose-destination ───────────────────────────────────────────────────

ipcMain.handle('choose-destination', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
  return result.canceled || !result.filePaths.length ? null : result.filePaths[0]
})

// ─── IPC: recover-files ────────────────────────────────────────────────────────

ipcMain.handle('recover-files', async (event, { files, destination }) => {
  console.log('[recover] copiando', files.length, 'arquivo(s) para', destination)
  let recovered = 0, failed = 0
  const errors = []
  for (const file of files) {
    if (!file.path) { failed++; continue }
    try {
      let destName = file.name
      let destPath = path.join(destination, destName)
      let counter  = 1
      while (fs.existsSync(destPath)) {
        const ext = path.extname(destName)
        const base = path.basename(destName, ext)
        destName = base + '_(' + counter + ')' + ext
        destPath = path.join(destination, destName)
        counter++
      }
      await fsp.copyFile(file.path, destPath)
      recovered++
    } catch (err) {
      console.error('[recover] falha:', file.path, err.message)
      errors.push(file.name)
      failed++
    }
  }
  console.log('[recover] concluido:', recovered, 'ok,', failed, 'falha(s)')
  return { recovered, failed, errors }
})

// ─── IPC: open-legal ───────────────────────────────────────────────────────────

ipcMain.handle('open-legal', async (event, page) => {
  const pages = { privacy: 'privacy.html', license: 'license.html', terms: 'terms.html' }
  const file = pages[page]
  if (!file) return
  const legalWin = new BrowserWindow({
    width: 860, height: 700, resizable: true, center: true,
    title: 'Filesfy',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })
  legalWin.loadFile(path.join(__dirname, 'legal', file))
  legalWin.setMenuBarVisibility(false)
})