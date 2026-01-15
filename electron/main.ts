import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { DatabaseManager } from './database/manager';
import { DataCloning, type CloningOptions } from './database/cloning';
import bcrypt from 'bcrypt';

let mainWindow: BrowserWindow | null = null;
let dbManager: DatabaseManager | null = null;
let autoBackupInterval: NodeJS.Timeout | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Função para obter o caminho de backup configurado
async function getBackupPath(): Promise<string> {
  if (!dbManager) {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'backups');
  }

  try {
    const result = dbManager.query(
      'SELECT value FROM settings WHERE key = ?',
      ['backup_path']
    );

    if (result && result.length > 0) {
      const savedPath = (result[0] as { value: string }).value;
      // Verifica se o caminho ainda existe e tem permissão de escrita
      try {
        await fs.access(savedPath, fs.constants.W_OK);
        return savedPath;
      } catch (error) {
        console.warn('Caminho de backup configurado não está acessível, usando padrão');
      }
    }
  } catch (error) {
    console.error('Erro ao obter caminho de backup:', error);
  }

  // Retorna caminho padrão se não houver configuração ou em caso de erro
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'backups');
}

// Função para criar backup automático
async function createAutoBackup() {
  if (!dbManager) return;

  try {
    const backupsDir = await getBackupPath();

    // Cria o diretório de backups se não existir
    await fs.mkdir(backupsDir, { recursive: true });

    // Gera o nome do arquivo de backup automático
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup_auto_${timestamp}.db`;

    const backupPath = path.join(backupsDir, filename);
    const userDataPath = app.getPath('userData');
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

// Função para obter a retenção de backups configurada
async function getBackupRetention(): Promise<number> {
  if (!dbManager) return 7; // Padrão: 7 backups

  try {
    const result = dbManager.query(
      'SELECT value FROM settings WHERE key = ?',
      ['backup_retention']
    );

    if (result && result.length > 0) {
      const retention = parseInt((result[0] as { value: string }).value, 10);
      return retention > 0 ? retention : 7;
    }
  } catch (error) {
    console.error('Erro ao obter retenção de backup:', error);
  }

  return 7; // Padrão
}

// Função para obter a frequência de backup configurada (em horas)
async function getBackupFrequency(): Promise<number> {
  if (!dbManager) return 24; // Padrão: 24 horas

  try {
    const result = dbManager.query(
      'SELECT value FROM settings WHERE key = ?',
      ['backup_frequency']
    );

    if (result && result.length > 0) {
      const frequency = parseInt((result[0] as { value: string }).value, 10);
      return frequency > 0 ? frequency : 24;
    }
  } catch (error) {
    console.error('Erro ao obter frequência de backup:', error);
  }

  return 24; // Padrão
}

// Função para limpar backups automáticos antigos
async function cleanupOldAutoBackups(backupsDir: string) {
  try {
    const retention = await getBackupRetention();
    const files = await fs.readdir(backupsDir);
    const autoBackups = files.filter(file => file.startsWith('backup_auto_') && file.endsWith('.db'));

    if (autoBackups.length <= retention) return;

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

    // Remove os backups mais antigos, mantendo apenas os N mais recentes
    const toDelete = backupInfos.slice(0, backupInfos.length - retention);
    for (const backup of toDelete) {
      await fs.unlink(backup.path);
      console.log(`Backup automático antigo removido: ${backup.file}`);
    }
  } catch (error) {
    console.error('Erro ao limpar backups antigos:', error);
  }
}

// Função para iniciar backup automático
async function startAutoBackup() {
  // Cria o primeiro backup ao iniciar
  createAutoBackup();

  // Obtém a frequência configurada (em horas)
  const frequencyHours = await getBackupFrequency();
  const intervalMs = frequencyHours * 60 * 60 * 1000;

  // Configura backup automático com a frequência configurada
  autoBackupInterval = setInterval(() => {
    createAutoBackup();
  }, intervalMs);

  console.log(`Backup automático iniciado (a cada ${frequencyHours} horas)`);
}

// Função para parar backup automático
function stopAutoBackup() {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
    console.log('Backup automático parado');
  }
}

// Função para reiniciar backup automático (usado quando a configuração muda)
async function restartAutoBackup() {
  stopAutoBackup();
  await startAutoBackup();
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
  // Register custom protocol for serving images
  protocol.handle('silver-image', async (request) => {
    const url = new URL(request.url);
    const imagePath = path.join(app.getPath('userData'), 'images', url.hostname + url.pathname);

    try {
      const data = await fs.readFile(imagePath);
      return new Response(data, {
        headers: {
          'content-type': 'image/jpeg'
        }
      });
    } catch (error) {
      return new Response('Image not found', { status: 404 });
    }
  });

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

  const backupsDir = await getBackupPath();

  // Cria o diretório de backups se não existir
  await fs.mkdir(backupsDir, { recursive: true });

  // Gera o nome do arquivo de backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = customName
    ? `backup_${customName}_${timestamp}.db`
    : `backup_${timestamp}.db`;

  const backupPath = path.join(backupsDir, filename);
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'silver.db');

  // Copia o arquivo do banco de dados
  await fs.copyFile(dbPath, backupPath);

  return filename;
});

ipcMain.handle('backup:restore', async (_event, filename: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  const backupsDir = await getBackupPath();
  const backupPath = path.join(backupsDir, filename);
  const userDataPath = app.getPath('userData');
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
  const backupsDir = await getBackupPath();

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
  const backupsDir = await getBackupPath();
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

ipcMain.handle('backup:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Selecionar Diretório para Backups'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('backup:setPath', async (_event, newPath: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  // Verifica se o caminho existe e tem permissão de escrita
  try {
    await fs.access(newPath, fs.constants.W_OK);
  } catch (error) {
    throw new Error('Diretório não possui permissão de escrita');
  }

  // Salva nas configurações
  const now = Date.now();
  const existing = dbManager.query(
    'SELECT id FROM settings WHERE key = ?',
    ['backup_path']
  );

  if (existing && existing.length > 0) {
    dbManager.execute(
      'UPDATE settings SET value = ?, updated_at = ? WHERE key = ?',
      [newPath, now, 'backup_path']
    );
  } else {
    dbManager.execute(
      'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['backup_path', newPath, now, now]
    );
  }

  return newPath;
});

ipcMain.handle('backup:getPath', async () => {
  return await getBackupPath();
});

ipcMain.handle('backup:getPolicy', async () => {
  const frequency = await getBackupFrequency();
  const retention = await getBackupRetention();
  return { frequency, retention };
});

ipcMain.handle('backup:setPolicy', async (_event, frequency: number, retention: number) => {
  if (!dbManager) throw new Error('Database not initialized');

  // Valida os valores
  if (frequency < 1 || frequency > 168) {
    throw new Error('Frequência deve estar entre 1 e 168 horas (1 semana)');
  }
  if (retention < 1 || retention > 365) {
    throw new Error('Retenção deve estar entre 1 e 365 backups');
  }

  const now = Date.now();

  // Salva a frequência
  const existingFrequency = dbManager.query(
    'SELECT id FROM settings WHERE key = ?',
    ['backup_frequency']
  );

  if (existingFrequency && existingFrequency.length > 0) {
    dbManager.execute(
      'UPDATE settings SET value = ?, updated_at = ? WHERE key = ?',
      [frequency.toString(), now, 'backup_frequency']
    );
  } else {
    dbManager.execute(
      'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['backup_frequency', frequency.toString(), now, now]
    );
  }

  // Salva a retenção
  const existingRetention = dbManager.query(
    'SELECT id FROM settings WHERE key = ?',
    ['backup_retention']
  );

  if (existingRetention && existingRetention.length > 0) {
    dbManager.execute(
      'UPDATE settings SET value = ?, updated_at = ? WHERE key = ?',
      [retention.toString(), now, 'backup_retention']
    );
  } else {
    dbManager.execute(
      'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['backup_retention', retention.toString(), now, now]
    );
  }

  // Reinicia o backup automático com a nova frequência
  await restartAutoBackup();

  return { frequency, retention };
});

// Authentication Handlers
ipcMain.handle('auth:verifyPassword', async (_event, username: string, password: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  const result = dbManager.query('SELECT password FROM users WHERE username = ?', [username]);

  if (!result || result.length === 0) {
    return false;
  }

  const user = result[0] as { password: string };
  return bcrypt.compareSync(password, user.password);
});

ipcMain.handle('auth:changePassword', async (_event, userId: number, currentPassword: string, newPassword: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  // Verifica a senha atual
  const result = dbManager.query('SELECT password FROM users WHERE id = ?', [userId]);

  if (!result || result.length === 0) {
    throw new Error('Usuário não encontrado');
  }

  const user = result[0] as { password: string };
  const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new Error('Senha atual incorreta');
  }

  // Hash da nova senha
  const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

  // Atualiza a senha
  dbManager.execute(
    'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
    [hashedNewPassword, Date.now(), userId]
  );

  return true;
});

// Data Cloning Handlers
ipcMain.handle('cloning:cloneData', async (_event, sourceCompanyId: number, targetCompanyId: number, options: CloningOptions) => {
  if (!dbManager) throw new Error('Database not initialized');

  try {
    const cloning = new DataCloning(dbManager);

    const report = await cloning.cloneData(
      sourceCompanyId,
      targetCompanyId,
      options,
      (message: string) => {
        // Envia progresso de volta para o renderer
        if (mainWindow) {
          mainWindow.webContents.send('cloning:progress', message);
        }
      }
    );

    return report;
  } catch (error: any) {
    console.error('Erro na clonagem de dados:', error);
    throw new Error(error.message || 'Erro ao clonar dados');
  }
});

// Image File Handlers
ipcMain.handle('image:selectFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
    ],
    title: 'Selecionar Imagem do Produto'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('image:save', async (_event, sourceFilePath: string, originalFileName: string) => {
  const userDataPath = app.getPath('userData');
  const imagesDir = path.join(userDataPath, 'images');

  // Cria o diretório de imagens se não existir
  await fs.mkdir(imagesDir, { recursive: true });

  // Gera um nome único para o arquivo usando timestamp
  const timestamp = Date.now();
  const fileExtension = path.extname(originalFileName);
  const uniqueFileName = `product_${timestamp}${fileExtension}`;

  const destinationPath = path.join(imagesDir, uniqueFileName);

  // Copia o arquivo para o diretório de imagens
  await fs.copyFile(sourceFilePath, destinationPath);

  // Retorna apenas o nome do arquivo (não o caminho completo)
  return uniqueFileName;
});

ipcMain.handle('image:delete', async (_event, fileName: string) => {
  if (!fileName) return;

  const userDataPath = app.getPath('userData');
  const imagePath = path.join(userDataPath, 'images', fileName);

  try {
    await fs.unlink(imagePath);
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    // Não lança erro se o arquivo não existir
  }
});

ipcMain.handle('image:getPath', async (_event, fileName: string) => {
  if (!fileName) return null;

  const userDataPath = app.getPath('userData');
  const imagePath = path.join(userDataPath, 'images', fileName);

  try {
    await fs.access(imagePath);
    return imagePath;
  } catch (error) {
    return null;
  }
});

ipcMain.handle('image:readAsDataURL', async (_event, filePath: string) => {
  try {
    const data = await fs.readFile(filePath);
    const base64 = data.toString('base64');
    const ext = path.extname(filePath).toLowerCase();

    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.bmp') mimeType = 'image/bmp';

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error reading image as data URL:', error);
    return null;
  }
});

// Inventory Handlers
ipcMain.handle('inventory:zeroAllStock', async (_event, companyId: number) => {
  if (!dbManager) throw new Error('Database not initialized');

  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Busca todos os produtos com estoque > 0 DA EMPRESA SELECIONADA
    const productsWithStock = dbManager.query(
      'SELECT id, stock_quantity FROM products WHERE company_id = ? AND stock_quantity > 0 AND active = 1',
      [companyId]
    ) as Array<{ id: number; stock_quantity: number }>;

    if (!productsWithStock || productsWithStock.length === 0) {
      return { affectedProducts: 0, protocolNumber: null };
    }

    // Prepara os movimentos (zera todos os estoques)
    const movements = productsWithStock.map(product => ({
      productId: product.id,
      quantityChanged: -product.stock_quantity
    }));

    // Cria o protocolo
    const protocolManager = dbManager.getProtocolManager();
    const protocolNumber = protocolManager.createProtocol('zero_stock', movements, {
      notes: `Estoque zerado manualmente - Todos os produtos (Empresa ID: ${companyId})`
    });

    return {
      affectedProducts: productsWithStock.length,
      protocolNumber
    };
  } catch (error: any) {
    console.error('Erro ao zerar estoque:', error);
    throw new Error(error.message || 'Erro ao zerar estoque');
  }
});

ipcMain.handle('inventory:zeroStockByCategory', async (_event, companyId: number, category: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Busca produtos da categoria com estoque > 0 DA EMPRESA SELECIONADA
    const productsWithStock = dbManager.query(
      'SELECT id, stock_quantity FROM products WHERE company_id = ? AND category = ? AND stock_quantity > 0 AND active = 1',
      [companyId, category]
    ) as Array<{ id: number; stock_quantity: number }>;

    if (!productsWithStock || productsWithStock.length === 0) {
      return { affectedProducts: 0, protocolNumber: null };
    }

    // Prepara os movimentos (zera estoques da categoria)
    const movements = productsWithStock.map(product => ({
      productId: product.id,
      quantityChanged: -product.stock_quantity
    }));

    // Cria o protocolo
    const protocolManager = dbManager.getProtocolManager();
    const protocolNumber = protocolManager.createProtocol('zero_stock', movements, {
      notes: `Estoque zerado manualmente - Categoria: ${category} (Empresa ID: ${companyId})`
    });

    return {
      affectedProducts: productsWithStock.length,
      protocolNumber
    };
  } catch (error: any) {
    console.error('Erro ao zerar estoque por categoria:', error);
    throw new Error(error.message || 'Erro ao zerar estoque por categoria');
  }
});

// Stock Protocol Handlers
ipcMain.handle('protocol:list', async (_event, filters?: {
  type?: string;
  status?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}) => {
  if (!dbManager) throw new Error('Database not initialized');

  try {
    const protocolManager = dbManager.getProtocolManager();
    return protocolManager.listProtocols(filters);
  } catch (error: any) {
    console.error('Erro ao listar protocolos:', error);
    throw new Error(error.message || 'Erro ao listar protocolos');
  }
});

ipcMain.handle('protocol:get', async (_event, protocolNumber: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  try {
    const protocolManager = dbManager.getProtocolManager();
    return protocolManager.getProtocol(protocolNumber);
  } catch (error: any) {
    console.error('Erro ao buscar protocolo:', error);
    throw new Error(error.message || 'Erro ao buscar protocolo');
  }
});

ipcMain.handle('protocol:cancel', async (_event, protocolNumber: string, cancelledBy?: number) => {
  if (!dbManager) throw new Error('Database not initialized');

  try {
    const protocolManager = dbManager.getProtocolManager();
    protocolManager.cancelProtocol(protocolNumber, cancelledBy);
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao cancelar protocolo:', error);
    throw new Error(error.message || 'Erro ao cancelar protocolo');
  }
});

ipcMain.handle('protocol:getByReference', async (_event, referenceType: string, referenceId: number) => {
  if (!dbManager) throw new Error('Database not initialized');

  try {
    const protocolManager = dbManager.getProtocolManager();
    return protocolManager.getProtocolsByReference(referenceType, referenceId);
  } catch (error: any) {
    console.error('Erro ao buscar protocolos por referência:', error);
    throw new Error(error.message || 'Erro ao buscar protocolos por referência');
  }
});

// Stock Adjustment Handler (with Protocol)
ipcMain.handle('stock:addAdjustment', async (_event, productId: number, newQuantity: number, companyId: number, notes?: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  if (!companyId) throw new Error('Company ID is required');

  try {
    // Busca produto e quantidade atual
    const product = dbManager.query(
      'SELECT id, name, stock_quantity FROM products WHERE id = ? AND company_id = ?',
      [productId, companyId]
    ) as Array<{ id: number; name: string; stock_quantity: number }>;

    if (!product || product.length === 0) {
      throw new Error('Produto não encontrado');
    }

    const currentQuantity = product[0].stock_quantity;
    const difference = newQuantity - currentQuantity;

    if (difference === 0) {
      throw new Error('A nova quantidade é igual à quantidade atual');
    }

    // Cria o protocolo
    const protocolManager = dbManager.getProtocolManager();
    const protocolNumber = protocolManager.createProtocol(
      'adjustment',
      [{
        productId,
        quantityChanged: difference
      }],
      {
        notes: notes || `Ajuste de estoque - ${product[0].name}: ${currentQuantity} → ${newQuantity}`
      }
    );

    return { success: true, protocolNumber, quantityChanged: difference };
  } catch (error: any) {
    console.error('Erro ao adicionar ajuste de estoque:', error);
    throw new Error(error.message || 'Erro ao adicionar ajuste de estoque');
  }
});

// Stock Entry Handler (with Protocol)
ipcMain.handle('stock:addEntry', async (_event, productId: number, quantity: number, unitCost: number, companyId: number, notes?: string) => {
  if (!dbManager) throw new Error('Database not initialized');

  if (!companyId) throw new Error('Company ID is required');
  if (quantity <= 0) throw new Error('A quantidade deve ser maior que zero');

  try {
    // Busca produto
    const product = dbManager.query(
      'SELECT id, name, stock_quantity FROM products WHERE id = ? AND company_id = ?',
      [productId, companyId]
    ) as Array<{ id: number; name: string; stock_quantity: number }>;

    if (!product || product.length === 0) {
      throw new Error('Produto não encontrado');
    }

    // Cria o protocolo (que já atualiza o estoque internamente)
    const protocolManager = dbManager.getProtocolManager();
    const protocolNumber = protocolManager.createProtocol(
      'purchase',
      [{
        productId,
        quantityChanged: quantity
      }],
      {
        notes: notes || `Entrada de estoque - ${product[0].name}: +${quantity} unidades (R$ ${unitCost.toFixed(2)}/un)`
      }
    );

    return { success: true, protocolNumber, quantityAdded: quantity };
  } catch (error: any) {
    console.error('Erro ao adicionar entrada de estoque:', error);
    throw new Error(error.message || 'Erro ao adicionar entrada de estoque');
  }
});

// Complete Sale Handler (with Protocol)
ipcMain.handle('sales:complete', async (_event, saleData: {
  items: Array<{ productId: number; quantity: number; unitPrice: number; discount: number; total: number }>;
  payments: Array<{ paymentMethodId: number; amount: number }>;
  customerId?: number;
  cashRegisterId: number;
  discount: number;
  companyId: number;
}) => {
  if (!dbManager) throw new Error('Database not initialized');

  if (!saleData.companyId) throw new Error('Company ID is required');

  const now = Date.now();
  const saleNumber = `V${now}`;

  try {
    // Calcula totais
    const totalItems = saleData.items.reduce((sum, item) => sum + item.total, 0);
    const finalAmount = totalItems - saleData.discount;
    const totalPaid = saleData.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const changeAmount = totalPaid > finalAmount ? totalPaid - finalAmount : 0;

    // 1. Insere a venda
    const saleResult = dbManager.execute(
      `INSERT INTO sales (sale_number, customer_id, cash_register_id, total_amount,
       discount, final_amount, change_amount, status, sale_date, company_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleNumber,
        saleData.customerId || null,
        saleData.cashRegisterId,
        totalItems,
        saleData.discount,
        finalAmount,
        changeAmount,
        'completed',
        now,
        saleData.companyId,
        now,
        now,
      ]
    );

    const saleId = (saleResult as any).lastInsertRowid;

    // 2. Insere itens da venda
    for (const item of saleData.items) {
      dbManager.execute(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saleId, item.productId, item.quantity, item.unitPrice, item.discount, item.total, now]
      );
    }

    // 3. Insere pagamentos
    for (const payment of saleData.payments) {
      dbManager.execute(
        'INSERT INTO sale_payments (sale_id, payment_method_id, amount, created_at) VALUES (?, ?, ?, ?)',
        [saleId, payment.paymentMethodId, payment.amount, now]
      );
    }

    // 4. Cria protocolo para movimentação de estoque (com transação interna)
    const movements = saleData.items.map(item => ({
      productId: item.productId,
      quantityChanged: -item.quantity // Negativo pois é saída
    }));

    const protocolManager = dbManager.getProtocolManager();
    const protocolNumber = protocolManager.createProtocol(
      'sale',
      movements,
      {
        referenceId: saleId,
        referenceType: 'sale',
        notes: `Venda ${saleNumber} - ${saleData.items.length} produto(s)`
      }
    );

    return { saleNumber, saleId, protocolNumber };

  } catch (error: any) {
    console.error('Erro ao completar venda:', error);
    throw new Error(error.message || 'Erro ao completar venda');
  }
});
