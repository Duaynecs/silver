import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { DatabaseManager } from './database/manager';

let mainWindow: BrowserWindow | null = null;
let dbManager: DatabaseManager | null = null;
let autoBackupInterval: NodeJS.Timeout | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Função para criar backup automático
async function createAutoBackup() {
  if (!dbManager) return;

  try {
    const userDataPath = app.getPath('userData');
    const backupsDir = path.join(userDataPath, 'backups');

    // Cria o diretório de backups se não existir
    await fs.mkdir(backupsDir, { recursive: true });

    // Gera o nome do arquivo de backup automático
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup_auto_${timestamp}.db`;

    const backupPath = path.join(backupsDir, filename);
    const dbPath = path.join(userDataPath, 'silver.db');

    // Copia o arquivo do banco de dados
    await fs.copyFile(dbPath, backupPath);

    console.log(`Backup automático criado: ${filename}`);

    // Remove backups automáticos antigos (mantém apenas os últimos 7 dias)
    await cleanupOldAutoBackups(backupsDir);
  } catch (error) {
    console.error('Erro ao criar backup automático:', error);
  }
}

// Função para limpar backups automáticos antigos
async function cleanupOldAutoBackups(backupsDir: string) {
  try {
    const files = await fs.readdir(backupsDir);
    const autoBackups = files.filter(file => file.startsWith('backup_auto_') && file.endsWith('.db'));

    if (autoBackups.length <= 7) return;

    // Obtém informações de todos os backups automáticos
    const backupInfos = await Promise.all(
      autoBackups.map(async (file) => {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        return { file, path: filePath, createdAt: stats.birthtimeMs };
      })
    );

    // Ordena por data de criação (mais antigo primeiro)
    backupInfos.sort((a, b) => a.createdAt - b.createdAt);

    // Remove os backups mais antigos, mantendo apenas os 7 mais recentes
    const toDelete = backupInfos.slice(0, backupInfos.length - 7);
    for (const backup of toDelete) {
      await fs.unlink(backup.path);
      console.log(`Backup automático antigo removido: ${backup.file}`);
    }
  } catch (error) {
    console.error('Erro ao limpar backups antigos:', error);
  }
}

// Função para iniciar backup automático
function startAutoBackup() {
  // Cria o primeiro backup ao iniciar
  createAutoBackup();

  // Configura backup automático a cada 24 horas (86400000 ms)
  autoBackupInterval = setInterval(() => {
    createAutoBackup();
  }, 24 * 60 * 60 * 1000);

  console.log('Backup automático iniciado (a cada 24 horas)');
}

// Função para parar backup automático
function stopAutoBackup() {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
    console.log('Backup automático parado');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    autoHideMenuBar: true,
    frame: true,
    titleBarStyle: 'default'
  });

  // Inicializa o banco de dados
  const userDataPath = app.getPath('userData');
  dbManager = new DatabaseManager(path.join(userDataPath, 'silver.db'));

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Inicia o backup automático
  startAutoBackup();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Para o backup automático
  stopAutoBackup();

  if (dbManager) {
    dbManager.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers - serão implementados conforme necessário
ipcMain.handle('db:query', async (_event, query, params) => {
  if (!dbManager) throw new Error('Database not initialized');
  return dbManager.query(query, params);
});

ipcMain.handle('db:execute', async (_event, query, params) => {
  if (!dbManager) throw new Error('Database not initialized');
  return dbManager.execute(query, params);
});

// Backup Handlers
ipcMain.handle('backup:create', async (_event, customName?: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');

  // Cria o diretório de backups se não existir
  await fs.mkdir(backupsDir, { recursive: true });

  // Gera o nome do arquivo de backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = customName
    ? `backup_${customName}_${timestamp}.db`
    : `backup_${timestamp}.db`;

  const backupPath = path.join(backupsDir, filename);
  const dbPath = path.join(userDataPath, 'silver.db');

  // Copia o arquivo do banco de dados
  await fs.copyFile(dbPath, backupPath);

  return filename;
});

ipcMain.handle('backup:restore', async (_event, filename: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');
  const backupPath = path.join(backupsDir, filename);
  const dbPath = path.join(userDataPath, 'silver.db');

  // Verifica se o arquivo de backup existe
  try {
    await fs.access(backupPath);
  } catch (error) {
    throw new Error('Arquivo de backup não encontrado');
  }

  // Fecha o banco de dados atual
  dbManager.close();

  // Copia o backup sobre o banco de dados atual
  await fs.copyFile(backupPath, dbPath);

  // Reinicializa o banco de dados
  dbManager = new DatabaseManager(dbPath);

  return;
});

ipcMain.handle('backup:list', async () => {
  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');

  try {
    // Cria o diretório se não existir
    await fs.mkdir(backupsDir, { recursive: true });

    // Lista os arquivos no diretório de backups
    const files = await fs.readdir(backupsDir);

    // Filtra apenas arquivos .db e obtém informações
    const backupInfos = await Promise.all(
      files
        .filter(file => file.endsWith('.db'))
        .map(async (file) => {
          const filePath = path.join(backupsDir, file);
          const stats = await fs.stat(filePath);
          return {
            filename: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtimeMs,
          };
        })
    );

    // Ordena por data de criação (mais recente primeiro)
    return backupInfos.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('backup:delete', async (_event, filename: string) => {
  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');
  const backupPath = path.join(backupsDir, filename);

  try {
    await fs.unlink(backupPath);
  } catch (error) {
    throw new Error('Erro ao excluir arquivo de backup');
  }

  return;
});

ipcMain.handle('backup:getInfo', async (_event, filename: string) => {
  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');
  const backupPath = path.join(backupsDir, filename);

  try {
    const stats = await fs.stat(backupPath);
    return {
      filename,
      path: backupPath,
      size: stats.size,
      createdAt: stats.birthtimeMs,
    };
  } catch (error) {
    throw new Error('Arquivo de backup não encontrado');
  }
});
