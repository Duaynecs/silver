import type { CustomerFormData } from '@/schemas/customerSchema';
import type { Customer } from '@/types';
import { mapDbArrayToType, mapDbToType } from '@/utils/dbMapper';
import { create } from 'zustand';
import { useCompaniesStore } from './companiesStore';

interface CustomersState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  addCustomer: (data: CustomerFormData) => Promise<void>;
  updateCustomer: (id: number, data: CustomerFormData) => Promise<void>;
  deleteCustomer: (id: number) => Promise<void>;
  searchByCpfCnpj: (cpfCnpj: string) => Promise<Customer | null>;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ customers: [], loading: false });
        return;
      }

      const result = await window.electron.db.query(
        'SELECT * FROM customers WHERE active = 1 AND company_id = ? ORDER BY name ASC',
        [companyId]
      );
      const customers = mapDbArrayToType<Customer>(result as any[]);
      set({ customers, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar clientes', loading: false });
      console.error('Error fetching customers:', error);
    }
  },

  addCustomer: async (data: CustomerFormData) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();
      // Converte strings vazias para null
      const toNullIfEmpty = (value: string | undefined) =>
        value && value.trim() !== '' ? value : null;

      // Verifica se CPF/CNPJ já existe (se foi fornecido)
      const cpfCnpj = toNullIfEmpty(data.cpfCnpj);
      if (cpfCnpj) {
        const existing = await window.electron.db.query(
          'SELECT id, name FROM customers WHERE cpf_cnpj = ? AND active = 1 AND company_id = ?',
          [cpfCnpj, companyId]
        );
        if (existing && existing.length > 0) {
          const existingCustomer = mapDbToType<{ id: number; name: string }>(existing[0]);
          throw new Error(`Este CPF/CNPJ já está cadastrado para o cliente: ${existingCustomer.name}`);
        }
      }

      await window.electron.db.execute(
        `INSERT INTO customers (name, cpf_cnpj, phone, email, address, number, neighborhood,
         complement, city, state, zip_code, notes, company_id, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          cpfCnpj,
          toNullIfEmpty(data.phone),
          toNullIfEmpty(data.email),
          toNullIfEmpty(data.address),
          toNullIfEmpty(data.number),
          toNullIfEmpty(data.neighborhood),
          toNullIfEmpty(data.complement),
          toNullIfEmpty(data.city),
          toNullIfEmpty(data.state),
          toNullIfEmpty(data.zipCode),
          toNullIfEmpty(data.notes),
          companyId,
          data.active ? 1 : 0,
          now,
          now,
        ]
      );
      await get().fetchCustomers();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao adicionar cliente', loading: false });
      console.error('Error adding customer:', error);
      throw error;
    }
  },

  updateCustomer: async (id: number, data: CustomerFormData) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();
      // Converte strings vazias para null
      const toNullIfEmpty = (value: string | undefined) =>
        value && value.trim() !== '' ? value : null;

      // Verifica se CPF/CNPJ já existe para outro cliente (se foi fornecido)
      const cpfCnpj = toNullIfEmpty(data.cpfCnpj);
      if (cpfCnpj) {
        const existing = await window.electron.db.query(
          'SELECT id, name FROM customers WHERE cpf_cnpj = ? AND id != ? AND active = 1 AND company_id = ?',
          [cpfCnpj, id, companyId]
        );
        if (existing && existing.length > 0) {
          const existingCustomer = mapDbToType<{ id: number; name: string }>(existing[0]);
          throw new Error(`Este CPF/CNPJ já está cadastrado para o cliente: ${existingCustomer.name}`);
        }
      }

      await window.electron.db.execute(
        `UPDATE customers SET
          name = ?, cpf_cnpj = ?, phone = ?, email = ?,
          address = ?, number = ?, neighborhood = ?, complement = ?,
          city = ?, state = ?, zip_code = ?,
          notes = ?, active = ?, updated_at = ?
        WHERE id = ?`,
        [
          data.name,
          toNullIfEmpty(data.cpfCnpj),
          toNullIfEmpty(data.phone),
          toNullIfEmpty(data.email),
          toNullIfEmpty(data.address),
          toNullIfEmpty(data.number),
          toNullIfEmpty(data.neighborhood),
          toNullIfEmpty(data.complement),
          toNullIfEmpty(data.city),
          toNullIfEmpty(data.state),
          toNullIfEmpty(data.zipCode),
          toNullIfEmpty(data.notes),
          data.active ? 1 : 0,
          now,
          id,
        ]
      );
      await get().fetchCustomers();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao atualizar cliente', loading: false });
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  deleteCustomer: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const now = Date.now();
      await window.electron.db.execute(
        'UPDATE customers SET active = 0, updated_at = ? WHERE id = ?',
        [now, id]
      );
      await get().fetchCustomers();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao excluir cliente', loading: false });
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  searchByCpfCnpj: async (cpfCnpj: string) => {
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        return null;
      }

      const result = await window.electron.db.query(
        'SELECT * FROM customers WHERE cpf_cnpj = ? AND active = 1 AND company_id = ? LIMIT 1',
        [cpfCnpj, companyId]
      );
      return result && result.length > 0
        ? mapDbToType<Customer>(result[0])
        : null;
    } catch (error) {
      console.error('Error searching customer by CPF/CNPJ:', error);
      return null;
    }
  },
}));
