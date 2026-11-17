import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Bike,
  Building2,
  CalendarClock,
  CalendarDays,
  ChefHat,
  ChevronRight,
  ClipboardList,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu as MenuIcon,
  Package,
  ReceiptText,
  Settings2,
  Store,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useAuth } from '../stores/auth.js';
import { cn } from '../utils/format.js';
import { ROLE_HOME, ROLE_LABELS } from '../utils/constants.js';
import { Avatar, Badge, Button } from '../components/ui/primitives.jsx';
import { InstallAppButton } from '../components/InstallAppButton.jsx';
import { RoleSwitcher } from '../components/RoleSwitcher.jsx';

const NAV_BY_ROLE = {
  SHOP_OWNER: {
    label: 'NEZTA Kitchen · Baner',
    sections: [
      {
        title: 'Operate',
        items: [
          { to: '/app/shop', label: 'Overview', icon: LayoutDashboard, end: true },
          { to: '/app/shop/orders', label: 'Orders', icon: ReceiptText },
          { to: '/app/shop/deliveries', label: 'Deliveries', icon: Bike },
          { to: '/app/kitchen', label: 'Kitchen display', icon: ChefHat },
        ],
      },
      {
        title: 'Menu & plans',
        items: [
          { to: '/app/shop/menu', label: 'Menu & products', icon: UtensilsCrossed },
          { to: '/app/shop/meal-boxes', label: 'Meal boxes', icon: Package },
          { to: '/app/shop/tiffin', label: 'Tiffin plans', icon: CalendarClock },
        ],
      },
      {
        title: 'Grow',
        items: [
          { to: '/app/shop/bulk', label: 'Bulk orders', icon: Building2 },
          { to: '/app/shop/customers', label: 'Customers', icon: Users },
          { to: '/app/shop/finance', label: 'Financials', icon: CreditCard },
        ],
      },
    ],
  },
  KITCHEN_STAFF: {
    label: 'NEZTA Kitchen · Baner',
    sections: [
      {
        title: 'Kitchen',
        items: [
          { to: '/app/kitchen', label: 'Preparation board', icon: ChefHat, end: true },
          { to: '/app/kitchen/bulk', label: 'Bulk production', icon: Building2 },
          { to: '/app/kitchen/orders', label: 'Order queue', icon: ClipboardList },
        ],
      },
    ],
  },
  RIDER: {
    label: 'NEZTA Delivery',
    sections: [
      {
        title: 'Deliveries',
        items: [
          { to: '/app/rider', label: 'My deliveries', icon: Bike, end: true },
          { to: '/app/rider/history', label: 'Delivery history', icon: Clock3 },
        ],
      },
    ],
  },
  PLATFORM_ADMIN: {
    label: 'NEZTA Marketplace',
    sections: [
      {
        title: 'Marketplace',
        items: [
          { to: '/app/platform', label: 'Overview', icon: BarChart3, end: true },
          { to: '/app/platform/shops', label: 'Shops', icon: Store },
          { to: '/app/platform/orders', label: 'Orders', icon: ReceiptText },
          { to: '/app/platform/subscriptions', label: 'Subscriptions', icon: CalendarDays },
        ],
      },
      {
        title: 'Configuration',
        items: [{ to: '/app/platform/settings', label: 'Commission & demo', icon: Settings2 }],
      },
    ],
  },
};

export function PortalLayout() {
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const config = NAV_BY_ROLE[user?.role] ?? NAV_BY_ROLE.SHOP_OWNER;
  const nav = config.sections;

  const pageLabel =
    nav
      .flatMap((section) => section.items)
      .filter((item) => location.pathname === item.to || (!item.end && location.pathname.startsWith(item.to)))
      .sort((a, b) => b.to.length - a.to.length)[0]?.label ?? 'Workspace';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function signOut() {
    logout();
    navigate('/login');
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-primary text-white">
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-brand-accent">
            <Leaf size={16} />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold tracking-[0.14em]">NEZTA</span>
            <span className="mt-0.5 block text-[9px] uppercase tracking-[0.24em] text-white/45">{config.label}</span>
          </span>
        </Link>
        <button
          type="button"
          className="rounded-lg p-1.5 text-white/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mx-4 mb-5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Signed in as</p>
            <p className="mt-0.5 text-[13px] font-semibold text-white">{user?.name ?? 'Demo user'}</p>
          </div>
          <Badge tone="gold" className="shrink-0 border-0">
            {ROLE_LABELS[user?.role] ?? 'Demo'}
          </Badge>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {nav.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition',
                      isActive
                        ? 'bg-white text-brand-primary shadow-sm'
                        : 'text-white/70 hover:bg-white/8 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={16} className={isActive ? 'text-brand-secondary' : 'text-white/50'} />
                      <span className="flex-1">{item.label}</span>
                      {isActive ? <ChevronRight size={13} className="text-brand-secondary/60" /> : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-4">
        <RoleSwitcher variant="sidebar" />
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={15} /> Sign out
        </button>
        <p className="px-1 pt-1 text-[10px] leading-relaxed text-white/30">
          Demo environment · seeded data · simulated payments
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F5F0]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] lg:block">{sidebar}</aside>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-brand-primary/40 backdrop-blur-[2px] lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-20 border-b border-brand-border/80 bg-[#F6F5F0]/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-primary lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon size={17} />
              </button>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="hidden text-brand-muted sm:inline">NEZTA</span>
                <ChevronRight size={13} className="hidden text-brand-muted/60 sm:inline" />
                <span className="font-semibold text-brand-primary">{pageLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-full bg-brand-accent/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6f5a20] sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b99a45]" />
                Demo data
              </span>
              <InstallAppButton variant="secondary" size="sm" label="Install" className="hidden sm:inline-flex" />
              <InstallAppButton variant="secondary" size="sm" compact className="sm:hidden" />
              <Link
                to="/"
                className="hidden h-9 items-center rounded-lg border border-brand-border bg-white px-3 text-[12px] font-semibold text-brand-primary transition hover:border-brand-secondary/40 sm:inline-flex"
              >
                Customer site
              </Link>
              <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-2 py-1.5">
                <Avatar name={user?.name ?? 'N'} size={26} />
                <div className="hidden leading-tight sm:block">
                  <p className="text-[12px] font-semibold text-brand-text">{user?.name ?? 'Demo user'}</p>
                  <p className="text-[10px] text-brand-muted">{ROLE_LABELS[user?.role] ?? 'Demo'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
          <h1 className="font-display text-[26px] font-semibold leading-tight text-brand-primary sm:text-[30px]">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-brand-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function DemoNote({ children, className }) {
  return (
    <p className={cn('mt-4 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#6f5a20]', className)}>
      {children}
    </p>
  );
}

export { ROLE_HOME };
