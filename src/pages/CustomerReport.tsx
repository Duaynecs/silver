import { useState, useEffect } from 'react';
import { useCustomersStore } from '@/stores/customersStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Search, ShoppingBag, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface CustomerSale {
  id: number;
  saleNumber: string;
  saleDate: number;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  items: SaleItem[];
  payments: SalePayment[];
}

interface SaleItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SalePayment {
  paymentMethodName: string;
  amount: number;
}

interface CustomerStats {
  totalSales: number;
  totalAmount: number;
  totalDiscount: number;
  averageTicket: number;
  lastPurchaseDate: number | null;
  purchasedThisMonth: boolean;
  uniqueProducts: number;
}

export default function CustomerReport() {
  const { customers, fetchCustomers } = useCustomersStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sales, setSales] = useState<CustomerSale[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSales, setExpandedSales] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchCustomers();
    // Define o mês atual como período padrão
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, [fetchCustomers]);

  const loadCustomerReport = async () => {
    if (!selectedCustomerId) {
      alert('Selecione um cliente');
      return;
    }

    setLoading(true);
    try {
      const customerId = parseInt(selectedCustomerId);
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate + 'T23:59:59').getTime() : Date.now();

      // Busca vendas do cliente
      const salesData = await window.electron.db.query(
        `SELECT
          s.id,
          s.sale_number as saleNumber,
          s.sale_date as saleDate,
          s.total_amount as totalAmount,
          s.discount,
          s.final_amount as finalAmount
        FROM sales s
        WHERE s.customer_id = ?
          AND s.sale_date BETWEEN ? AND ?
          AND s.status = 'completed'
        ORDER BY s.sale_date DESC`,
        [customerId, start, end]
      );

      const salesWithDetails: CustomerSale[] = [];

      for (const sale of salesData as any[]) {
        // Busca itens da venda
        const items = await window.electron.db.query(
          `SELECT
            p.name as productName,
            si.quantity,
            si.unit_price as unitPrice,
            si.total
          FROM sale_items si
          JOIN products p ON p.id = si.product_id
          WHERE si.sale_id = ?`,
          [sale.id]
        );

        // Busca pagamentos da venda
        const payments = await window.electron.db.query(
          `SELECT
            pm.name as paymentMethodName,
            sp.amount
          FROM sale_payments sp
          JOIN payment_methods pm ON pm.id = sp.payment_method_id
          WHERE sp.sale_id = ?`,
          [sale.id]
        );

        salesWithDetails.push({
          ...sale,
          items: items as SaleItem[],
          payments: payments as SalePayment[],
        });
      }

      setSales(salesWithDetails);

      // Calcula estatísticas
      if (salesWithDetails.length > 0) {
        const totalAmount = salesWithDetails.reduce((sum, s) => sum + s.finalAmount, 0);
        const totalDiscount = salesWithDetails.reduce((sum, s) => sum + s.discount, 0);
        const lastPurchaseDate = Math.max(...salesWithDetails.map(s => s.saleDate));

        // Verifica se comprou neste mês
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const purchasedThisMonth = salesWithDetails.some(s => s.saleDate >= firstDayOfMonth);

        // Conta produtos únicos
        const uniqueProductsSet = new Set<string>();
        salesWithDetails.forEach(sale => {
          sale.items.forEach(item => {
            uniqueProductsSet.add(item.productName);
          });
        });

        setStats({
          totalSales: salesWithDetails.length,
          totalAmount,
          totalDiscount,
          averageTicket: totalAmount / salesWithDetails.length,
          lastPurchaseDate,
          purchasedThisMonth,
          uniqueProducts: uniqueProductsSet.size,
        });
      } else {
        setStats({
          totalSales: 0,
          totalAmount: 0,
          totalDiscount: 0,
          averageTicket: 0,
          lastPurchaseDate: null,
          purchasedThisMonth: false,
          uniqueProducts: 0,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      alert('Erro ao carregar relatório do cliente');
    } finally {
      setLoading(false);
    }
  };

  const toggleSale = (saleId: number) => {
    setExpandedSales(prev => {
      const newSet = new Set(prev);
      if (newSet.has(saleId)) {
        newSet.delete(saleId);
      } else {
        newSet.add(saleId);
      }
      return newSet;
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatório de Cliente</h1>
        <p className="text-muted-foreground">
          Visualize o histórico de compras e estatísticas de cada cliente
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name} {customer.cpfCnpj ? `- ${customer.cpfCnpj}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={loadCustomerReport} disabled={loading || !selectedCustomerId}>
            {loading ? 'Carregando...' : 'Gerar Relatório'}
          </Button>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && selectedCustomer && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Vendas</p>
                    <p className="text-2xl font-bold">{stats.totalSales}</p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.averageTicket)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Última Compra</p>
                    <p className="text-lg font-bold">
                      {stats.lastPurchaseDate ? formatDate(stats.lastPurchaseDate) : '-'}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-orange-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informações adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span className="font-medium">Nome:</span>
                  <span>{selectedCustomer.name}</span>
                </div>
                {selectedCustomer.cpfCnpj && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <span className="font-medium">CPF/CNPJ:</span>
                    <span>{selectedCustomer.cpfCnpj}</span>
                  </div>
                )}
                {selectedCustomer.phone && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <span className="font-medium">Telefone:</span>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span className="font-medium">Comprou neste mês:</span>
                  <span className={stats.purchasedThisMonth ? 'text-green-600 font-bold' : 'text-muted-foreground'}>
                    {stats.purchasedThisMonth ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span className="font-medium">Produtos Únicos Comprados:</span>
                  <span className="font-bold">{stats.uniqueProducts}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span className="font-medium">Total em Descontos:</span>
                  <span className="text-orange-600 font-bold">{formatCurrency(stats.totalDiscount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Vendas */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma venda encontrada no período selecionado
                </div>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale) => {
                    const isExpanded = expandedSales.has(sale.id);
                    return (
                      <div key={sale.id} className="border rounded-lg">
                        <div
                          className="p-4 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => toggleSale(sale.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-medium">Venda #{sale.saleNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(sale.saleDate)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(sale.finalAmount)}</p>
                              {sale.discount > 0 && (
                                <p className="text-sm text-orange-600">
                                  Desconto: {formatCurrency(sale.discount)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t p-4 space-y-4 bg-muted/30">
                            {/* Itens da venda */}
                            <div>
                              <h4 className="font-medium mb-2">Itens Comprados</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">Preço Unit.</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sale.items.map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.productName}</TableCell>
                                      <TableCell className="text-right">{item.quantity}</TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(item.unitPrice)}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(item.total)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>

                            {/* Formas de pagamento */}
                            <div>
                              <h4 className="font-medium mb-2">Formas de Pagamento</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Forma de Pagamento</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sale.payments.map((payment, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{payment.paymentMethodName}</TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(payment.amount)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
