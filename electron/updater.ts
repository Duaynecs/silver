import { autoUpdater, UpdateInfo } from 'electron-updater';
import log from 'electron-log';
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';

// Configuração do log
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Desabilita auto download para controle manual se necessário
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Configuração para repositório privado do GitHub
// O token deve ser configurado via variável de ambiente ou arquivo de configuração
const GITHUB_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (GITHUB_TOKEN) {
  autoUpdater.requestHeaders = {
    Authorization: `token ${GITHUB_TOKEN}`,
  };
}

interface UpdaterState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  error: string | null;
  updateInfo: UpdateInfo | null;
}

let updaterState: UpdaterState = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  progress: 0,
  error: null,
  updateInfo: null,
};

let mainWindow: BrowserWindow | null = null;

// Função para enviar estado para o renderer
function sendStatusToWindow(status: string, data?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { status, data });
  }
  log.info(`Update status: ${status}`, data || '');
}

// Função para obter o caminho do cache de instaladores
async function getInstallerCachePath(): Promise<string> {
  const userDataPath = app.getPath('userData');
  const cachePath = path.join(userDataPath, 'installer-cache');
  await fs.mkdir(cachePath, { recursive: true });
  return cachePath;
}

// Função para salvar informações da versão atual (para rollback)
async function saveCurrentVersionInfo(): Promise<void> {
  try {
    const cachePath = await getInstallerCachePath();
    const infoPath = path.join(cachePath, 'version-history.json');

    let history: Array<{ version: string; date: string }> = [];

    try {
      const data = await fs.readFile(infoPath, 'utf-8');
      history = JSON.parse(data);
    } catch {
      // Arquivo não existe ainda
    }

    const currentVersion = app.getVersion();

    // Adiciona versão atual se não existir
    if (!history.some(h => h.version === currentVersion)) {
      history.unshift({
        version: currentVersion,
        date: new Date().toISOString(),
      });

      // Mantém apenas as últimas 5 versões
      history = history.slice(0, 5);

      await fs.writeFile(infoPath, JSON.stringify(history, null, 2));
      log.info(`Saved version info: ${currentVersion}`);
    }
  } catch (error) {
    log.error('Error saving version info:', error);
  }
}

// Função para obter histórico de versões
async function getVersionHistory(): Promise<Array<{ version: string; date: string }>> {
  try {
    const cachePath = await getInstallerCachePath();
    const infoPath = path.join(cachePath, 'version-history.json');
    const data = await fs.readFile(infoPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Eventos do autoUpdater
autoUpdater.on('checking-for-update', () => {
  updaterState = { ...updaterState, checking: true, error: null };
  sendStatusToWindow('checking');
});

autoUpdater.on('update-available', (info: UpdateInfo) => {
  updaterState = {
    ...updaterState,
    checking: false,
    available: true,
    updateInfo: info,
  };
  sendStatusToWindow('available', {
    version: info.version,
    releaseNotes: info.releaseNotes,
    releaseDate: info.releaseDate,
  });
  log.info(`Update available: ${info.version}`);
});

autoUpdater.on('update-not-available', (info: UpdateInfo) => {
  updaterState = {
    ...updaterState,
    checking: false,
    available: false,
    updateInfo: info,
  };
  sendStatusToWindow('not-available', { version: info.version });
  log.info(`No update available. Current version: ${app.getVersion()}`);
});

autoUpdater.on('error', (err) => {
  updaterState = {
    ...updaterState,
    checking: false,
    downloading: false,
    error: err.message,
  };
  sendStatusToWindow('error', { message: err.message });
  log.error('Update error:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  updaterState = {
    ...updaterState,
    downloading: true,
    progress: progressObj.percent,
  };

  const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent.toFixed(1)}%`;
  log.info(logMessage);

  sendStatusToWindow('downloading', {
    percent: progressObj.percent,
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total,
  });
});

autoUpdater.on('update-downloaded', async (info: UpdateInfo) => {
  updaterState = {
    ...updaterState,
    downloading: false,
    downloaded: true,
    progress: 100,
    updateInfo: info,
  };

  // Salva informações da versão atual antes de atualizar
  await saveCurrentVersionInfo();

  sendStatusToWindow('downloaded', {
    version: info.version,
    releaseNotes: info.releaseNotes,
  });

  log.info(`Update downloaded: ${info.version}`);

  // Instala automaticamente ao sair (comportamento silencioso)
  // A atualização será instalada quando o usuário fechar o app
});

// Funções exportadas
export function initUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Salva informações da versão atual
  saveCurrentVersionInfo();

  // Verifica atualizações ao iniciar (após 3 segundos para não atrasar inicialização)
  setTimeout(() => {
    checkForUpdates();
  }, 3000);

  // Verifica atualizações periodicamente (a cada 4 horas)
  setInterval(() => {
    checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

export function checkForUpdates(): void {
  if (updaterState.checking || updaterState.downloading) {
    log.info('Already checking or downloading update');
    return;
  }

  log.info('Checking for updates...');
  autoUpdater.checkForUpdates().catch((err) => {
    log.error('Error checking for updates:', err);
  });
}

export function downloadUpdate(): void {
  if (!updaterState.available || updaterState.downloading) {
    return;
  }

  autoUpdater.downloadUpdate().catch((err) => {
    log.error('Error downloading update:', err);
  });
}

export function installUpdate(): void {
  if (!updaterState.downloaded) {
    log.warn('No update downloaded to install');
    return;
  }

  log.info('Quitting and installing update...');
  autoUpdater.quitAndInstall(false, true);
}

export function getUpdaterState(): UpdaterState {
  return { ...updaterState };
}

export async function getVersionInfo(): Promise<{
  current: string;
  history: Array<{ version: string; date: string }>;
}> {
  return {
    current: app.getVersion(),
    history: await getVersionHistory(),
  };
}

// Função para configurar o feed de atualização manualmente (útil para testes)
export function setFeedURL(options: {
  provider: 'github';
  owner: string;
  repo: string;
  private?: boolean;
  token?: string;
}): void {
  autoUpdater.setFeedURL({
    provider: options.provider,
    owner: options.owner,
    repo: options.repo,
    private: options.private,
    token: options.token || GITHUB_TOKEN,
  });
}
