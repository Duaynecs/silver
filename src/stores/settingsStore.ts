import { create } from 'zustand';
import { mapDbToType } from '@/utils/dbMapper';
import { useCompaniesStore } from './companiesStore';

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
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ commissionPercentage: 0, loading: false });
        return;
      }

      const result = await window.electron.db.query(
        'SELECT * FROM settings WHERE key = ? AND company_id = ?',
        ['commission_percentage', companyId]
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
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();
      const result = await window.electron.db.query(
        'SELECT * FROM settings WHERE key = ? AND company_id = ?',
        ['commission_percentage', companyId]
      );

      if (result && result.length > 0) {
        // Atualiza configuração existente
        await window.electron.db.execute(
          'UPDATE settings SET value = ?, updated_at = ? WHERE key = ? AND company_id = ?',
          [percentage.toString(), now, 'commission_percentage', companyId]
        );
      } else {
        // Insere nova configuração
        await window.electron.db.execute(
          'INSERT INTO settings (key, value, company_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          ['commission_percentage', percentage.toString(), companyId, now, now]
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
