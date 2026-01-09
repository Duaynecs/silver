import type { StockMovement } from '@/types';
import { mapDbToType } from '@/utils/dbMapper';
import { create } from 'zustand';
import { useCompaniesStore } from './companiesStore';

interface StockMovementWithProduct extends StockMovement {
  productName: string;
  productBarcode?: string;
}

interface StockMovementsState {
  movements: StockMovementWithProduct[];
  loading: boolean;
  error: string | null;

  fetchMovements: (productId?: number, limit?: number) => Promise<void>;
  addEntry: (
    productId: number,
    quantity: number,
    unitCost: number,
    notes?: string
  ) => Promise<void>;
  addAdjustment: (
    productId: number,
    newQuantity: number,
    notes?: string
  ) => Promise<void>;
}

export const useStockMovementsStore = create<StockMovementsState>((set) => ({
  movements: [],
  loading: false,
  error: null,

  fetchMovements: async (productId?: number, limit = 100) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ movements: [], loading: false });
        return;
      }

      let query = `
        SELECT
          sm.*,
          p.name as productName,
          p.barcode as productBarcode
        FROM stock_movements sm
        INNER JOIN products p ON sm.product_id = p.id
        WHERE sm.company_id = ?
      `;

      const params: any[] = [companyId];

      if (productId) {
        query += ' AND sm.product_id = ?';
        params.push(productId);
      }

      query += ' ORDER BY sm.movement_date DESC LIMIT ?';
      params.push(limit);

      const result = await window.electron.db.query(query, params);
      // Para queries com JOIN, precisamos mapear manualmente os campos do stock_movements
      // e manter os campos do JOIN (productName, productBarcode) como estão
      const movements = (result as any[]).map((row) => {
        const movement = mapDbToType<StockMovement>(row);
        return {
          ...movement,
          productName: row.productName,
          productBarcode: row.productBarcode,
        } as StockMovementWithProduct;
      });
      set({ movements, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar movimentações', loading: false });
      console.error('Error fetching stock movements:', error);
    }
  },

  addEntry: async (
    productId: number,
    quantity: number,
    unitCost: number,
    notes?: string
  ) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();

      // Registra a movimentação
      await window.electron.db.execute(
        `INSERT INTO stock_movements (
          product_id, type, quantity, unit_cost, notes, movement_date, company_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, 'entrada', quantity, unitCost, notes || null, now, companyId, now]
      );

      // Atualiza o estoque do produto
      await window.electron.db.execute(
        'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?',
        [quantity, now, productId]
      );

      set({ loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao registrar entrada',
        loading: false,
      });
      console.error('Error adding stock entry:', error);
      throw error;
    }
  },

  addAdjustment: async (
    productId: number,
    newQuantity: number,
    notes?: string
  ) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const now = Date.now();

      // Busca quantidade atual
      const result = await window.electron.db.query(
        'SELECT stock_quantity FROM products WHERE id = ? AND company_id = ?',
        [productId, companyId]
      );

      if (!result || result.length === 0) {
        throw new Error('Produto não encontrado');
      }

      const currentQuantity = result[0].stock_quantity;
      const difference = newQuantity - currentQuantity;

      // Registra a movimentação (sem custo unitário, pois foi removido)
      await window.electron.db.execute(
        `INSERT INTO stock_movements (
          product_id, type, quantity, unit_cost, notes, movement_date, company_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, 'ajuste', difference, null, notes || null, now, companyId, now]
      );

      // Atualiza o estoque do produto
      await window.electron.db.execute(
        'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?',
        [newQuantity, now, productId]
      );

      set({ loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao registrar ajuste',
        loading: false,
      });
      console.error('Error adding stock adjustment:', error);
      throw error;
    }
  },
}));
