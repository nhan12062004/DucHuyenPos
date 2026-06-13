import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const SIDEBAR_WIDTH = {
  expanded: 280,
  collapsed: 68
} as const;

const LAYOUT_TRANSITION = {
  type: 'spring',
  stiffness: 280,
  damping: 30,
  mass: 0.9
} as const;

export function Layout() {
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const isPosRoute = location.pathname === '/pos';
  const isCustomerGroupCreateRoute = location.pathname === '/customer-groups/create';
  const isProductCreateRoute = location.pathname === '/products/create';
  const isCustomerCreateRoute = location.pathname === '/customers/create';
  const hasCustomHeader = isCustomerGroupCreateRoute || isProductCreateRoute || isCustomerCreateRoute;

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      <Sidebar expanded={expanded} setExpanded={setExpanded} />
      
      <motion.main 
        initial={false}
        animate={{ marginLeft: expanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed }}
        transition={LAYOUT_TRANSITION}
        className="flex-1 flex flex-col min-w-0"
      >
        {!hasCustomHeader ? <TopBar /> : null}
        <div className={`flex-1 overflow-auto ${!isPosRoute && !hasCustomHeader ? 'px-6 py-6 lg:px-7 xl:px-8' : 'p-0'}`}>
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}
