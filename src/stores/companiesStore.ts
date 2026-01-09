import type { CompanyFormData } from '@/schemas/companySchema';
import type { Company } from '@/types';
import { mapDbArrayToType } from '@/utils/dbMapper';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompaniesState {
  companies: Company[];
  currentCompanyId: number | null;
  loading: boolean;
  error: string | null;
  fetchCompanies: () => Promise<void>;
  addCompany: (data: CompanyFormData) => Promise<void>;
  updateCompany: (id: number, data: CompanyFormData) => Promise<void>;
  deleteCompany: (id: number) => Promise<void>;
  setCurrentCompany: (companyId: number | null) => void;
  getCurrentCompany: () => Company | null;
}

export const useCompaniesStore = create<CompaniesState>()(
  persist(
    (set, get) => ({
      companies: [],
      currentCompanyId: null,
      loading: false,
      error: null,

      fetchCompanies: async () => {
        set({ loading: true, error: null });
        try {
          const result = await window.electron.db.query(
            'SELECT * FROM companies WHERE active = 1 ORDER BY name ASC',
            []
          );
          const companies = mapDbArrayToType<Company>(result as any[]);
          set({ companies, loading: false });
        } catch (error) {
          set({ error: 'Erro ao carregar empresas', loading: false });
          console.error('Error fetching companies:', error);
        }
      },

      addCompany: async (data: CompanyFormData) => {
        set({ loading: true, error: null });
        try {
          const now = Date.now();
          const toNullIfEmpty = (value: string | undefined) =>
            value && value.trim() !== '' ? value : null;

          await window.electron.db.execute(
            `INSERT INTO companies (name, cnpj, phone, email, address, city, state, zip_code, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              data.name,
              toNullIfEmpty(data.cnpj),
              toNullIfEmpty(data.phone),
              toNullIfEmpty(data.email),
              toNullIfEmpty(data.address),
              toNullIfEmpty(data.city),
              toNullIfEmpty(data.state),
              toNullIfEmpty(data.zipCode),
              data.active ? 1 : 0,
              now,
              now,
            ]
          );
          await get().fetchCompanies();
          set({ loading: false });
        } catch (error: any) {
          const errorMessage =
            error.message?.includes('UNIQUE') || error.message?.includes('unique')
              ? 'Já existe uma empresa com este CNPJ'
              : 'Erro ao adicionar empresa';
          set({ error: errorMessage, loading: false });
          console.error('Error adding company:', error);
          throw error;
        }
      },

      updateCompany: async (id: number, data: CompanyFormData) => {
        set({ loading: true, error: null });
        try {
          const now = Date.now();
          const toNullIfEmpty = (value: string | undefined) =>
            value && value.trim() !== '' ? value : null;

          await window.electron.db.execute(
            `UPDATE companies SET
              name = ?, cnpj = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, zip_code = ?, active = ?, updated_at = ?
            WHERE id = ?`,
            [
              data.name,
              toNullIfEmpty(data.cnpj),
              toNullIfEmpty(data.phone),
              toNullIfEmpty(data.email),
              toNullIfEmpty(data.address),
              toNullIfEmpty(data.city),
              toNullIfEmpty(data.state),
              toNullIfEmpty(data.zipCode),
              data.active ? 1 : 0,
              now,
              id,
            ]
          );
          await get().fetchCompanies();
          set({ loading: false });
        } catch (error: any) {
          const errorMessage =
            error.message?.includes('UNIQUE') || error.message?.includes('unique')
              ? 'Já existe uma empresa com este CNPJ'
              : 'Erro ao atualizar empresa';
          set({ error: errorMessage, loading: false });
          console.error('Error updating company:', error);
          throw error;
        }
      },

      deleteCompany: async (id: number) => {
        set({ loading: true, error: null });
        try {
          const now = Date.now();
          await window.electron.db.execute(
            'UPDATE companies SET active = 0, updated_at = ? WHERE id = ?',
            [now, id]
          );
          await get().fetchCompanies();
          set({ loading: false });

          // Se a empresa excluída era a atual, seleciona outra
          const { currentCompanyId, companies } = get();
          if (currentCompanyId === id && companies.length > 0) {
            set({ currentCompanyId: companies[0].id });
          }
        } catch (error) {
          set({ error: 'Erro ao excluir empresa', loading: false });
          console.error('Error deleting company:', error);
          throw error;
        }
      },

      setCurrentCompany: (companyId: number | null) => {
        set({ currentCompanyId: companyId });
      },

      getCurrentCompany: () => {
        const { companies, currentCompanyId } = get();
        return companies.find((c) => c.id === currentCompanyId) || null;
      },
    }),
    {
      name: 'companies-storage',
      partialize: (state) => ({
        currentCompanyId: state.currentCompanyId,
      }),
    }
  )
);
