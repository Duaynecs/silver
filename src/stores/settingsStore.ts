import { create } from 'zustand';
import { mapDbToType } from '@/utils/dbMapper';

interface SettingsState {
  commissionPercentage: number;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateCommissionPercentage: (percentage: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  commissionPercentage: 0,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.electron.db.query(
        'SELECT * FROM settings WHERE key = ?',
        ['commission_percentage']
      );

      if (result && result.length > 0) {
        const setting = mapDbToType<{ key: string; value: string }>(result[0]);
        set({ commissionPercentage: parseFloat(setting.value) || 0, loading: false });
      } else {
        set({ commissionPercentage: 0, loading: false });
      }
    } catch (error) {
      set({ error: 'Erro ao carregar configurações', loading: false });
      console.error('Error fetching settings:', error);
    }
  },

  updateCommissionPercentage: async (percentage: number) => {
    set({ loading: true, error: null });
    try {
      const now = Date.now();
      const result = await window.electron.db.query(
        'SELECT * FROM settings WHERE key = ?',
        ['commission_percentage']
      );

      if (result && result.length > 0) {
        // Atualiza configuração existente
        await window.electron.db.execute(
          'UPDATE settings SET value = ?, updated_at = ? WHERE key = ?',
          [percentage.toString(), now, 'commission_percentage']
        );
      } else {
        // Insere nova configuração
        await window.electron.db.execute(
          'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)',
          ['commission_percentage', percentage.toString(), now, now]
        );
      }

      await get().fetchSettings();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao atualizar configuração', loading: false });
      console.error('Error updating commission percentage:', error);
      throw error;
    }
  },
}));
