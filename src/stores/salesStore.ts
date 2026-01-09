import { create } from 'zustand';
import type { Sale, SaleItem, SalePayment, SaleItemInput, PaymentInput } from '@/types';
import { useCompaniesStore } from './companiesStore';

interface SalesState {
  currentSale: {
    items: SaleItemInput[];
    payments: PaymentInput[];
    discount: number;
    customerId?: number;
  };
  addItem: (item: SaleItemInput) => void;
  removeItem: (index: number) => void;
  updateItemQuantity: (index: number, quantity: number) => void;
  addPayment: (payment: PaymentInput) => void;
  removePayment: (index: number) => void;
  setDiscount: (discount: number) => void;
  setCustomer: (customerId?: number) => void;
  getTotalItems: () => number;
  getTotalDiscount: () => number;
  getFinalAmount: () => number;
  getTotalPaid: () => number;
  getRemainingAmount: () => number;
  getChangeAmount: () => number;
  completeSale: (cashRegisterId: number) => Promise<string>;
  clearSale: () => void;
}

export const useSalesStore = create<SalesState>((set, get) => ({
  currentSale: {
    items: [],
    payments: [],
    discount: 0,
  },

  addItem: (item) => {
    set((state) => ({
      currentSale: {
        ...state.currentSale,
        items: [...state.currentSale.items, item],
      },
    }));
  },

  removeItem: (index) => {
    set((state) => ({
      currentSale: {
        ...state.currentSale,
        items: state.currentSale.items.filter((_, i) => i !== index),
      },
    }));
  },

  updateItemQuantity: (index, quantity) => {
    set((state) => {
      const items = [...state.currentSale.items];
      items[index].quantity = quantity;
      items[index].total = (items[index].unitPrice - items[index].discount) * quantity;
      return {
        currentSale: {
          ...state.currentSale,
          items,
        },
      };
    });
  },

  addPayment: (payment) => {
    set((state) => ({
      currentSale: {
        ...state.currentSale,
        payments: [...state.currentSale.payments, payment],
      },
    }));
  },

  removePayment: (index) => {
    set((state) => ({
      currentSale: {
        ...state.currentSale,
        payments: state.currentSale.payments.filter((_, i) => i !== index),
      },
    }));
  },

  setDiscount: (discount) => {
    set((state) => ({
      currentSale: {
        ...state.currentSale,
        discount,
      },
    }));
  },

  setCustomer: (customerId) => {
    set((state) => ({
      currentSale: {
        ...state.currentSale,
        customerId,
      },
    }));
  },

  getTotalItems: () => {
    const { items } = get().currentSale;
    return items.reduce((sum, item) => sum + item.total, 0);
  },

  getTotalDiscount: () => {
    const { discount } = get().currentSale;
    return discount;
  },

  getFinalAmount: () => {
    return get().getTotalItems() - get().getTotalDiscount();
  },

  getTotalPaid: () => {
    const { payments } = get().currentSale;
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  },

  getRemainingAmount: () => {
    return get().getFinalAmount() - get().getTotalPaid();
  },

  getChangeAmount: () => {
    const totalPaid = get().getTotalPaid();
    const finalAmount = get().getFinalAmount();
    const { payments } = get().currentSale;

    // Verifica se algum pagamento aceita troco
    const hasChangeablePayment = payments.some(p => p.paymentMethod.acceptsChange);

    // Se não houver método que aceita troco, retorna 0
    if (!hasChangeablePayment) {
      return 0;
    }

    // Se o total pago for maior que o valor final, retorna a diferença (troco)
    if (totalPaid > finalAmount) {
      return totalPaid - finalAmount;
    }

    return 0;
  },

  completeSale: async (cashRegisterId) => {
    const { currentSale } = get();
    const companyId = useCompaniesStore.getState().currentCompanyId;

    if (!companyId) {
      throw new Error('Nenhuma empresa selecionada');
    }

    const now = Date.now();
    const saleNumber = `V${now}`;

    try {
      // Inserir venda
      const changeAmount = get().getChangeAmount();
      const saleResult = await window.electron.db.execute(
        `INSERT INTO sales (sale_number, customer_id, cash_register_id, total_amount,
         discount, final_amount, change_amount, status, sale_date, company_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleNumber,
          currentSale.customerId || null,
          cashRegisterId,
          get().getTotalItems(),
          currentSale.discount,
          get().getFinalAmount(),
          changeAmount,
          'completed',
          now,
          companyId,
          now,
          now,
        ]
      );

      const saleId = (saleResult as any).lastInsertRowid;

      // Inserir itens da venda
      for (const item of currentSale.items) {
        await window.electron.db.execute(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [saleId, item.product.id, item.quantity, item.unitPrice, item.discount, item.total, now]
        );

        // Atualizar estoque (baixa)
        await window.electron.db.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product.id]
        );

        // Registrar movimentação de estoque
        await window.electron.db.execute(
          `INSERT INTO stock_movements (product_id, type, quantity, reference_id, reference_type,
           movement_date, company_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.product.id, 'saida', item.quantity, saleId, 'sale', now, companyId, now]
        );
      }

      // Inserir pagamentos
      for (const payment of currentSale.payments) {
        await window.electron.db.execute(
          'INSERT INTO sale_payments (sale_id, payment_method_id, amount, created_at) VALUES (?, ?, ?, ?)',
          [saleId, payment.paymentMethod.id, payment.amount, now]
        );
      }

      get().clearSale();
      return saleNumber;
    } catch (error) {
      console.error('Error completing sale:', error);
      throw error;
    }
  },

  clearSale: () => {
    set({
      currentSale: {
        items: [],
        payments: [],
        discount: 0,
      },
    });
  },
}));
