import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { pageModules } from './routeModules';

const POS = React.lazy(() => pageModules.pos().then((module) => ({ default: module.POS })));
const Orders = React.lazy(() => pageModules.orders().then((module) => ({ default: module.Orders })));
const Products = React.lazy(() => pageModules.products().then((module) => ({ default: module.Products })));
const ProductCreate = React.lazy(() => pageModules.productCreate().then((module) => ({ default: module.ProductCreate })));
const Inventory = React.lazy(() => pageModules.inventory().then((module) => ({ default: module.Inventory })));
const InventoryManagement = React.lazy(() => pageModules.inventoryManagement().then((module) => ({ default: module.InventoryManagement })));
const Purchase = React.lazy(() => pageModules.purchase().then((module) => ({ default: module.PurchaseImport })));
const Customers = React.lazy(() => pageModules.customers().then((module) => ({ default: module.Customers })));
const CustomerCreate = React.lazy(() => pageModules.customerCreate().then((module) => ({ default: module.CustomerCreate })));
const Debts = React.lazy(() => pageModules.debts().then((module) => ({ default: module.Debts })));
const Invoice = React.lazy(() => pageModules.invoice().then((module) => ({ default: module.Invoice })));
const EInvoices = React.lazy(() => pageModules.eInvoices().then((module) => ({ default: module.EInvoices })));
const ConsolidatedInvoiceCreate = React.lazy(() => pageModules.consolidatedInvoiceCreate().then((module) => ({ default: module.ConsolidatedInvoiceCreate })));
const Shipping = React.lazy(() => pageModules.shipping().then((module) => ({ default: module.Shipping })));
const Returns = React.lazy(() => pageModules.returns().then((module) => ({ default: module.Returns })));
const PurchaseOrders = React.lazy(() => pageModules.purchaseOrders().then((module) => ({ default: module.PurchaseOrders })));
const Suppliers = React.lazy(() => pageModules.suppliers().then((module) => ({ default: module.Suppliers })));
const CostPrice = React.lazy(() => pageModules.costPrice().then((module) => ({ default: module.CostPrice })));
const CustomerGroups = React.lazy(() => pageModules.customerGroups().then((module) => ({ default: module.CustomerGroups })));
const CustomerGroupCreate = React.lazy(() => pageModules.customerGroupCreate().then((module) => ({ default: module.CustomerGroupCreate })));

const Settings = () => <div className="p-8"><h2 className="text-xl font-bold">Cấu hình hệ thống (Coming Soon)</h2></div>;

import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { PageLoader } from './components/PageLoader';
import { ToastProvider } from './components/Toast';

const INITIAL_SIDEBAR_WIDTH = 236;
const APP_FONT_FAMILY = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function AuthLoadingScreen() {
  const isInvoiceRoute = window.location.pathname === '/invoice';

  if (isInvoiceRoute) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#F8FAFC]"
        style={{
          alignItems: 'center',
          background: '#F8FAFC',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <PageLoader text="Đang khởi tạo hệ thống..." minHeight="auto" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans"
      style={{
        background: '#F8FAFC',
        color: '#0f172a',
        fontFamily: APP_FONT_FAMILY,
        minHeight: '100vh',
      }}
    >
      <div
        className="fixed left-0 top-0 h-screen w-[236px] bg-[#182537]"
        style={{
          background: '#182537',
          height: '100vh',
          left: 0,
          position: 'fixed',
          top: 0,
          width: INITIAL_SIDEBAR_WIDTH,
        }}
      />
      <main
        className="flex min-h-screen flex-col"
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginLeft: INITIAL_SIDEBAR_WIDTH,
          minHeight: '100vh',
        }}
      >
        <div
          className="flex min-h-screen items-center justify-center"
          style={{
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <PageLoader text="Đang khởi tạo hệ thống..." minHeight="auto" />
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { isLoggedIn, isLoading } = useAuth();

  // Đang kiểm tra session -> hiện loading để tránh flash
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

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
          <Route path="e-invoices" element={<EInvoices />} />
          <Route path="consolidated-invoices/new" element={<ConsolidatedInvoiceCreate />} />
          <Route path="shipping" element={<Shipping />} />
          <Route path="products" element={<Products />} />
          <Route path="products/create" element={<ProductCreate />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase" element={<Purchase />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory-management" element={<InventoryManagement />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="cost-price" element={<CostPrice />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/create" element={<CustomerCreate />} />
          <Route path="customer-groups" element={<CustomerGroups />} />
          <Route path="customer-groups/create" element={<CustomerGroupCreate />} />
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
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </div>
  );
}
