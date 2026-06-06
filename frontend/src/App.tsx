import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Orders } from './pages/Orders';
import { Products } from './pages/Products';
// "Danh sách sản phẩm quản lý kho" maps to Inventory in code context perhaps, but wait. Previous menu had "Danh sách sản phẩm" (/products) and "Kho hàng" (/inventory).
import { Inventory } from './pages/Inventory';
import { PurchaseImport as Purchase } from './pages/PurchaseImport';
import { Customers } from './pages/Customers';
import { Debts } from './pages/Debts';
import { Invoice } from './pages/Invoice';

import { Returns } from './pages/Returns';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Suppliers } from './pages/Suppliers';
import { CostPrice } from './pages/CostPrice';
import { CustomerGroups } from './pages/CustomerGroups';

const Settings = () => <div className="p-8"><h2 className="text-xl font-bold">Cài đặt hệ thống (Coming Soon)</h2></div>;

import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="orders" element={<Orders />} />
          <Route path="returns" element={<Returns />} />
          <Route path="products" element={<Products />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase" element={<Purchase />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="cost-price" element={<CostPrice />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customer-groups" element={<CustomerGroups />} />
          <Route path="debts" element={<Debts />} />
          <Route path="invoice" element={<Invoice />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <div className="square-ui">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}
