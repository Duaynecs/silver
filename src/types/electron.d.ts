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
