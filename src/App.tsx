import MainLayout from '@/components/layouts/MainLayout';
import Backup from '@/pages/Backup';
import Categories from '@/pages/Categories';
import Companies from '@/pages/Companies';
import Customers from '@/pages/Customers';
import CustomerReport from '@/pages/CustomerReport';
import Dashboard from '@/pages/Dashboard';
import DataCloning from '@/pages/DataCloning';
import Inventory from '@/pages/Inventory';
import Login from '@/pages/Login';
import PaymentMethods from '@/pages/PaymentMethods';
import Products from '@/pages/Products';
import Reports from '@/pages/Reports';
import Sales from '@/pages/Sales';
import Settings from '@/pages/Settings';
import { useAuthStore } from '@/stores/authStore';
import { useCompaniesStore } from '@/stores/companiesStore';
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom';

function App() {
  const { isAuthenticated } = useAuthStore();
  const { currentCompanyId } = useCompaniesStore();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : !currentCompanyId ? (
              <Navigate to="/login" replace />
            ) : (
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/reports/customers" element={<CustomerReport />} />
                  <Route path="/payment-methods" element={<PaymentMethods />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/data-cloning" element={<DataCloning />} />
                  <Route path="/backup" element={<Backup />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
