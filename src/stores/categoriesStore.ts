import type { CategoryFormData } from '@/schemas/categorySchema';
import type { CategoryWithChildren, CategoryWithStats } from '@/types';
import { mapDbArrayToType } from '@/utils/dbMapper';
import { create } from 'zustand';
import { useCompaniesStore } from './companiesStore';

interface CategoriesState {
  categories: CategoryWithStats[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  addCategory: (data: CategoryFormData) => Promise<void>;
  updateCategory: (id: number, data: CategoryFormData) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  getCategoriesTree: () => CategoryWithChildren[];
  getRootCategories: () => CategoryWithStats[];
  getChildCategories: (parentId: number) => CategoryWithStats[];
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ categories: [], loading: false });
        return;
      }

      const result = await window.electron.db.query(
        `SELECT
          c.id,
          c.name,
          c.description,
          c.parent_id as parentId,
          c.company_id as companyId,
          c.active,
          c.created_at as createdAt,
          c.updated_at as updatedAt,
          COUNT(DISTINCT p.id) as productCount,
          COALESCE(SUM(p.stock_quantity), 0) as stockQuantity,
          COALESCE(SUM(p.stock_quantity * p.sale_price), 0) as stockValue
        FROM categories c
        LEFT JOIN products p ON p.category = c.name AND p.active = 1 AND p.company_id = c.company_id
        WHERE c.active = 1 AND c.company_id = ?
        GROUP BY c.id, c.name, c.description, c.parent_id, c.company_id, c.active, c.created_at, c.updated_at
        ORDER BY c.name ASC`,
        [companyId]
      );
      const categories = mapDbArrayToType<CategoryWithStats>(result as any[]);
      set({ categories, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar categorias', loading: false });
      console.error('Error fetching categories:', error);
    }
  },

  addCategory: async (data: CategoryFormData) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();
      const toNullIfEmpty = (value: string | undefined) =>
        value && value.trim() !== '' ? value : null;

      const toNullIfZero = (value: number | undefined) =>
        value && value > 0 ? value : null;

      await window.electron.db.execute(
        `INSERT INTO categories (name, description, parent_id, company_id, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          toNullIfEmpty(data.description),
          toNullIfZero(data.parentId),
          companyId,
          data.active ? 1 : 0,
          now,
          now,
        ]
      );
      await get().fetchCategories();
      set({ loading: false });
    } catch (error: any) {
      const errorMessage =
        error.message?.includes('UNIQUE') || error.message?.includes('unique')
          ? 'Já existe uma categoria com este nome'
          : 'Erro ao adicionar categoria';
      set({ error: errorMessage, loading: false });
      console.error('Error adding category:', error);
      throw error;
    }
  },

  updateCategory: async (id: number, data: CategoryFormData) => {
    set({ loading: true, error: null });
    try {
      const now = Date.now();
      const toNullIfEmpty = (value: string | undefined) =>
        value && value.trim() !== '' ? value : null;

      const toNullIfZero = (value: number | undefined) =>
        value && value > 0 ? value : null;

      await window.electron.db.execute(
        `UPDATE categories SET
          name = ?, description = ?, parent_id = ?, active = ?, updated_at = ?
        WHERE id = ?`,
        [
          data.name,
          toNullIfEmpty(data.description),
          toNullIfZero(data.parentId),
          data.active ? 1 : 0,
          now,
          id,
        ]
      );
      await get().fetchCategories();
      set({ loading: false });
    } catch (error: any) {
      const errorMessage =
        error.message?.includes('UNIQUE') || error.message?.includes('unique')
          ? 'Já existe uma categoria com este nome'
          : 'Erro ao atualizar categoria';
      set({ error: errorMessage, loading: false });
      console.error('Error updating category:', error);
      throw error;
    }
  },

  deleteCategory: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const now = Date.now();
      await window.electron.db.execute(
        'UPDATE categories SET active = 0, updated_at = ? WHERE id = ?',
        [now, id]
      );
      await get().fetchCategories();
      set({ loading: false });
    } catch (error) {
      set({ error: 'Erro ao excluir categoria', loading: false });
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  getRootCategories: () => {
    return get().categories.filter(cat => !cat.parentId);
  },

  getChildCategories: (parentId: number) => {
    return get().categories.filter(cat => cat.parentId === parentId);
  },

  getCategoriesTree: () => {
    const { categories } = get();

    const buildTree = (parentId: number | undefined, level: number): CategoryWithChildren[] => {
      return categories
        .filter(cat => cat.parentId === parentId || (!cat.parentId && !parentId))
        .map(cat => {
          const children = buildTree(cat.id, level + 1);

          // Calcula estatísticas agregadas: próprias + de todos os filhos recursivamente
          const aggregateStats = (nodes: CategoryWithChildren[]): { products: number; quantity: number; value: number } => {
            return nodes.reduce((acc, node) => {
              const childStats = aggregateStats(node.children);
              return {
                products: acc.products + (node.productCount || 0) + childStats.products,
                quantity: acc.quantity + (node.stockQuantity || 0) + childStats.quantity,
                value: acc.value + (node.stockValue || 0) + childStats.value,
              };
            }, { products: 0, quantity: 0, value: 0 });
          };

          const childStats = aggregateStats(children);

          return {
            ...cat,
            level,
            children,
            // Soma os valores próprios com os dos filhos
            productCount: (cat.productCount || 0) + childStats.products,
            stockQuantity: (cat.stockQuantity || 0) + childStats.quantity,
            stockValue: (cat.stockValue || 0) + childStats.value,
          };
        });
    };

    return buildTree(undefined, 0);
  },
}));
