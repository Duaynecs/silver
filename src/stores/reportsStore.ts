import { create } from 'zustand';
import { mapDbToType, mapDbArrayToType } from '@/utils/dbMapper';
import { useCompaniesStore } from './companiesStore';

interface SalesReport {
  totalSales: number;
  totalAmount: number;
  totalDiscount: number;
  averageTicket: number;
  salesByDate: {
    date: string;
    count: number;
    amount: number;
  }[];
}

interface ProductReport {
  productId: number;
  productName: string;
  productBarcode?: string;
  quantitySold: number;
  totalAmount: number;
}

interface PaymentMethodReport {
  paymentMethodId: number;
  paymentMethodName: string;
  totalTransactions: number;
  totalAmount: number;
}

interface CustomerReport {
  customerId: number | null;
  customerName: string;
  totalSales: number;
  totalAmount: number;
}

export interface SaleListItem {
  id: number;
  saleNumber: string;
  customerName: string | null;
  finalAmount: number;
  saleDate: number;
}

export interface SaleDetail {
  id: number;
  saleNumber: string;
  customerName?: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  changeAmount: number;
  saleDate: number;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }[];
  payments: {
    paymentMethodName: string;
    amount: number;
  }[];
}

interface ReportsState {
  salesReport: SalesReport | null;
  productsReport: ProductReport[];
  paymentMethodsReport: PaymentMethodReport[];
  customersReport: CustomerReport[];
  salesList: SaleListItem[];
  loading: boolean;
  error: string | null;

  fetchSalesReport: (startDate: number, endDate: number) => Promise<void>;
  fetchProductsReport: (startDate: number, endDate: number, limit?: number) => Promise<void>;
  fetchPaymentMethodsReport: (startDate: number, endDate: number) => Promise<void>;
  fetchCustomersReport: (startDate: number, endDate: number) => Promise<void>;
  fetchSalesList: (startDate: number, endDate: number) => Promise<void>;
  fetchSaleDetails: (saleId: number) => Promise<SaleDetail | null>;
}

export const useReportsStore = create<ReportsState>((set) => ({
  salesReport: null,
  productsReport: [],
  paymentMethodsReport: [],
  customersReport: [],
  salesList: [],
  loading: false,
  error: null,

  fetchSalesReport: async (startDate: number, endDate: number) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ salesReport: null, loading: false });
        return;
      }

      // Busca totais gerais
      const totalsResult = await window.electron.db.query(
        `SELECT
          COUNT(*) as total_sales,
          COALESCE(SUM(final_amount), 0) as total_amount,
          COALESCE(SUM(discount), 0) as total_discount
        FROM sales
        WHERE status = 'completed'
          AND company_id = ?
          AND sale_date >= ?
          AND sale_date <= ?`,
        [companyId, startDate, endDate]
      );

      const totalsDb = totalsResult[0] || {
        total_sales: 0,
        total_amount: 0,
        total_discount: 0,
      };

      const totals = mapDbToType<{ totalSales: number; totalAmount: number; totalDiscount: number }>(totalsDb);

      // Busca vendas agrupadas por dia
      const dailyResult = await window.electron.db.query(
        `SELECT
          DATE(sale_date / 1000, 'unixepoch', 'localtime') as date,
          COUNT(*) as count,
          COALESCE(SUM(final_amount), 0) as amount
        FROM sales
        WHERE status = 'completed'
          AND company_id = ?
          AND sale_date >= ?
          AND sale_date <= ?
        GROUP BY DATE(sale_date / 1000, 'unixepoch', 'localtime')
        ORDER BY date DESC`,
        [companyId, startDate, endDate]
      );

      const salesByDate = mapDbArrayToType<{ date: string; count: number; amount: number }>(dailyResult || []);

      const salesReport: SalesReport = {
        totalSales: totals.totalSales,
        totalAmount: totals.totalAmount,
        totalDiscount: totals.totalDiscount,
        averageTicket: totals.totalSales > 0 ? totals.totalAmount / totals.totalSales : 0,
        salesByDate,
      };

      set({ salesReport, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar relatório de vendas', loading: false });
      console.error('Error fetching sales report:', error);
    }
  },

  fetchProductsReport: async (startDate: number, endDate: number, limit = 20) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ productsReport: [], loading: false });
        return;
      }

      const result = await window.electron.db.query(
        `SELECT
          p.id as product_id,
          p.name as product_name,
          p.barcode as product_barcode,
          SUM(si.quantity) as quantity_sold,
          SUM(si.total) as total_amount
        FROM sale_items si
        INNER JOIN sales s ON si.sale_id = s.id
        INNER JOIN products p ON si.product_id = p.id
        WHERE s.status = 'completed'
          AND s.company_id = ?
          AND s.sale_date >= ?
          AND s.sale_date <= ?
        GROUP BY p.id, p.name, p.barcode
        ORDER BY quantity_sold DESC
        LIMIT ?`,
        [companyId, startDate, endDate, limit]
      );

      const productsReport = mapDbArrayToType<ProductReport>(result || []);
      set({ productsReport, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar relatório de produtos', loading: false });
      console.error('Error fetching products report:', error);
    }
  },

  fetchPaymentMethodsReport: async (startDate: number, endDate: number) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ paymentMethodsReport: [], loading: false });
        return;
      }

      const result = await window.electron.db.query(
        `SELECT
          pm.id as payment_method_id,
          pm.name as payment_method_name,
          COUNT(DISTINCT sp.sale_id) as total_transactions,
          COALESCE(SUM(sp.amount), 0) as total_amount
        FROM sale_payments sp
        INNER JOIN payment_methods pm ON sp.payment_method_id = pm.id
        INNER JOIN sales s ON sp.sale_id = s.id
        WHERE s.status = 'completed'
          AND s.company_id = ?
          AND s.sale_date >= ?
          AND s.sale_date <= ?
        GROUP BY pm.id, pm.name
        ORDER BY total_amount DESC`,
        [companyId, startDate, endDate]
      );

      const paymentMethodsReport = mapDbArrayToType<PaymentMethodReport>(result || []);
      set({ paymentMethodsReport, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar relatório de formas de pagamento', loading: false });
      console.error('Error fetching payment methods report:', error);
    }
  },

  fetchCustomersReport: async (startDate: number, endDate: number) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ customersReport: [], loading: false });
        return;
      }

      const result = await window.electron.db.query(
        `SELECT
          COALESCE(c.id, 0) as customer_id,
          COALESCE(c.name, 'Cliente não identificado') as customer_name,
          COUNT(s.id) as total_sales,
          COALESCE(SUM(s.final_amount), 0) as total_amount
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.status = 'completed'
          AND s.company_id = ?
          AND s.sale_date >= ?
          AND s.sale_date <= ?
        GROUP BY c.id, c.name
        ORDER BY total_amount DESC`,
        [companyId, startDate, endDate]
      );

      const customersReport = mapDbArrayToType<CustomerReport>(result || []);
      set({ customersReport, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar relatório de clientes', loading: false });
      console.error('Error fetching customers report:', error);
    }
  },

  fetchSalesList: async (startDate: number, endDate: number) => {
    set({ loading: true, error: null });
    try {
      const companyId = useCompaniesStore.getState().currentCompanyId;
      if (!companyId) {
        set({ salesList: [], loading: false });
        return;
      }

      const result = await window.electron.db.query(
        `SELECT
          s.id,
          s.sale_number,
          c.name as customer_name,
          s.final_amount,
          s.sale_date
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.status = 'completed'
          AND s.company_id = ?
          AND s.sale_date >= ?
          AND s.sale_date <= ?
        ORDER BY s.sale_date DESC`,
        [companyId, startDate, endDate]
      );

      const salesList = mapDbArrayToType<SaleListItem>(result || []);
      set({ salesList, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar lista de vendas', loading: false });
      console.error('Error fetching sales list:', error);
    }
  },

  fetchSaleDetails: async (saleId: number) => {
    try {
      // Busca dados da venda
      const saleResult = await window.electron.db.query(
        `SELECT
          s.id,
          s.sale_number,
          s.total_amount,
          s.discount,
          s.final_amount,
          s.change_amount,
          s.sale_date,
          c.name as customer_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.id = ?`,
        [saleId]
      );

      if (!saleResult || saleResult.length === 0) {
        return null;
      }

      const sale = mapDbToType<{
        id: number;
        saleNumber: string;
        totalAmount: number;
        discount: number;
        finalAmount: number;
        changeAmount: number;
        saleDate: number;
        customerName?: string;
      }>(saleResult[0]);

      // Busca itens da venda
      const itemsResult = await window.electron.db.query(
        `SELECT
          p.name as product_name,
          si.quantity,
          si.unit_price,
          si.discount,
          si.total
        FROM sale_items si
        INNER JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?`,
        [saleId]
      );

      const items = mapDbArrayToType<{
        productName: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
      }>(itemsResult || []);

      // Busca pagamentos da venda
      const paymentsResult = await window.electron.db.query(
        `SELECT
          pm.name as payment_method_name,
          sp.amount
        FROM sale_payments sp
        INNER JOIN payment_methods pm ON sp.payment_method_id = pm.id
        WHERE sp.sale_id = ?`,
        [saleId]
      );

      const payments = mapDbArrayToType<{
        paymentMethodName: string;
        amount: number;
      }>(paymentsResult || []);

      return {
        ...sale,
        items,
        payments,
      };
    } catch (error) {
      console.error('Error fetching sale details:', error);
      return null;
    }
  },
}));
