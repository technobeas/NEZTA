import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ChefHat,
  Instagram,
  Leaf,
  LogOut,
  Mail,
  MapPin,
  Menu as MenuIcon,
  Phone,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { CUSTOMER_NAV, ROLE_HOME, ROLE_LABELS } from '../utils/constants.js';
import { useAuth } from '../stores/auth.js';
import { useCart } from '../stores/cart.js';
import { cn } from '../utils/format.js';
import { Button } from '../components/ui/primitives.jsx';
import { RoleSwitcher } from '../components/RoleSwitcher.jsx';
import { InstallAppButton } from '../components/InstallAppButton.jsx';

function Brand({ light = false, compact = false }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full border transition group-hover:scale-105',
          compact ? 'h-8 w-8' : 'h-10 w-10',
          light ? 'border-white/25 bg-white/10 text-brand-accent' : 'border-brand-primary/15 bg-brand-primary text-brand-accent',
        )}
      >
        <Leaf size={compact ? 15 : 18} />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            'block font-display font-semibold tracking-[0.14em]',
            compact ? 'text-lg' : 'text-xl',
            light ? 'text-white' : 'text-brand-primary',
          )}
        >
          NEZTA
        </span>
        <span className={cn('mt-1 block text-[9px] font-medium uppercase tracking-[0.28em]', light ? 'text-white/50' : 'text-brand-muted')}>
          Kitchen &amp; Tiffin
        </span>
      </span>
    </Link>
  );
}

function CartButton() {
  const count = useCart((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  return (
    <Link
      to="/cart"
      className="relative inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-secondary"
    >
      <ShoppingBag size={16} />
      <span className="hidden sm:inline">Cart</span>
      {count > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[11px] font-bold text-brand-primary">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function CustomerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'auto' : 'auto' });
  }, [location.pathname]);

  const isCustomer = user?.role === 'CUSTOMER';
  const portalHome = user ? ROLE_HOME[user.role] : '/login';

  return (
    <div className="flex min-h-screen flex-col bg-brand-background">
      <div className="bg-brand-primary text-center text-[11px] font-medium tracking-wide text-white/80">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-1.5">
          <span className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-brand-accent">
            Demo mode
          </span>
          <span className="hidden sm:inline">Interactive product demonstration — orders, payments and riders are simulated.</span>
          <span className="sm:hidden">Interactive demo — data is simulated.</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-brand-border/80 bg-brand-background/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Brand />
            <nav className="hidden items-center gap-1 lg:flex">
              {CUSTOMER_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'relative rounded-lg px-3 py-2 text-[13.5px] font-medium transition',
                      isActive ? 'text-brand-primary' : 'text-brand-muted hover:text-brand-primary',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive ? (
                        <motion.span
                          layoutId="customer-nav-underline"
                          className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-brand-accent"
                        />
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isCustomer ? (
              <Link
                to="/account/orders"
                className="hidden items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-brand-muted transition hover:text-brand-primary sm:inline-flex"
              >
                <User size={15} />
                My account
              </Link>
            ) : null}
            <InstallAppButton variant="secondary" size="sm" label="Install" className="hidden h-10 sm:inline-flex" />
            <InstallAppButton variant="secondary" size="sm" compact className="h-10 w-10 px-0 sm:hidden" />
            <CartButton />
            {user ? (
              <Link
                to={portalHome}
                className="hidden h-10 items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 text-[13px] font-semibold text-brand-primary transition hover:border-brand-secondary/40 md:inline-flex"
              >
                {ROLE_LABELS[user.role]}
                <ArrowUpRight size={14} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden h-10 items-center rounded-xl border border-brand-border bg-white px-4 text-[13px] font-semibold text-brand-primary transition hover:border-brand-secondary/40 md:inline-flex"
              >
                Sign in
              </Link>
            )}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-primary lg:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={18} /> : <MenuIcon size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-brand-border bg-white lg:hidden"
            >
              <div className="container-page space-y-1 py-4">
                {CUSTOMER_NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-lg px-3 py-2.5 text-sm font-medium',
                        isActive ? 'bg-brand-primary/5 text-brand-primary' : 'text-brand-muted',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <div className="my-2 h-px bg-brand-border" />
                <InstallAppButton variant="secondary" size="md" className="w-full" label="Install the app" />
                {user ? (
                  <>
                    <Link to={portalHome} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-primary">
                      {ROLE_LABELS[user.role]} workspace
                    </Link>
                    <Link to="/account/orders" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-muted">
                      My orders
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand-muted"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-primary">
                    Sign in / switch demo role
                  </Link>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-20 bg-brand-primary text-white/70">
        <div className="container-page grid gap-10 py-14 md:grid-cols-4">
          <div className="md:col-span-1">
            <Brand light />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/60">
              Home-style meals cooked in small batches, delivered warm across Pune. A demonstration product
              experience for the NEZTA platform.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70">
                <Instagram size={14} />
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70">
                <ChefHat size={14} />
              </span>
            </div>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">Explore</p>
            <ul className="space-y-2.5 text-[13px]">
              {CUSTOMER_NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/account/subscriptions" className="transition hover:text-white">
                  My tiffin plans
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">Experiences</p>
            <ul className="space-y-2.5 text-[13px]">
              <li>
                <Link to="/app/shop" className="transition hover:text-white">
                  Shop admin dashboard
                </Link>
              </li>
              <li>
                <Link to="/app/kitchen" className="transition hover:text-white">
                  Kitchen display
                </Link>
              </li>
              <li>
                <Link to="/app/rider" className="transition hover:text-white">
                  Rider app
                </Link>
              </li>
              <li>
                <Link to="/app/platform" className="transition hover:text-white">
                  Platform admin
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">Visit us</p>
            <ul className="space-y-3 text-[13px]">
              <li className="flex gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-brand-accent" />
                Shop 4, Silver Oak Plaza, Baner Road, Pune 411045
              </li>
              <li className="flex gap-2.5">
                <Phone size={15} className="mt-0.5 shrink-0 text-brand-accent" />
                +91 98200 11223
              </li>
              <li className="flex gap-2.5">
                <Mail size={15} className="mt-0.5 shrink-0 text-brand-accent" />
                hello@nezta.demo
              </li>
            </ul>
            <div className="mt-5">
              <RoleSwitcher variant="light" />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-[11px] text-white/45 sm:flex-row">
            <p>© {new Date().getFullYear()} NEZTA. Demonstration MVP — not a production ordering service.</p>
            <p>Prices in INR · Sample data only · No real payments are processed</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
