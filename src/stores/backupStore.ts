import type { BackupInfo } from '@/types/electron.d';
import { create } from 'zustand';

interface BackupState {
  backups: BackupInfo[];
  loading: boolean;
  error: string | null;
  fetchBackups: () => Promise<void>;
  createBackup: (name?: string) => Promise<string>;
  restoreBackup: (filename: string) => Promise<void>;
  deleteBackup: (filename: string) => Promise<void>;
  getBackupInfo: (filename: string) => Promise<BackupInfo>;
}

export const useBackupStore = create<BackupState>((set, get) => ({
  backups: [],
  loading: false,
  error: null,

  fetchBackups: async () => {
    set({ loading: true, error: null });
    try {
      const backups = await window.electron.backup.list();
      set({ backups, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar lista de backups', loading: false });
      console.error('Error fetching backups:', error);
    }
  },

  createBackup: async (name?: string) => {
    set({ loading: true, error: null });
    try {
      const filename = await window.electron.backup.create(name);
      await get().fetchBackups();
      set({ loading: false });
      return filename;
    } catch (error) {
      set({ error: 'Erro ao criar backup', loading: false });
      console.error('Error creating backup:', error);
      throw error;
    }
  },

  restoreBackup: async (filename: string) => {
    set({ loading: true, error: null });
    try {
      await window.electron.backup.restore(filename);
      set({ loading: false });
      // Recarrega a página após restaurar para atualizar todos os dados
      window.location.reload();
    } catch (error) {
      set({ error: 'Erro ao restaurar backup', loading: false });
      console.error('Error restoring backup:', error);
      throw error;
    }
  },

  deleteBackup: async (filename: string) => {
    set({ loading: true, error: null });
    try {
      await window.electron.backup.delete(filename);
      await get().fetchBackups();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao excluir backup', loading: false });
      console.error('Error deleting backup:', error);
      throw error;
    }
  },

  getBackupInfo: async (filename: string) => {
    try {
      return await window.electron.backup.getInfo(filename);
    } catch (error) {
      console.error('Error getting backup info:', error);
      throw error;
    }
  },
}));
