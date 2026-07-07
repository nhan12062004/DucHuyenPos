import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ClipboardList,
  Home,
  Menu,
  Package,
  Settings,
  Truck,
  User
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarProps {
  expanded: boolean;
  setExpanded: (val: boolean) => void;
}

const SIDEBAR_WIDTH = {
  expanded: 236,
  collapsed: 56
} as const;

const SIDEBAR_TRANSITION = {
  type: 'spring',
  stiffness: 280,
  damping: 30,
  mass: 0.9
} as const;

const CONTENT_TRANSITION = {
  duration: 0.2,
  ease: 'easeOut'
} as const;

const SUBMENU_VARIANTS = {
  closed: {
    height: 0,
    opacity: 0,
    y: -6
  },
  open: {
    height: 'auto',
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: 'easeOut',
      when: 'beforeChildren',
      staggerChildren: 0.04
    }
  }
} as const;

const SUBMENU_ITEM_VARIANTS = {
  closed: {
    opacity: 0,
    x: -8
  },
  open: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.18,
      ease: 'easeOut'
    }
  }
} as const;

const ACTIVE_ITEM_CLASSES = 'bg-[#0088FF] text-white hover:bg-[#1192FF] hover:text-white';
const DEFAULT_ITEM_CLASSES = 'text-slate-200 hover:bg-slate-800 hover:text-white';
const ACTIVE_SUBITEM_CLASSES = 'text-[#58AFFF] hover:text-[#8BC7FF]';
const DEFAULT_SUBITEM_CLASSES = 'text-white hover:text-blue-200';

const MENU_ITEMS = [
  { name: 'Tổng quan', path: '/', icon: Home, exact: true },
  {
    name: 'Đơn hàng',
    icon: ClipboardList,
    children: [
      { name: 'Tạo đơn và giao hàng', path: '/pos' },
      { name: 'Danh sách đơn hàng', path: '/orders' },
      { name: 'Hóa đơn điện tử', path: '/e-invoices' },
      { name: 'Khách trả hàng', path: '/returns' }
    ]
  },
  {
    name: 'Vận chuyển',
    icon: Truck,
    children: [{ name: 'Quản lý vận chuyển', path: '/shipping' }]
  },
  {
    name: 'Sản phẩm',
    icon: Package,
    children: [
      { name: 'Danh sách sản phẩm', path: '/products' },
      { name: 'Quản lý kho', path: '/inventory-management' },
      { name: 'Nhập hàng', path: '/purchase' },
      { name: 'Kiểm hàng', path: '/inventory' }
    ]
  },
  {
    name: 'Khách hàng',
    icon: User,
    children: [
      { name: 'Danh sách khách hàng', path: '/customers' },
      { name: 'Nhóm khách hàng', path: '/customer-groups' }
    ]
  }
] as const;

function SidebarLabel({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  return (
    <motion.span
      initial={false}
      animate={expanded ? { width: 'auto', opacity: 1, x: 0 } : { width: 0, opacity: 0, x: -8 }}
      transition={CONTENT_TRANSITION}
      className="block overflow-hidden whitespace-nowrap"
    >
      {children}
    </motion.span>
  );
}

export function Sidebar({ expanded, setExpanded }: SidebarProps) {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
  const location = useLocation();
  const isSettingsActive = location.pathname === '/settings' || location.pathname.startsWith('/settings/');

  React.useEffect(() => {
    MENU_ITEMS.forEach((item) => {
      if (!('children' in item)) {
        return;
      }

      const isChildActive = item.children.some(
        (child) => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
      );

      if (isChildActive) {
        setOpenGroups((prev) => ({ ...prev, [item.name]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupName: string) => {
    if (!expanded) {
      setExpanded(true);
      setOpenGroups({ [groupName]: true });
      return;
    }

    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed }}
      transition={SIDEBAR_TRANSITION}
      className="fixed top-0 left-0 z-40 flex h-screen shrink-0 flex-col bg-[#182537]"
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-slate-700/80',
          expanded ? 'px-4' : 'justify-center px-0'
        )}
      >
        <div className={cn('flex w-full items-center', expanded ? 'justify-between gap-3' : 'justify-center')}>
          <button
            type="button"
            onClick={() => {
              if (!expanded) {
                setExpanded(true);
              }
            }}
            title={expanded ? undefined : 'Mở rộng menu'}
            className={cn(
              'flex min-w-0 items-center overflow-hidden rounded-2xl',
              expanded ? 'flex-1' : 'w-10 justify-center'
            )}
          >
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={CONTENT_TRANSITION}
                  className="min-w-0 text-left"
                >
                  <span className="block whitespace-nowrap text-[11px] font-medium uppercase text-blue-200">
                    Vật tư điện nước
                  </span>
                  <span className="block whitespace-nowrap text-[18px] font-bold text-white">Đức Huyền</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <motion.div
            initial={false}
            animate={{
              width: expanded ? 40 : 0,
              opacity: expanded ? 1 : 0,
              marginLeft: expanded ? 12 : 0
            }}
            transition={CONTENT_TRANSITION}
            className="shrink-0 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              title="Thu gọn sidebar"
              tabIndex={expanded ? 0 : -1}
            >
              <Menu size={20} />
            </button>
          </motion.div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;

            if ('children' in item) {
              const isOpen = openGroups[item.name];
              const isChildActive = item.children.some(
                (child) => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
              );

              return (
                <li key={item.name}>
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={cn(
                      'flex w-full items-center py-3 text-[14.5px] transition-colors',
                      expanded ? 'justify-between px-4' : 'justify-center px-0',
                      (isChildActive && expanded) || (!expanded && isChildActive) ? ACTIVE_ITEM_CLASSES : DEFAULT_ITEM_CLASSES
                    )}
                  >
                    <div className={cn('flex min-w-0 items-center', expanded ? 'gap-4' : 'justify-center')}>
                      <Icon size={20} className="shrink-0" />
                      <SidebarLabel expanded={expanded}>
                        <span className="font-medium text-[15px]">{item.name}</span>
                      </SidebarLabel>
                    </div>

                    <motion.div
                      initial={false}
                      animate={expanded ? { width: 18, opacity: 1, marginLeft: 12 } : { width: 0, opacity: 0, marginLeft: 0 }}
                      transition={CONTENT_TRANSITION}
                      className="overflow-hidden"
                    >
                      <motion.div
                        initial={false}
                        animate={{ rotate: isOpen ? 0 : -90 }}
                        transition={CONTENT_TRANSITION}
                        className="flex origin-center items-center justify-center"
                      >
                        <ChevronDown size={18} />
                      </motion.div>
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && expanded && (
                      <motion.ul
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={SUBMENU_VARIANTS}
                        className="overflow-hidden bg-[#182537]"
                      >
                        {item.children.map((child) => {
                          const isActive =
                            location.pathname === child.path || location.pathname.startsWith(`${child.path}/`);

                          return (
                            <motion.li key={child.path} variants={SUBMENU_ITEM_VARIANTS}>
                              <NavLink
                                to={child.path}
                                className={cn(
                                  'block truncate px-4 py-2.5 pl-12 text-[14.5px] font-medium transition-colors',
                                  isActive ? ACTIVE_SUBITEM_CLASSES : DEFAULT_SUBITEM_CLASSES
                                )}
                              >
                                {child.name}
                              </NavLink>
                            </motion.li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            }

            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex w-full items-center py-3 text-[14.5px] transition-colors',
                    expanded ? 'gap-4 px-4' : 'justify-center px-0',
                    isActive ? ACTIVE_ITEM_CLASSES : DEFAULT_ITEM_CLASSES
                  )}
                >
                  <Icon size={20} className="shrink-0" />
                  <SidebarLabel expanded={expanded}>
                    <span className="font-medium text-[15px]">{item.name}</span>
                  </SidebarLabel>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-white/10 px-0 py-2">
        <NavLink
          to="/settings"
          className={cn(
            'flex w-full items-center py-2.5 text-[14.5px] transition-colors',
            expanded ? 'gap-4 px-4' : 'justify-center px-0',
            isSettingsActive ? ACTIVE_ITEM_CLASSES : DEFAULT_ITEM_CLASSES
          )}
        >
          <Settings size={20} className="shrink-0" />
          <SidebarLabel expanded={expanded}>
            <span className="font-medium text-[15px]">Cấu hình</span>
          </SidebarLabel>
        </NavLink>
      </div>
    </motion.aside>
  );
}
