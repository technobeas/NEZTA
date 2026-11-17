import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bike,
  ChefHat,
  Leaf,
  Lock,
  Mail,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../stores/auth.js';
import { toastError } from '../../stores/ui.js';
import { ROLE_HOME, ROLE_LABELS } from '../../utils/constants.js';
import { Button, Field, Input, Spinner } from '../../components/ui/primitives.jsx';
import { InstallAppButton } from '../../components/InstallAppButton.jsx';
import { cn } from '../../utils/format.js';

const ROLE_ICONS = {
  PLATFORM_ADMIN: ShieldCheck,
  SHOP_OWNER: Store,
  KITCHEN_STAFF: ChefHat,
  RIDER: Bike,
  CUSTOMER: UserRound,
};

export function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuth((state) => state.login);
  const token = useAuth((state) => state.token);
  const user = useAuth((state) => state.user);

  const [email, setEmail] = useState('customer@nezta.demo');
  const [password, setPassword] = useState('demo1234');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: () => api('/auth/demo-accounts'),
    staleTime: Infinity,
  });

  if (token && user) {
    const next = searchParams.get('next');
    return <Navigate to={next && user.role === 'CUSTOMER' ? next : ROLE_HOME[user.role] ?? '/'} replace />;
  }

  const accounts = data?.accounts ?? [];

  async function signIn(nextEmail, nextPassword, roleHint) {
    setError('');
    setPending(roleHint ?? 'form');
    try {
      const signedIn = await login({ email: nextEmail, password: nextPassword });
      const next = searchParams.get('next');
      navigate(next && signedIn.role === 'CUSTOMER' ? next : ROLE_HOME[signedIn.role] ?? '/', { replace: true });
    } catch (loginError) {
      setError(loginError.message ?? 'Could not sign in');
      toastError(loginError, 'Check the demo credentials and try again.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid min-h-screen bg-brand-background lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-primary lg:block">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80"
          alt="Home-style Indian meal spread"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-primary/90 to-brand-secondary/70" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-brand-accent">
              <Leaf size={20} />
            </span>
            <span>
              <span className="block font-display text-2xl font-semibold tracking-[0.15em] text-white">NEZTA</span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-[0.3em] text-white/50">Kitchen &amp; Tiffin</span>
            </span>
          </Link>

          <div className="max-w-lg">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" /> Client demonstration
            </p>
            <h1 className="font-display text-[42px] font-semibold leading-[1.08] text-white xl:text-[52px]">
              One kitchen.
              <br />
              Seven connected experiences.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
              Step into the marketplace, shop operations, kitchen display, rider app and platform console —
              all sharing the same live demo database.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-3">
              {[
                ['Ordering', 'Browsing, meal boxes, checkout, live tracking'],
                ['Tiffin', 'Daily, weekly & monthly recurring plans'],
                ['Bulk', 'Corporate enquiries, quotes, production'],
                ['Operations', 'Shop, kitchen, rider & platform views'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-white/12 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-[13px] font-semibold text-white">{title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-white/55">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-white/40">
            Demonstration environment · sample data · simulated payments · no production accounts
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-brand-accent">
                <Leaf size={18} />
              </span>
              <span className="font-display text-xl font-semibold tracking-[0.14em] text-brand-primary">NEZTA</span>
            </Link>
            <InstallAppButton variant="secondary" size="sm" compact />
          </div>

          <p className="eyebrow">Demo access</p>
          <h2 className="mt-2 font-display text-[32px] font-semibold leading-tight text-brand-primary">
            Sign in to the walkthrough
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-brand-muted">
            Choose a role to open its workspace. Every demo account uses the password{' '}
            <span className="font-semibold text-brand-text">demo1234</span>.
          </p>

          <div className="mt-6 space-y-2">
            {accounts.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-6 text-sm text-brand-muted">
                <Spinner className="h-4 w-4" /> Loading demo accounts…
              </div>
            ) : null}
            {accounts.map((account) => {
              const Icon = ROLE_ICONS[account.role] ?? UserRound;
              return (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => signIn(account.email, data?.password ?? 'demo1234', account.role)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl border border-brand-border bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-secondary/40 hover:shadow-soft',
                    pending === account.role && 'border-brand-secondary/50 bg-brand-secondary/5',
                  )}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/5 text-brand-secondary">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-brand-text">{account.label}</span>
                    <span className="block truncate text-[11.5px] text-brand-muted">
                      {account.name} · {account.email}
                    </span>
                  </span>
                  {pending === account.role ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-secondary border-t-transparent" />
                  ) : (
                    <ArrowRight size={15} className="shrink-0 text-brand-muted transition group-hover:translate-x-0.5 group-hover:text-brand-secondary" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-brand-border" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">or use the form</span>
            <span className="h-px flex-1 bg-brand-border" />
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              signIn(email.trim(), password);
            }}
          >
            <Field label="Email address" required>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </Field>
            <Field label="Password" required>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </Field>

            {error ? <p className="rounded-lg bg-[#FBEAE5] px-3 py-2 text-[12px] font-medium text-brand-danger">{error}</p> : null}

            <Button type="submit" className="w-full" loading={pending === 'form'}>
              Sign in to the demo
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-[12px]">
            <Link to="/" className="font-medium text-brand-muted transition hover:text-brand-primary">
              ← Back to storefront
            </Link>
            <Link to="/menu" className="font-semibold text-brand-secondary">
              Browse as guest
            </Link>
          </div>

          <p className="mt-8 rounded-xl border border-brand-border bg-white px-3.5 py-3 text-[11px] leading-relaxed text-brand-muted">
            This is a sales demonstration, not a production login. Session tokens are signed locally and all
            accounts are seeded demo users.
          </p>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand-border px-3.5 py-2.5">
            <p className="text-[11px] leading-relaxed text-brand-muted">
              Demo tip: install NEZTA to open any portal full-screen, without browser chrome.
            </p>
            <InstallAppButton variant="secondary" size="sm" label="Install" />
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default Login;
