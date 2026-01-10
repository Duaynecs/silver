import type { Product } from '@/types';
import { mapDbArrayToType, mapDbToType } from '@/utils/dbMapper';
import { create } from 'zustand';
import { useCompaniesStore } from './companiesStore';

interface ProductsState {
  products: Product[];
  loading: boolean;
  fetchProducts: () => Promise<void>;
  addProduct: (
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>
  ) => Promise<void>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  searchByBarcode: (barcode: string) => Promise<Product | null>;
  getNextSequentialBarcode: () => Promise<string>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ products: [], loading: false });
        return;
      }

      const result = await window.electron.db.query(
        'SELECT * FROM products WHERE active = 1 AND company_id = ? ORDER BY name',
        [companyId]
      );
      const products = mapDbArrayToType<Product>(result as any[]);
      set({ products, loading: false });
    } catch (error) {
      console.error('Error fetching products:', error);
      set({ loading: false });
    }
  },

  addProduct: async (product) => {
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();
      // Converte strings vazias para null
      const toNullIfEmpty = (value: string | undefined) =>
        value && value.trim() !== '' ? value : null;

      // Verifica se o código de barras já existe (se foi fornecido)
      const barcode = toNullIfEmpty(product.barcode);
      if (barcode) {
        const existing = await window.electron.db.query(
          'SELECT id, name FROM products WHERE barcode = ? AND active = 1 AND company_id = ?',
          [barcode, companyId]
        );
        if (existing && existing.length > 0) {
          const existingProduct = mapDbToType<{ id: number; name: string }>(existing[0]);
          throw new Error(`Este código de barras já está cadastrado para o produto: ${existingProduct.name}`);
        }
      }

      await window.electron.db.execute(
        `INSERT INTO products (barcode, name, description, sale_price,
         stock_quantity, min_stock, category, image_path, company_id, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          toNullIfEmpty(product.barcode),
          product.name,
          toNullIfEmpty(product.description),
          product.salePrice,
          product.stockQuantity,
          product.minStock,
          toNullIfEmpty(product.category),
          toNullIfEmpty(product.imagePath),
          companyId,
          product.active ? 1 : 0,
          now,
          now,
        ]
      );
      await get().fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  },

  updateProduct: async (id, product) => {
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();
      const updates: string[] = [];
      const values: any[] = [];

      // Converte strings vazias para null
      const toNullIfEmpty = (value: any) =>
        typeof value === 'string' && value.trim() === '' ? null : value;

      // Verifica se o código de barras já existe para outro produto (se foi fornecido)
      if (product.barcode !== undefined) {
        const barcode = toNullIfEmpty(product.barcode);
        if (barcode) {
          const existing = await window.electron.db.query(
            'SELECT id, name FROM products WHERE barcode = ? AND id != ? AND active = 1 AND company_id = ?',
            [barcode, id, companyId]
          );
          if (existing && existing.length > 0) {
            const existingProduct = mapDbToType<{ id: number; name: string }>(existing[0]);
            throw new Error(`Este código de barras já está cadastrado para o produto: ${existingProduct.name}`);
          }
        }
      }

      // Converte boolean para número (0 ou 1)
      const toNumber = (value: any) => {
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        return value;
      };

      Object.entries(product).forEach(([key, value]) => {
        if (
          key !== 'id' &&
          key !== 'createdAt' &&
          key !== 'updatedAt' &&
          value !== undefined
        ) {
          const snakeKey = key.replace(
            /[A-Z]/g,
            (letter) => `_${letter.toLowerCase()}`
          );
          updates.push(`${snakeKey} = ?`);

          // Trata o valor: converte strings vazias para null e booleanos para números
          let processedValue = toNullIfEmpty(value);
          processedValue = toNumber(processedValue);

          values.push(processedValue);
        }
      });

      updates.push('updated_at = ?');
      values.push(now, id);

      await window.electron.db.execute(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      await get().fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  deleteProduct: async (id) => {
    try {
      await window.electron.db.execute(
        'UPDATE products SET active = 0 WHERE id = ?',
        [id]
      );
      await get().fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  searchByBarcode: async (barcode) => {
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        return null;
      }

      const result = await window.electron.db.query(
        'SELECT * FROM products WHERE barcode = ? AND active = 1 AND company_id = ?',
        [barcode, companyId]
      );
      return result && result.length > 0
        ? mapDbToType<Product>(result[0])
        : null;
    } catch (error) {
      console.error('Error searching product:', error);
      return null;
    }
  },

  getNextSequentialBarcode: async () => {
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        return '000000000001';
      }

      // Busca todos os códigos de barras que tem formato sequencial (13 dígitos começando com 0)
      const result = await window.electron.db.query(
        `SELECT barcode FROM products
         WHERE barcode IS NOT NULL
           AND LENGTH(barcode) = 13
           AND barcode LIKE '0%'
           AND company_id = ?`,
        [companyId]
      );

      let nextSequence = 1;

      if (result && result.length > 0) {
        // Extrai os números sequenciais e encontra o maior
        const sequences = (result as any[])
          .map((row) => {
            const barcode = row.barcode as string;
            // Verifica se é numérico e extrai o número sequencial (primeiros 12 dígitos)
            if (/^\d+$/.test(barcode)) {
              return parseInt(barcode.slice(0, 12), 10);
            }
            return 0;
          })
          .filter((seq) => seq > 0);

        if (sequences.length > 0) {
          const maxSequence = Math.max(...sequences);
          nextSequence = maxSequence + 1;
        }
      }

      // Formata com zeros à esquerda para ter 12 dígitos
      const sequenceStr = nextSequence.toString().padStart(12, '0');

      return sequenceStr;
    } catch (error) {
      console.error('Error getting next sequential barcode:', error);
      // Em caso de erro, retorna sequência inicial
      return '000000000001';
    }
  },
}));
