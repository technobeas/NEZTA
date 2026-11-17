import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  ChefHat,
  IndianRupee,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader, DemoNote } from '../../layouts/PortalLayout.jsx';
import { OrdersTable } from '../../components/orders/OrdersTable.jsx';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal.jsx';
import { Badge, Button, Card, CardHeader, Skeleton, StatCard } from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { compactMoney, formatDate, money } from '../../utils/format.js';

const PIE_COLORS = ['#123B2B', '#1C6547', '#D7B96E', '#C98A2B', '#2F6E8E', '#B4472F', '#7A847D'];

export default function ShopOverview() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['shop-overview'], queryFn: () => api('/shop/overview') });
  const overview = data?.data;

  const generate = useMutation({
    mutationFn: () => api('/subscriptions/generate-orders', { method: 'POST', body: {} }),
    onSuccess: (payload) => {
      const summary = payload.data.summary;
      toast({
        title: `${summary.generated} subscription order${summary.generated === 1 ? '' : 's'} generated`,
        message:
          summary.generated === 0
            ? 'All tiffin orders for today already exist (idempotent generation).'
            : `For ${payload.data.date}. Skipped ${summary.skipped}.`,
        tone: summary.generated === 0 ? 'info' : 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['shop-overview'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => toastError(error, 'Could not generate subscription orders'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-72" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const metrics = overview.metrics;

  return (
    <div>
      <PageHeader
        title="Good service today"
        eyebrow={formatDate(new Date(), 'EEEE, dd MMMM')}
        description="A single view of orders, kitchen load, tiffin deliveries and bulk production for the NEZTA kitchen."
        actions={
          <>
            <Button variant="secondary" onClick={() => generate.mutate()} loading={generate.isPending}>
              <CalendarClock size={15} /> Generate tiffin orders
            </Button>
            <Link to="/app/kitchen">
              <Button>
                <ChefHat size={15} /> Open kitchen display
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatCard label="Today's orders" value={metrics.todaysOrders} icon={ShoppingBag} hint="All sources" />
        <StatCard label="Pending acceptance" value={metrics.pendingOrders} icon={ReceiptText} tone="gold" hint="Needs action" />
        <StatCard label="In preparation" value={metrics.preparingOrders} icon={ChefHat} hint="Confirmed + preparing" />
        <StatCard
          label="Today's sales"
          value={compactMoney(metrics.todaysSales)}
          icon={IndianRupee}
          tone="gold"
          hint="Demo revenue"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatCard label="Customers" value={metrics.totalCustomers} icon={Users} hint="Demo profiles" />
        <StatCard label="Active tiffins" value={metrics.activeSubscriptions} icon={CalendarClock} hint="Subscriptions" />
        <StatCard
          label="Upcoming tiffin deliveries"
          value={metrics.upcomingSubscriptionDeliveries}
          icon={CalendarClock}
          hint="Next 7 days"
        />
        <StatCard label="Bulk enquiries" value={metrics.pendingBulkEnquiries} icon={Building2} hint="Awaiting quotation" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="Sales trend"
            subtitle="Last 7 days · demo orders"
            action={<Badge tone="muted">Illustrative</Badge>}
          />
          <div className="h-64 px-3 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.salesTrend}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1C6547" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1C6547" stopOpacity={0.02} />
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
                  formatter={(value, name) => [name === 'revenue' ? money(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                  labelFormatter={(value) => formatDate(value, 'dd MMM yyyy')}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E8E7DF',
                    fontSize: 12,
                    boxShadow: '0 12px 32px -20px rgba(18,59,43,0.35)',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1C6547" strokeWidth={2} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Status mix" subtitle="Last 7 days" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overview.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {overview.statusBreakdown.map((entry, index) => (
                    <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, String(name).replace(/_/g, ' ').toLowerCase()]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E8E7DF', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-5 pb-4">
            {overview.statusBreakdown.map((entry, index) => (
              <span key={entry.status} className="inline-flex items-center gap-1.5 text-[10.5px] text-brand-muted">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                {entry.status.replace(/_/g, ' ').toLowerCase()} ({entry.count})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader title="Popular products" subtitle="Quantities sold this week" />
          <div className="h-56 px-3 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E7DF" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#7A847D' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#202B24' }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)}
                />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E8E7DF', fontSize: 12 }} />
                <Bar dataKey="quantity" fill="#D7B96E" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent orders"
            subtitle="Newest first"
            action={
              <Link to="/app/shop/orders" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-secondary">
                View all <ArrowUpRight size={12} />
              </Link>
            }
          />
          <OrdersTable orders={overview.recentOrders} onSelect={setSelectedOrder} />
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Next action</p>
          <p className="mt-1.5 text-[13px] font-semibold text-brand-primary">
            {metrics.pendingOrders > 0 ? `${metrics.pendingOrders} orders need acceptance` : 'No pending acceptances'}
          </p>
          <Link to="/app/shop/orders?status=NEW" className="mt-2 inline-flex text-[11.5px] font-semibold text-brand-secondary">
            Review orders →
          </Link>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Subscriptions</p>
          <p className="mt-1.5 text-[13px] font-semibold text-brand-primary">
            {metrics.activeSubscriptions} active · {metrics.upcomingSubscriptionDeliveries} deliveries queued
          </p>
          <Link to="/app/shop/tiffin" className="mt-2 inline-flex text-[11.5px] font-semibold text-brand-secondary">
            Manage tiffins →
          </Link>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Bulk orders</p>
          <p className="mt-1.5 text-[13px] font-semibold text-brand-primary">
            {metrics.confirmedBulkOrders} confirmed · {metrics.pendingBulkEnquiries} enquiries
          </p>
          <Link to="/app/shop/bulk" className="mt-2 inline-flex text-[11.5px] font-semibold text-brand-secondary">
            Open bulk desk →
          </Link>
        </Card>
      </div>

      <DemoNote>
        <Sparkles size={12} className="mr-1 inline" />
        All analytics on this page are generated from seeded demonstration records and are not real business
        performance. Tiffin generation is idempotent — safe to run more than once.
      </DemoNote>

      <OrderDetailModal
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        footerNote="Read-only overview. Use the Orders page to action this order."
        actions={
          <Link to="/app/shop/orders">
            <Button size="sm" variant="secondary">
              <RefreshCw size={13} /> Go to order management
            </Button>
          </Link>
        }
      />
    </div>
  );
}
