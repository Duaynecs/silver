import { contextBridge, ipcRenderer } from 'electron';

// Expõe APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electron', {
  // Database operations
  db: {
    query: (query: string, params?: any[]) =>
      ipcRenderer.invoke('db:query', query, params),
    execute: (query: string, params?: any[]) =>
      ipcRenderer.invoke('db:execute', query, params),
  },

  // Backup operations
  backup: {
    create: (name?: string) =>
      ipcRenderer.invoke('backup:create', name),
    restore: (filename: string) =>
      ipcRenderer.invoke('backup:restore', filename),
    list: () =>
      ipcRenderer.invoke('backup:list'),
    delete: (filename: string) =>
      ipcRenderer.invoke('backup:delete', filename),
    getInfo: (filename: string) =>
      ipcRenderer.invoke('backup:getInfo', filename),
    selectDirectory: () =>
      ipcRenderer.invoke('backup:selectDirectory'),
    setPath: (path: string) =>
      ipcRenderer.invoke('backup:setPath', path),
    getPath: () =>
      ipcRenderer.invoke('backup:getPath'),
    getPolicy: () =>
      ipcRenderer.invoke('backup:getPolicy'),
    setPolicy: (frequency: number, retention: number) =>
      ipcRenderer.invoke('backup:setPolicy', frequency, retention),
  },

  // Authentication operations
  auth: {
    verifyPassword: (username: string, password: string) =>
      ipcRenderer.invoke('auth:verifyPassword', username, password),
    changePassword: (userId: number, currentPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:changePassword', userId, currentPassword, newPassword),
  },

  // Image file operations
  image: {
    selectFile: () =>
      ipcRenderer.invoke('image:selectFile'),
    save: (sourceFilePath: string, originalFileName: string) =>
      ipcRenderer.invoke('image:save', sourceFilePath, originalFileName),
    delete: (fileName: string) =>
      ipcRenderer.invoke('image:delete', fileName),
    getPath: (fileName: string) =>
      ipcRenderer.invoke('image:getPath', fileName),
    readAsDataURL: (filePath: string) =>
      ipcRenderer.invoke('image:readAsDataURL', filePath),
  },

  // Data cloning operations
  cloning: {
    cloneData: (sourceCompanyId: number, targetCompanyId: number, options: any) =>
      ipcRenderer.invoke('cloning:cloneData', sourceCompanyId, targetCompanyId, options),
  },

  // Inventory operations
  inventory: {
    zeroAllStock: (companyId: number) =>
      ipcRenderer.invoke('inventory:zeroAllStock', companyId),
    zeroStockByCategory: (companyId: number, category: string) =>
      ipcRenderer.invoke('inventory:zeroStockByCategory', companyId, category),
  },

  // Stock operations
  stock: {
    addAdjustment: (productId: number, newQuantity: number, companyId: number, notes?: string) =>
      ipcRenderer.invoke('stock:addAdjustment', productId, newQuantity, companyId, notes),
    addEntry: (productId: number, quantity: number, unitCost: number, companyId: number, notes?: string) =>
      ipcRenderer.invoke('stock:addEntry', productId, quantity, unitCost, companyId, notes),
  },

  // Sales operations
  sales: {
    complete: (saleData: {
      items: Array<{ productId: number; quantity: number; unitPrice: number; discount: number; total: number }>;
      payments: Array<{ paymentMethodId: number; amount: number }>;
      customerId?: number;
      cashRegisterId: number;
      discount: number;
      companyId: number;
    }) => ipcRenderer.invoke('sales:complete', saleData),
  },

  // Protocol operations
  protocol: {
    list: (filters?: {
      type?: string;
      status?: string;
      startDate?: number;
      endDate?: number;
      limit?: number;
      offset?: number;
    }) => ipcRenderer.invoke('protocol:list', filters),
    get: (protocolNumber: string) => ipcRenderer.invoke('protocol:get', protocolNumber),
    cancel: (protocolNumber: string, cancelledBy?: number) =>
      ipcRenderer.invoke('protocol:cancel', protocolNumber, cancelledBy),
    getByReference: (referenceType: string, referenceId: number) =>
      ipcRenderer.invoke('protocol:getByReference', referenceType, referenceId),
  },

  // Platform info
  platform: process.platform,

  // Versão
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }
});

// Type definitions para TypeScript no renderer
export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: number;
}

export interface BackupPolicy {
  frequency: number; // em horas
  retention: number; // quantidade de backups
}

export interface ElectronAPI {
  db: {
    query: (query: string, params?: any[]) => Promise<any>;
    execute: (query: string, params?: any[]) => Promise<any>;
  };
  backup: {
    create: (name?: string) => Promise<string>;
    restore: (filename: string) => Promise<void>;
    list: () => Promise<BackupInfo[]>;
    delete: (filename: string) => Promise<void>;
    getInfo: (filename: string) => Promise<BackupInfo>;
    selectDirectory: () => Promise<string | null>;
    setPath: (path: string) => Promise<string>;
    getPath: () => Promise<string>;
    getPolicy: () => Promise<BackupPolicy>;
    setPolicy: (frequency: number, retention: number) => Promise<BackupPolicy>;
  };
  auth: {
    verifyPassword: (username: string, password: string) => Promise<boolean>;
    changePassword: (userId: number, currentPassword: string, newPassword: string) => Promise<boolean>;
  };
  image: {
    selectFile: () => Promise<string | null>;
    save: (sourceFilePath: string, originalFileName: string) => Promise<string>;
    delete: (fileName: string) => Promise<void>;
    getPath: (fileName: string) => Promise<string | null>;
    readAsDataURL: (filePath: string) => Promise<string | null>;
  };
  cloning: {
    cloneData: (sourceCompanyId: number, targetCompanyId: number, options: any) => Promise<any>;
  };
  inventory: {
    zeroAllStock: (companyId: number) => Promise<{ affectedProducts: number; protocolNumber: string | null }>;
    zeroStockByCategory: (companyId: number, category: string) => Promise<{ affectedProducts: number; protocolNumber: string | null }>;
  };
  stock: {
    addAdjustment: (productId: number, newQuantity: number, companyId: number, notes?: string) => Promise<{ success: boolean; protocolNumber: string; quantityChanged: number }>;
    addEntry: (productId: number, quantity: number, unitCost: number, companyId: number, notes?: string) => Promise<{ success: boolean; protocolNumber: string; quantityAdded: number }>;
  };
  sales: {
    complete: (saleData: {
      items: Array<{ productId: number; quantity: number; unitPrice: number; discount: number; total: number }>;
      payments: Array<{ paymentMethodId: number; amount: number }>;
      customerId?: number;
      cashRegisterId: number;
      discount: number;
      companyId: number;
    }) => Promise<{ saleNumber: string; saleId: number; protocolNumber: string }>;
  };
  protocol: {
    list: (filters?: {
      type?: string;
      status?: string;
      startDate?: number;
      endDate?: number;
      limit?: number;
      offset?: number;
    }) => Promise<any[]>;
    get: (protocolNumber: string) => Promise<any | null>;
    cancel: (protocolNumber: string, cancelledBy?: number) => Promise<{ success: boolean }>;
    getByReference: (referenceType: string, referenceId: number) => Promise<any[]>;
  };
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
