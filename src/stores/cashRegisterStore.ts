import type { CashRegister } from '@/types';
import { mapDbToType } from '@/utils/dbMapper';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCompaniesStore } from './companiesStore';

interface CashRegisterState {
  currentRegister: CashRegister | null;
  loading: boolean;
  error: string | null;

  openRegister: (initialAmount: number) => Promise<void>;
  closeRegister: (finalAmount: number, notes?: string) => Promise<void>;
  getCurrentRegister: () => Promise<void>;
  checkRegisterStatus: () => Promise<boolean>;
  calculateExpectedAmount: (registerId: number) => Promise<number>;
}

export const useCashRegisterStore = create<CashRegisterState>()(
  persist(
    (set, get) => ({
      currentRegister: null,
      loading: false,
      error: null,

      getCurrentRegister: async () => {
        set({ loading: true, error: null });
        try {
          const companyId = useCompaniesStore.getState().currentCompanyId;
          if (!companyId) {
            set({ currentRegister: null, loading: false });
            return;
          }

          const result = await window.electron.db.query(
            'SELECT * FROM cash_register WHERE status = ? AND company_id = ? ORDER BY opening_date DESC LIMIT 1',
            ['open', companyId]
          );
          const currentRegister =
            result && result.length > 0
              ? mapDbToType<CashRegister>(result[0])
              : null;
          set({
            currentRegister,
            loading: false,
          });
        } catch (error) {
          set({ error: 'Erro ao carregar caixa', loading: false });
          console.error('Error fetching cash register:', error);
        }
      },

      checkRegisterStatus: async () => {
        try {
          const companyId = useCompaniesStore.getState().currentCompanyId;
          if (!companyId) {
            return false;
          }

          const result = await window.electron.db.query(
            'SELECT COUNT(*) as count FROM cash_register WHERE status = ? AND company_id = ?',
            ['open', companyId]
          );
          return result && result[0]?.count > 0;
        } catch (error) {
          console.error('Error checking register status:', error);
          return false;
        }
      },

      openRegister: async (initialAmount: number) => {
        set({ loading: true, error: null });
        try {
          const companyId = useCompaniesStore.getState().currentCompanyId;
          if (!companyId) {
            throw new Error('Nenhuma empresa selecionada');
          }

          // Verifica se já existe um caixa aberto
          const isOpen = await get().checkRegisterStatus();
          if (isOpen) {
            throw new Error('Já existe um caixa aberto');
          }

          const now = Date.now();
          await window.electron.db.execute(
            `INSERT INTO cash_register (
              opening_date, initial_amount, status, company_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [now, initialAmount, 'open', companyId, now, now]
          );

          await get().getCurrentRegister();
          set({ loading: false });
        } catch (error: any) {
          set({
            error: error.message || 'Erro ao abrir caixa',
            loading: false,
          });
          console.error('Error opening register:', error);
          throw error;
        }
      },

      closeRegister: async (finalAmount: number, notes?: string) => {
        set({ loading: true, error: null });
        try {
          const { currentRegister } = get();
          if (!currentRegister) {
            throw new Error('Nenhum caixa aberto');
          }

          const now = Date.now();
          const expectedAmount = await get().calculateExpectedAmount(
            currentRegister.id
          );
          const difference = finalAmount - expectedAmount;

          await window.electron.db.execute(
            `UPDATE cash_register SET
              closing_date = ?,
              final_amount = ?,
              expected_amount = ?,
              difference = ?,
              status = ?,
              notes = ?,
              updated_at = ?
            WHERE id = ?`,
            [
              now,
              finalAmount,
              expectedAmount,
              difference,
              'closed',
              notes || null,
              now,
              currentRegister.id,
            ]
          );

          set({ currentRegister: null, loading: false });
        } catch (error: any) {
          set({
            error: error.message || 'Erro ao fechar caixa',
            loading: false,
          });
          console.error('Error closing register:', error);
          throw error;
        }
      },

      calculateExpectedAmount: async (registerId: number) => {
        try {
          // Calcula o valor esperado somando vendas realizadas neste caixa
          const result = await window.electron.db.query(
            `SELECT
              cr.initial_amount,
              COALESCE(SUM(s.final_amount), 0) as total_sales
            FROM cash_register cr
            LEFT JOIN sales s ON s.cash_register_id = cr.id AND s.status = 'completed'
            WHERE cr.id = ?
            GROUP BY cr.id`,
            [registerId]
          );

          if (result && result.length > 0) {
            const row = result[0] as any;
            const initialAmount = row.initial_amount || 0;
            const totalSales = row.total_sales || 0;
            return initialAmount + totalSales;
          }

          return 0;
        } catch (error) {
          console.error('Error calculating expected amount:', error);
          return 0;
        }
      },
    }),
    {
      name: 'cash-register-storage',
      version: 1,
      partialize: (state) => ({ currentRegister: state.currentRegister }),
      migrate: (persistedState: any) => {
        // Se o estado persistido tem um registro com campos undefined, limpa
        if (persistedState?.currentRegister &&
            persistedState.currentRegister.initialAmount === undefined) {
          console.log('Limpando estado inválido do localStorage');
          return { currentRegister: null };
        }
        return persistedState;
      },
    }
  )
);
