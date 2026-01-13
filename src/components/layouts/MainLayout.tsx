import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useCompaniesStore } from '@/stores/companiesStore';
import { cn } from '@/utils/cn';
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  Users,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import packageJson from '../../../package.json';

interface MainLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  path: string;
  label: string;
  icon: any;
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  {
    path: '#',
    label: 'Cadastros',
    icon: FolderOpen,
    submenu: [
      { path: '/products', label: 'Produtos', icon: Package },
      { path: '/categories', label: 'Categorias', icon: Tags },
      { path: '/customers', label: 'Clientes', icon: Users },
      { path: '/payment-methods', label: 'Formas de Pagamento', icon: CreditCard },
    ],
  },
  { path: '/sales', label: 'Vendas', icon: ShoppingCart },
  { path: '/inventory', label: 'Inventário', icon: ClipboardList },
  { path: '/protocols', label: 'Protocolos', icon: FileText },
  { path: '/reports', label: 'Relatórios', icon: BarChart3 },
  { path: '/companies', label: 'Empresas', icon: Building2 },
  { path: '/backup', label: 'Backup', icon: Database },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { companies, fetchCompanies, getCurrentCompany } = useCompaniesStore();

  // Carrega empresas na montagem
  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, [companies.length, fetchCompanies]);

  const currentCompany = getCurrentCompany();

  // Verifica se algum submenu deve estar aberto baseado na rota atual
  const getInitialSubmenuState = () => {
    const cadastrosItems = ['/products', '/categories', '/customers', '/payment-methods'];
    return {
      cadastros: cadastrosItems.some((path) => location.pathname === path),
    };
  };

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(
    getInitialSubmenuState()
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isSubmenuItemActive = (submenu: MenuItem[]) => {
    return submenu.some((item) => location.pathname === item.path);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-primary">Silver</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Controle de Estoque
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              v{packageJson.version}
            </p>
            {currentCompany && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2 text-xs">
                  <Building2 className="w-3 h-3 text-primary" />
                  <span className="font-medium truncate" title={currentCompany.name}>
                    {currentCompany.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isSubmenuOpen =
                hasSubmenu && openSubmenus[item.label.toLowerCase()];
              const isSubmenuActive =
                hasSubmenu && isSubmenuItemActive(item.submenu!);

              if (hasSubmenu) {
                return (
                  <div key={item.path}>
                    <button
                      onClick={() => toggleSubmenu(item.label.toLowerCase())}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isSubmenuActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </div>
                      {isSubmenuOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {isSubmenuOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.submenu!.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubItemActive =
                            location.pathname === subItem.path;

                          return (
                            <button
                              key={subItem.path}
                              onClick={() => navigate(subItem.path)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                                isSubItemActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                              )}
                            >
                              <SubIcon className="w-4 h-4" />
                              {subItem.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.username}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
