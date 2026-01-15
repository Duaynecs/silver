import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportsStore } from '@/stores/reportsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, ShoppingCart, CreditCard, Package, Calendar, Percent, Users, Eye, FileText } from 'lucide-react';
import SaleDetailsModal from '@/components/reports/SaleDetailsModal';

export default function Reports() {
  const {
    salesReport,
    productsReport,
    paymentMethodsReport,
    customersReport,
    salesList,
    loading,
    fetchSalesReport,
    fetchProductsReport,
    fetchPaymentMethodsReport,
    fetchCustomersReport,
    fetchSalesList,
  } = useReportsStore();

  const { commissionPercentage, fetchSettings } = useSettingsStore();
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const handleViewSaleDetails = (saleId: number) => {
    setSelectedSaleId(saleId);
    setDetailsModalOpen(true);
  };

  useEffect(() => {
    // Define período padrão: data de hoje (inicial e final)
    // Usa data local em vez de UTC para evitar problemas de timezone
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;

    setStartDate(localDateStr);
    setEndDate(localDateStr);

    // Carrega as configurações
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [startDate, endDate]);

  const loadReports = () => {
    // Cria as datas no fuso horário local para evitar problemas de timezone
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0).getTime();
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999).getTime();

    fetchSalesReport(start, end);
    fetchProductsReport(start, end, 10);
    fetchPaymentMethodsReport(start, end);
    fetchCustomersReport(start, end);
    fetchSalesList(start, end);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Análises e estatísticas de vendas</p>
      </div>

      {/* Filtro de Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr,1fr,auto] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={loadReports} disabled={loading || !startDate || !endDate}>
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Relatório de Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Relatório de Cliente
          </CardTitle>
          <CardDescription>
            Análise detalhada de vendas por cliente individual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Visualize o histórico completo de compras de cada cliente, incluindo produtos adquiridos,
                formas de pagamento utilizadas e estatísticas de compra.
              </p>
            </div>
            <Button
              onClick={() => navigate('/reports/customers')}
              className="flex items-center gap-2 ml-4"
            >
              <FileText className="w-4 h-4" />
              Abrir Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      {salesReport && (
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                Total de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesReport.totalSales}</div>
              <p className="text-xs text-muted-foreground">vendas realizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesReport.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">valor total vendido</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesReport.averageTicket)}</div>
              <p className="text-xs text-muted-foreground">valor médio por venda</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-500" />
                Descontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesReport.totalDiscount)}</div>
              <p className="text-xs text-muted-foreground">total em descontos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-500" />
                Comissão ({commissionPercentage}%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency((salesReport.totalAmount * commissionPercentage) / 100)}
              </div>
              <p className="text-xs text-muted-foreground">sobre faturamento</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Vendas por Dia */}
        {salesReport && salesReport.salesByDate.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Vendas</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReport.salesByDate.map((day, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(day.date)}</TableCell>
                        <TableCell className="text-center">{day.count}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(day.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formas de Pagamento */}
        {paymentMethodsReport.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead className="text-center">Transações</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethodsReport.map((pm) => (
                      <TableRow key={pm.paymentMethodId}>
                        <TableCell className="font-medium">{pm.paymentMethodName}</TableCell>
                        <TableCell className="text-center">{pm.totalTransactions}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(pm.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Produtos Mais Vendidos */}
      {productsReport.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Quantidade Vendida</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsReport.map((product, index) => (
                    <TableRow key={product.productId}>
                      <TableCell className="font-medium">{index + 1}º</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.productName}</div>
                          {product.productBarcode && (
                            <div className="text-sm text-muted-foreground">
                              Código: {product.productBarcode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {product.quantitySold} un.
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendas por Cliente */}
      {customersReport.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Vendas por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Total de Vendas</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersReport.map((customer) => (
                    <TableRow key={customer.customerId || 0}>
                      <TableCell className="font-medium">{customer.customerName}</TableCell>
                      <TableCell className="text-center">{customer.totalSales}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(customer.totalAmount / customer.totalSales)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Vendas */}
      {salesList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Lista de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cupom</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-center w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesList.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                      <TableCell>{sale.customerName || 'Cliente não identificado'}</TableCell>
                      <TableCell>{formatDateTime(sale.saleDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.finalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSaleDetails(sale.id)}
                          title="Ver detalhes do cupom"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes da Venda */}
      <SaleDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        saleId={selectedSaleId}
      />

      {/* Mensagem quando não há dados */}
      {!loading && !salesReport && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Selecione um período e clique em "Atualizar" para visualizar os relatórios
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há vendas no período */}
      {!loading && salesReport && salesReport.totalSales === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhuma venda encontrada no período selecionado
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
