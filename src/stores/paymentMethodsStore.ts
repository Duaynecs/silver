import type { PaymentMethod } from '@/types';
import { mapDbArrayToType } from '@/utils/dbMapper';
import { create } from 'zustand';
import { useCompaniesStore } from './companiesStore';

interface PaymentMethodsState {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  error: string | null;

  fetchPaymentMethods: () => Promise<void>;
  addPaymentMethod: (name: string, acceptsChange: boolean) => Promise<void>;
  updatePaymentMethod: (id: number, name: string, acceptsChange: boolean) => Promise<void>;
  deletePaymentMethod: (id: number) => Promise<void>;
}

export const usePaymentMethodsStore = create<PaymentMethodsState>((set, get) => ({
  paymentMethods: [],
  loading: false,
  error: null,

  fetchPaymentMethods: async () => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ paymentMethods: [], loading: false });
        return;
      }

      const result = await window.electron.db.query(
        'SELECT * FROM payment_methods WHERE active = 1 AND company_id = ? ORDER BY name ASC',
        [companyId]
      );
      const paymentMethods = mapDbArrayToType<PaymentMethod>(result as any[]);
      set({ paymentMethods, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar formas de pagamento', loading: false });
      console.error('Error fetching payment methods:', error);
    }
  },

  addPaymentMethod: async (name: string, acceptsChange: boolean) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();
      await window.electron.db.execute(
        'INSERT INTO payment_methods (name, accepts_change, company_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [name, acceptsChange ? 1 : 0, companyId, 1, now, now]
      );
      await get().fetchPaymentMethods();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao adicionar forma de pagamento', loading: false });
      console.error('Error adding payment method:', error);
      throw error;
    }
  },

  updatePaymentMethod: async (id: number, name: string, acceptsChange: boolean) => {
    set({ loading: true, error: null });
    try {
      const now = Date.now();
      await window.electron.db.execute(
        'UPDATE payment_methods SET name = ?, accepts_change = ?, updated_at = ? WHERE id = ?',
        [name, acceptsChange ? 1 : 0, now, id]
      );
      await get().fetchPaymentMethods();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao atualizar forma de pagamento', loading: false });
      console.error('Error updating payment method:', error);
      throw error;
    }
  },

  deletePaymentMethod: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const now = Date.now();
      await window.electron.db.execute(
        'UPDATE payment_methods SET active = 0, updated_at = ? WHERE id = ?',
        [now, id]
      );
      await get().fetchPaymentMethods();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao excluir forma de pagamento', loading: false });
      console.error('Error deleting payment method:', error);
      throw error;
    }
  },
}));
