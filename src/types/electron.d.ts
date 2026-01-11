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

export interface CloningResult {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface CloningReport {
  categories: CloningResult;
  products: CloningResult;
  customers: CloningResult;
  paymentMethods: CloningResult;
}

export interface CloningOptions {
  categories: boolean;
  products: boolean;
  customers: boolean;
  paymentMethods: boolean;
  updateMode: 'insert' | 'upsert';
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
    cloneData: (sourceCompanyId: number, targetCompanyId: number, options: CloningOptions) => Promise<CloningReport>;
  };
  inventory: {
    zeroAllStock: (companyId: number) => Promise<{ affectedProducts: number; protocolNumber: string | null }>;
    zeroStockByCategory: (companyId: number, category: string) => Promise<{ affectedProducts: number; protocolNumber: string | null }>;
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
