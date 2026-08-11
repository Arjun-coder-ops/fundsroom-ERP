import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Challans from './pages/Challans';
import ChallanForm from './pages/ChallanForm';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            path="/customers"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <Customers />
              </PrivateRoute>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <CustomerDetail />
              </PrivateRoute>
            }
          />

          <Route path="/products" element={<Products />} />

          <Route
            path="/inventory"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'WAREHOUSE']}>
                <Inventory />
              </PrivateRoute>
            }
          />

          <Route
            path="/challans"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <Challans />
              </PrivateRoute>
            }
          />
          <Route
            path="/challans/new"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'SALES']}>
                <ChallanForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/challans/:id"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <ChallanForm />
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
