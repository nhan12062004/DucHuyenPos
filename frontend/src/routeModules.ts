function preloadable<T>(load: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return () => {
    if (!pending) {
      pending = load().catch((error) => {
        pending = undefined;
        throw error;
      });
    }
    return pending;
  };
}

export const pageModules = {
  pos: preloadable(() => import('./pages/POS')),
  orders: preloadable(() => import('./pages/Orders')),
  products: preloadable(() => import('./pages/Products')),
  productCreate: preloadable(() => import('./pages/ProductCreate')),
  inventory: preloadable(() => import('./pages/Inventory')),
  inventoryManagement: preloadable(() => import('./pages/InventoryManagement')),
  purchase: preloadable(() => import('./pages/PurchaseImport')),
  customers: preloadable(() => import('./pages/Customers')),
  customerCreate: preloadable(() => import('./pages/CustomerCreate')),
  debts: preloadable(() => import('./pages/Debts')),
  invoice: preloadable(() => import('./pages/Invoice')),
  eInvoices: preloadable(() => import('./pages/EInvoices')),
  consolidatedInvoiceCreate: preloadable(() => import('./pages/ConsolidatedInvoiceCreate')),
  shipping: preloadable(() => import('./pages/Shipping')),
  returns: preloadable(() => import('./pages/Returns')),
  purchaseOrders: preloadable(() => import('./pages/PurchaseOrders')),
  suppliers: preloadable(() => import('./pages/Suppliers')),
  costPrice: preloadable(() => import('./pages/CostPrice')),
  customerGroups: preloadable(() => import('./pages/CustomerGroups')),
  customerGroupCreate: preloadable(() => import('./pages/CustomerGroupCreate')),
};

const menuModules: Record<string, () => Promise<unknown>> = {
  '/pos': pageModules.pos,
  '/orders': pageModules.orders,
  '/e-invoices': pageModules.eInvoices,
  '/returns': pageModules.returns,
  '/shipping': pageModules.shipping,
  '/products': pageModules.products,
  '/inventory-management': pageModules.inventoryManagement,
  '/purchase': pageModules.purchase,
  '/inventory': pageModules.inventory,
  '/customers': pageModules.customers,
  '/customer-groups': pageModules.customerGroups,
};

export function preloadRoute(path: string) {
  void menuModules[path]?.().catch(() => {
    // The page can retry its import when the user opens it.
  });
}
