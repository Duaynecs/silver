import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, ShoppingCart, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { useCompaniesStore } from '@/stores/companiesStore';

export default function Dashboard() {
  const { currentCompanyId } = useCompaniesStore();

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    todaySales: 0,
    todayRevenue: 0,
    lowStock: 0,
  });

  useEffect(() => {
    if (currentCompanyId) {
      loadDashboardData();
    }
  }, [currentCompanyId]);

  const loadDashboardData = async () => {
    if (!currentCompanyId) return;

    try {
      // Total de produtos ativos
      const productsResult = await window.electron.db.query(
        'SELECT COUNT(*) as count FROM products WHERE active = 1 AND company_id = ?',
        [currentCompanyId]
      );

      // Total de clientes ativos
      const customersResult = await window.electron.db.query(
        'SELECT COUNT(*) as count FROM customers WHERE active = 1 AND company_id = ?',
        [currentCompanyId]
      );

      // Vendas de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      const salesResult = await window.electron.db.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as revenue FROM sales WHERE sale_date >= ? AND status = ? AND company_id = ?',
        [todayTimestamp, 'completed', currentCompanyId]
      );

      // Produtos com estoque baixo
      const lowStockResult = await window.electron.db.query(
        'SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock AND active = 1 AND company_id = ?',
        [currentCompanyId]
      );

      setStats({
        totalProducts: productsResult[0].count,
        totalCustomers: customersResult[0].count,
        todaySales: salesResult[0].count,
        todayRevenue: salesResult[0].revenue,
        lowStock: lowStockResult[0].count,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStock > 0 && (
                <span className="text-destructive">
                  {stats.lowStock} com estoque baixo
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySales}</div>
            <p className="text-xs text-muted-foreground">Cupons</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">Total do dia</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Use o menu lateral para navegar pelas funcionalidades do sistema:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Cadastre produtos e clientes</li>
              <li>Registre vendas e controle o caixa</li>
              <li>Gerencie o inventário</li>
              <li>Visualize relatórios detalhados</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Banco de Dados</span>
              <span className="text-green-600 font-medium">Conectado</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sistema</span>
              <span className="text-green-600 font-medium">Operacional</span>
            </div>
            {stats.lowStock > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Alertas</span>
                <span className="text-destructive font-medium">
                  {stats.lowStock} produto(s) com estoque baixo
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
