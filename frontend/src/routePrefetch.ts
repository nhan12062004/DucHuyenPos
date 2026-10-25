import { api } from './services/apiClient';

type PrefetchRequest = {
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
};

// These are the requests each menu page makes when opened with its default filters.
// Prefetching only starts when the user approaches a menu link.
const routeRequests: Record<string, PrefetchRequest[]> = {
  '/pos': [
    { path: '/inventory/branches' },
    { path: '/customers', params: { page: 1, limit: 100, status: 'active' } },
    { path: '/customers/debt-summary' },
    { path: '/products', params: { page: 1, limit: 100, status: 'active' } },
    { path: '/products/stock-summary' },
  ],
  '/orders': [
    { path: '/sales-orders', params: { page: 1, limit: 20, include_items: false } },
    { path: '/sales-orders/processing-summary', params: { days: 90 } },
  ],
  '/e-invoices': [
    { path: '/sales-orders', params: { page: 1, limit: 200 } },
    { path: '/invoices', params: { page: 1, limit: 200 } },
  ],
  '/returns': [
    { path: '/sales-orders', params: { page: 1, limit: 200 } },
    { path: '/sales-returns', params: { page: 1, limit: 200 } },
  ],
  '/shipping': [
    { path: '/sales-orders', params: { page: 1, limit: 200 } },
  ],
  '/products': [
    { path: '/products', params: { page: 1, limit: 200 } },
    { path: '/products/stock-summary' },
    { path: '/products/categories' },
    { path: '/products/brands' },
    { path: '/inventory/branches' },
  ],
  '/inventory-management': [
    { path: '/products', params: { page: 1, limit: 200 } },
    { path: '/products/stock-summary' },
  ],
  '/purchase': [
    { path: '/products', params: { page: 1, limit: 200, status: 'active' } },
    { path: '/suppliers', params: { page: 1, limit: 200, status: 'active' } },
    { path: '/inventory/branches' },
  ],
  '/inventory': [
    { path: '/inventory', params: { page: 1, limit: 200 } },
    { path: '/inventory/branches' },
  ],
  '/customers': [
    { path: '/customers', params: { page: 1, limit: 20 } },
    { path: '/customers/debt-summary' },
    { path: '/customers/groups' },
    { path: '/sales-orders', params: { page: 1, limit: 200 } },
  ],
  '/customer-groups': [
    { path: '/customers/groups' },
    { path: '/customers', params: { page: 1, limit: 200 } },
  ],
};

export function prefetchRouteData(path: string) {
  let requests = routeRequests[path];
  if (path === '/orders') {
    try {
      const saved = window.localStorage.getItem('duc-huyen-pos.orders.filters');
      const filters = saved ? JSON.parse(saved) as { activeTab?: string; searchTerm?: string } : null;
      const search = typeof filters?.searchTerm === 'string' ? filters.searchTerm.trim() : '';
      requests = [
        {
          path: '/sales-orders',
          params: {
            page: 1,
            limit: 20,
            include_items: false,
            search: search || undefined,
            status_in: filters?.activeTab === 'trading' ? 'draft,pending' : undefined,
          },
        },
        { path: '/sales-orders/processing-summary', params: { days: 90 } },
      ];
    } catch {
      // Use the default order requests if saved filters are invalid.
    }
  }
  if (!requests) return;
  void Promise.allSettled(requests.map((request) => api.prefetchGet(request.path, request.params)));
}
