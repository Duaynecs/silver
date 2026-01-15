import { create } from 'zustand';
import type { SaleItemInput, PaymentInput } from '@/types';
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

    try {
      // Prepara os dados da venda para o novo handler com protocolo
      const items = currentSale.items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      }));

      const payments = currentSale.payments.map(payment => ({
        paymentMethodId: payment.paymentMethod.id,
        amount: payment.amount,
      }));

      // Usa o novo handler que cria protocolo automaticamente
      const result = await window.electron.sales.complete({
        items,
        payments,
        customerId: currentSale.customerId,
        cashRegisterId,
        discount: currentSale.discount,
        companyId,
      });

      get().clearSale();
      return result.saleNumber;
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
