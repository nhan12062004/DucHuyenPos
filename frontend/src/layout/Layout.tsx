import React, { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { PageLoader } from '../components/PageLoader';

const SIDEBAR_WIDTH = {
  expanded: 236,
  collapsed: 56
} as const;

export function Layout() {
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const isPosRoute = location.pathname === '/pos';
  const isCustomerGroupCreateRoute = location.pathname === '/customer-groups/create';
  const isProductCreateRoute = location.pathname === '/products/create';
  const isCustomerCreateRoute = location.pathname === '/customers/create';
  const isInvoiceRoute = location.pathname === '/invoice';
  const hasCustomHeader = isCustomerGroupCreateRoute || isProductCreateRoute || isCustomerCreateRoute || isInvoiceRoute;

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {!isInvoiceRoute ? <Sidebar expanded={expanded} setExpanded={setExpanded} /> : null}
      
      <main
        style={{ marginLeft: isInvoiceRoute ? 0 : expanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed }}
        className="flex-1 flex flex-col min-w-0 transition-[margin-left] duration-200 ease-out"
      >
        {!hasCustomHeader ? <TopBar /> : null}
        <div className={`flex-1 overflow-auto ${!isPosRoute && !hasCustomHeader ? 'px-6 py-6 lg:px-7 xl:px-8' : 'p-0'}`}>
          <Suspense fallback={<PageLoader text="Đang mở trang..." />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
