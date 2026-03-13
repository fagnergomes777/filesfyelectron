// ===== Estado global =====
let wizardEl = null;
let selectedDevice = null;   // objeto completo { id, label, size, type }
let selectedFileType = 'all';
let scannedFiles = [];

// ===== Utilitários =====
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFilePreviewHtml(file) {
  const fileName = file.name || '';
  const extMatch = fileName.match(/\.([^.]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';
  const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  
  if (imgExts.includes(ext) && file.path) {
    // É uma imagem, carrega preview
    const safePath = file.path.replace(/\\/g, '/');
    const localUrl = `file:///${encodeURI(safePath)}`;
    return `<div class="file-thumb image-thumb" style="background-image: url('${localUrl}');"></div>`;
  }

  // Não é imagem ou não tem caminho - decide ícone
  let iconClass = 'fa-solid fa-file';
  switch (ext) {
    case 'pdf': iconClass = 'fa-solid fa-file-pdf'; break;
    case 'doc':
    case 'docx': iconClass = 'fa-solid fa-file-word'; break;
    case 'xls':
    case 'xlsx': iconClass = 'fa-solid fa-file-excel'; break;
    case 'ppt':
    case 'pptx': iconClass = 'fa-solid fa-file-powerpoint'; break;
    case 'zip':
    case 'rar':
    case '7z':
    case 'gz': iconClass = 'fa-solid fa-file-zipper'; break;
    case 'mp3':
    case 'wav':
    case 'flac': iconClass = 'fa-solid fa-file-audio'; break;
    case 'mp4':
    case 'avi':
    case 'mkv':
    case 'mov': iconClass = 'fa-solid fa-file-video'; break;
    case 'txt':
    case 'md':
    case 'csv': iconClass = 'fa-solid fa-file-lines'; break;
    case 'html':
    case 'js':
    case 'css':
    case 'json':
    case 'xml': iconClass = 'fa-solid fa-file-code'; break;
  }
  const extLabel = ext ? ext.substring(0, 4).toUpperCase() : 'ARQ';
  return `<div class="file-thumb icon-thumb"><i class="${iconClass}"></i><span class="file-ext-label">${escapeHtml(extLabel)}</span></div>`;
}

// Mapa de ícones Font Awesome por tipo de dispositivo
const DEVICE_ICONS = {
  'HD interno':        '<i class="fa-solid fa-hard-drive"></i>',
  'HD externo':        '<i class="fa-solid fa-hard-drive"></i>',
  'HD':                '<i class="fa-solid fa-hard-drive"></i>',
  'SSD interno':       '<i class="fa-solid fa-hard-drive"></i>',
  'SSD externo':       '<i class="fa-solid fa-hard-drive"></i>',
  'SSD':               '<i class="fa-solid fa-hard-drive"></i>',
  'Pendrive':          '<i class="fa-brands fa-usb"></i>',
  'Smartphone':        '<i class="fa-solid fa-mobile-screen"></i>',
  'Câmera digital':    '<i class="fa-solid fa-camera"></i>',
  'Cartão de memória': '<i class="fa-solid fa-memory"></i>',
};

function getDeviceIcon(type) {
  return DEVICE_ICONS[type] || '<i class="fa-solid fa-hard-drive"></i>';
}

// ===== TELA 1: Seleção de dispositivo =====
async function showDeviceScreen() {
  wizardEl.innerHTML = `
    <section class="scan-container">
      <header class="scan-header">
        <h1><i class="fa-solid fa-magnifying-glass"></i> Selecione o Dispositivo</h1>
        <p>Escolha o disco ou dispositivo que deseja varrer para recuperação de arquivos.</p>
      </header>
      <div id="devices-list" class="devices-list">
        <p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Carregando dispositivos...</p>
      </div>
    </section>
  `;

  try {
    if (!window.electronAPI || typeof window.electronAPI.listDevices !== 'function') {
      throw new Error('API do Electron não disponível. Verifique o preload.js.');
    }

    const devices = await window.electronAPI.listDevices();
    const listEl = document.getElementById('devices-list');

    if (!listEl) return; // tela foi trocada enquanto aguardava

    if (!devices || devices.length === 0) {
      listEl.innerHTML = `
        <p class="loading-text"><i class="fa-solid fa-circle-exclamation"></i> Nenhum dispositivo encontrado.</p>
        <div style="text-align:center;margin-top:12px;">
          <button class="btn-secondary" id="btn-retry-devices" style="width:auto;padding:8px 24px;">
            <i class="fa-solid fa-rotate-right"></i> Atualizar
          </button>
        </div>
      `;
      document.getElementById('btn-retry-devices')?.addEventListener('click', showDeviceScreen);
      return;
    }

    listEl.innerHTML = devices.map((device) => `
      <button class="device-card" data-device-id="${escapeHtml(String(device.id))}">
        <span class="device-icon">${getDeviceIcon(device.type)}</span>
        <div class="device-info">
          <strong>${escapeHtml(device.label)}</strong>
          ${device.size && device.size !== '—' ? `<span>${escapeHtml(device.size)}</span>` : ''}
        </div>
      </button>
    `).join('');

    listEl.querySelectorAll('.device-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const deviceId = btn.getAttribute('data-device-id');
        selectedDevice = devices.find((d) => String(d.id) === deviceId) || { id: deviceId, label: deviceId };
        showScanOptionsScreen();
      });
    });
  } catch (err) {
    showError('Não foi possível listar os dispositivos: ' + (err.message || err));
  }
}

// ===== TELA 2: Opções de varredura =====
function showScanOptionsScreen() {
  const fileTypes = [
    { id: 'all',    label: 'Todos os Arquivos', icon: '📁' },
    { id: 'photo',  label: 'Fotos',             icon: '🖼️' },
    { id: 'video',  label: 'Vídeos',            icon: '🎬' },
    { id: 'audio',  label: 'Músicas',           icon: '🎵' },
    { id: 'doc',    label: 'Documentos',        icon: '📄' },
  ];

  wizardEl.innerHTML = `
    <section class="scan-container">
      <header class="scan-header">
        <h1>⚙️ Tipo de Arquivo</h1>
        <p>Escolha o que deseja recuperar em <strong>${escapeHtml(selectedDevice.label || selectedDevice.id)}</strong>.</p>
      </header>

      <div class="filetype-grid">
        ${fileTypes.map((ft) => `
          <button class="filetype-card ${selectedFileType === ft.id ? 'selected' : ''}" data-type="${ft.id}">
            <span class="filetype-icon">${ft.icon}</span>
            <span>${escapeHtml(ft.label)}</span>
          </button>
        `).join('')}
      </div>

      <div class="scan-actions">
        <button class="btn-secondary" id="btn-back-devices">← Voltar</button>
        <button class="btn-primary" id="btn-start-scan">Iniciar Varredura</button>
      </div>
    </section>
  `;

  wizardEl.querySelectorAll('.filetype-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      wizardEl.querySelectorAll('.filetype-card').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedFileType = btn.getAttribute('data-type');
    });
  });

  document.getElementById('btn-back-devices')?.addEventListener('click', showDeviceScreen);
  document.getElementById('btn-start-scan')?.addEventListener('click', runScan);
}

// ===== TELA 3: Varredura em progresso + resultados =====
async function runScan() {
  wizardEl.innerHTML = `
    <section class="scan-container">
      <header class="scan-header">
        <h1>⏳ Varrendo...</h1>
        <p>Aguarde enquanto buscamos arquivos recuperáveis em <strong>${escapeHtml(selectedDevice.label || selectedDevice.id)}</strong>.</p>
      </header>
      <div class="progress-bar-wrapper">
        <div class="progress-bar" id="progress-bar" style="width:0%"></div>
      </div>
      <p class="progress-label" id="progress-label">0%</p>
    </section>
  `;

  // Simula progresso visual antes de chamar o IPC
  let pct = 0;
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const ticker = setInterval(() => {
    pct = Math.min(pct + Math.random() * 12, 90);
    if (progressBar) progressBar.style.width = pct.toFixed(0) + '%';
    if (progressLabel) progressLabel.textContent = pct.toFixed(0) + '%';
  }, 200);

  try {
    const result = await window.electronAPI.startScan(selectedDevice.id || selectedDevice, selectedFileType);
    clearInterval(ticker);
    if (progressBar) progressBar.style.width = '100%';
    if (progressLabel) progressLabel.textContent = '100%';

    scannedFiles = (result && result.files) ? result.files : [];
    setTimeout(() => showResultsScreen(), 400);
  } catch (err) {
    clearInterval(ticker);
    showError('Falha na varredura: ' + (err.message || err));
  }
}

// ===== TELA 4: Resultados da varredura =====
function showResultsScreen() {
  if (scannedFiles.length === 0) {
    wizardEl.innerHTML = `
      <section class="scan-container">
        <header class="scan-header">
          <h1>😔 Nenhum arquivo encontrado</h1>
          <p>Não foram encontrados arquivos recuperáveis neste dispositivo.</p>
        </header>
        <button class="btn-secondary" id="btn-new-scan">← Nova Varredura</button>
      </section>
    `;
    document.getElementById('btn-new-scan')?.addEventListener('click', showDeviceScreen);
    return;
  }

  wizardEl.innerHTML = `
    <section class="scan-container">
      <header class="scan-header">
        <h1>✅ ${scannedFiles.length} arquivo(s) encontrado(s)</h1>
        <p>Selecione os arquivos que deseja recuperar.</p>
      </header>

      <div class="results-toolbar">
        <label class="select-all-label">
          <input type="checkbox" id="chk-select-all" /> Selecionar tudo
        </label>
        <span class="results-count" id="selected-count">0 selecionado(s)</span>
      </div>

      <div class="results-list">
        ${scannedFiles.map((file) => `
          <label class="result-item status-${escapeHtml((file.status || 'bom').toLowerCase())}">
            <input type="checkbox" class="file-checkbox" data-file-id="${escapeHtml(String(file.id))}" />
            ${getFilePreviewHtml(file)}
            <div class="result-info">
              <strong>${escapeHtml(file.name)}</strong>
              <span>${escapeHtml(file.type)} · ${escapeHtml(file.size)} · ${escapeHtml(file.path)}</span>
            </div>
            <span class="result-status status-badge-${escapeHtml((file.status || 'bom').toLowerCase())}">${escapeHtml(file.status || 'Bom')}</span>
          </label>
        `).join('')}
      </div>

      <div class="scan-actions">
        <button class="btn-secondary" id="btn-back-scan">← Nova Varredura</button>
        <button class="btn-primary" id="btn-recover">💾 Recuperar Selecionados</button>
      </div>
    </section>
  `;

  const allCheckboxes = () => wizardEl.querySelectorAll('.file-checkbox');
  const updateCount = () => {
    const count = wizardEl.querySelectorAll('.file-checkbox:checked').length;
    const el = document.getElementById('selected-count');
    if (el) el.textContent = `${count} selecionado(s)`;
  };

  document.getElementById('chk-select-all')?.addEventListener('change', (e) => {
    allCheckboxes().forEach((chk) => { chk.checked = e.target.checked; });
    updateCount();
  });

  allCheckboxes().forEach((chk) => chk.addEventListener('change', updateCount));

  document.getElementById('btn-back-scan')?.addEventListener('click', showDeviceScreen);
  document.getElementById('btn-recover')?.addEventListener('click', handleRecover);
}

// ===== TELA 5: Recuperação =====
async function handleRecover() {
  const checkedIds = Array.from(wizardEl.querySelectorAll('.file-checkbox:checked'))
    .map((chk) => chk.getAttribute('data-file-id'));

  if (checkedIds.length === 0) {
    alert('Selecione ao menos um arquivo para recuperar.');
    return;
  }

  const destination = await window.electronAPI.chooseDestination();
  if (!destination) return;

  const filesToRecover = scannedFiles.filter((f) => checkedIds.includes(String(f.id)));

  wizardEl.innerHTML = `
    <section class="scan-container">
      <header class="scan-header">
        <h1>⏳ Recuperando arquivos...</h1>
        <p>Copiando ${filesToRecover.length} arquivo(s) para:<br><code>${escapeHtml(destination)}</code></p>
      </header>
      <div class="progress-bar-wrapper">
        <div class="progress-bar" style="width:60%"></div>
      </div>
    </section>
  `;

  try {
    const result = await window.electronAPI.recoverFiles(filesToRecover, destination);
    wizardEl.innerHTML = `
      <section class="scan-container">
        <header class="scan-header">
          <h1>🎉 Recuperação concluída!</h1>
          <p>
            <strong>${result.recovered}</strong> arquivo(s) recuperado(s) com sucesso.<br>
            ${result.failed > 0 ? `<span class="warn-text">⚠️ ${result.failed} arquivo(s) falharam.</span>` : ''}
          </p>
        </header>
        <div class="scan-actions">
          <button class="btn-secondary" id="btn-new-scan-final">← Iniciar Nova Varredura</button>
        </div>
      </section>
    `;
    document.getElementById('btn-new-scan-final')?.addEventListener('click', showDeviceScreen);
  } catch (err) {
    showError('Falha ao recuperar arquivos: ' + (err.message || err));
  }
}

// ===== Inicialização (sem login, vai direto para dispositivos) =====
async function init() {
  wizardEl = document.getElementById('wizard');
  if (!wizardEl) return;

  // Aplica tema salvo ou detecta do sistema
  try {
    const theme = await window.electronAPI.getTheme();
    document.body.className = `theme-${theme}`;
    window.electronAPI.onThemeChanged((t) => { document.body.className = `theme-${t}`; });
  } catch (_) { /* sem tema, sem problema */ }

  showDeviceScreen();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}





