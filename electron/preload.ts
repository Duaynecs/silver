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
