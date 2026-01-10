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
