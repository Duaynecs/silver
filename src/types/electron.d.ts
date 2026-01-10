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
