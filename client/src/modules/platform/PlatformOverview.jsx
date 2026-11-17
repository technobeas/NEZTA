import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  IndianRupee,
  Percent,
  ReceiptText,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader, DemoNote } from '../../layouts/PortalLayout.jsx';
import { Badge, Card, CardHeader, Skeleton, StatCard } from '../../components/ui/primitives.jsx';
import { SOURCE_LABELS } from '../../utils/constants.js';
import { compactMoney, formatDate, money } from '../../utils/format.js';

const COLORS = ['#123B2B', '#1C6547', '#D7B96E', '#2F6E8E'];

export default function PlatformOverview() {
  const { data, isLoading } = useQuery({ queryKey: ['platform-overview'], queryFn: () => api('/platform/overview') });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const overview = data.data;
  const metrics = overview.metrics;

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Platform overview"
        description="One demo shop today, structured for a multi-shop marketplace tomorrow. Every figure is illustrative."
        actions={<Badge tone="gold">Demo data</Badge>}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total shops" value={metrics.totalShops} icon={Store} hint={`${metrics.activeShops} active`} />
        <StatCard label="Customers" value={metrics.totalCustomers} icon={Users} hint="Across all demo shops" />
        <StatCard label="Orders" value={metrics.totalOrders} icon={ShoppingBag} hint="Lifetime demo orders" />
        <StatCard label="GMV" value={compactMoney(metrics.gmv)} icon={IndianRupee} tone="gold" hint="Non-cancelled order value" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Commission (${metrics.commissionRate}%)`}
          value={compactMoney(metrics.estimatedCommission)}
          icon={Percent}
          hint="Illustrative platform fee"
        />
        <StatCard label="Active tiffins" value={metrics.activeSubscriptions} icon={CalendarClock} hint={`${metrics.pausedSubscriptions} paused`} />
        <StatCard label="Bulk enquiries" value={metrics.bulkEnquiries} icon={Building2} hint={`${metrics.pendingBulkEnquiries} pending`} />
        <StatCard
          label="Confirmed bulk orders"
          value={metrics.confirmedBulkOrders}
          icon={ReceiptText}
          hint={`${compactMoney(metrics.bulkOrderValue)} value`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Revenue trend" subtitle="Last 7 days across the marketplace" />
          <div className="h-64 px-3 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.salesTrend}>
                <defs>
                  <linearGradient id="platformRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D7B96E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#D7B96E" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E7DF" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatDate(value, 'dd MMM')}
                  tick={{ fontSize: 10, fill: '#7A847D' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#7A847D' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip
                  formatter={(value) => [money(value), 'Revenue']}
                  labelFormatter={(value) => formatDate(value, 'dd MMM yyyy')}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E8E7DF', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#B99A45" strokeWidth={2} fill="url(#platformRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Order sources" subtitle="Where marketplace value comes from" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={overview.sourceBreakdown} dataKey="value" nameKey="source" innerRadius={44} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                  {overview.sourceBreakdown.map((entry, index) => (
                    <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 12, border: '1px solid #E8E7DF', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 px-5 pb-4">
            {overview.sourceBreakdown.map((entry, index) => (
              <div key={entry.source} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-brand-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  {(SOURCE_LABELS[entry.source] ?? entry.source).toLowerCase()} · {entry.orders} orders
                </span>
                <span className="font-medium text-brand-text">{money(entry.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader
            title="Shop performance"
            subtitle="Commission estimates per demo shop"
            action={
              <Link to="/app/platform/shops" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-secondary">
                Manage <ArrowUpRight size={12} />
              </Link>
            }
          />
          <div className="divide-y divide-brand-border">
            {overview.shops.map((shop) => (
              <div key={shop.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[12.5px] font-semibold text-brand-text">{shop.name}</p>
                    <Badge tone={shop.status === 'ACTIVE' ? 'success' : 'danger'}>{shop.status}</Badge>
                  </div>
                  <p className="text-[12.5px] font-semibold text-brand-primary">{money(shop.revenue)}</p>
                </div>
                <p className="mt-1 text-[10.5px] text-brand-muted">
                  {shop.orders} orders · {shop.customers} customers · {shop.subscriptions} tiffins ·{' '}
                  {shop.commissionRate}% commission = {money(shop.estimatedCommission)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Commission breakdown"
            subtitle="Order value by source, with the platform fee"
            action={
              <Link to="/app/platform/orders" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-secondary">
                Details <ArrowUpRight size={12} />
              </Link>
            }
          />
          <div className="divide-y divide-brand-border">
            {overview.sourceBreakdown.map((entry) => {
              const share = metrics.gmv ? Math.round((entry.value / metrics.gmv) * 100) : 0;
              return (
                <div key={entry.source} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="font-medium text-brand-text">{(SOURCE_LABELS[entry.source] ?? entry.source)}</span>
                    <span className="font-semibold text-brand-primary">{money(entry.value)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-soft">
                    <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${share}%` }} />
                  </div>
                  <p className="mt-1 text-[10.5px] text-brand-muted">
                    {entry.orders} orders · {share}% of GMV · commission {money((entry.value * metrics.commissionRate) / 100)}
                  </p>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-[12px]">
              <span className="font-semibold text-brand-text">Total commission</span>
              <span className="font-display text-lg font-semibold text-brand-primary">{money(metrics.estimatedCommission)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Subscription value', money(metrics.subscriptionValue), `${metrics.activeSubscriptions} active plans`],
          ['Bulk order value', money(metrics.bulkOrderValue), `${metrics.confirmedBulkOrders} confirmed orders`],
          ['Commission rate', `${metrics.commissionRate}%`, 'Configurable demo setting'],
        ].map(([label, value, hint]) => (
          <Card key={label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">{label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-primary">{value}</p>
            <p className="text-[10.5px] text-brand-muted">{hint}</p>
          </Card>
        ))}
      </div>

      <DemoNote>
        {overview.note} Enquiries and unconfirmed quotations are excluded from completed sales.
      </DemoNote>

    </div>
  );
}
