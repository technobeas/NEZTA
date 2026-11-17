import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, IndianRupee, Info, Percent, TrendingUp, Wallet } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader, DemoNote } from '../../layouts/PortalLayout.jsx';
import { Badge, Card, CardHeader, Skeleton, StatCard } from '../../components/ui/primitives.jsx';
import { compactMoney, formatDate, money } from '../../utils/format.js';

export default function ShopFinance() {
  const { data, isLoading } = useQuery({ queryKey: ['shop-finance'], queryFn: () => api('/shop/finance') });
  const finance = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Financial overview"
        description="Illustrative demo estimates across food orders, tiffin subscriptions and bulk catering."
        actions={<Badge tone="gold">Illustrative only</Badge>}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross sales" value={compactMoney(finance.grossSales)} icon={IndianRupee} hint="Delivered + subscriptions + bulk" />
        <StatCard
          label={`Platform commission (${finance.commissionRate}%)`}
          value={compactMoney(finance.commission)}
          icon={Percent}
          tone="gold"
          hint="Demo marketplace fee"
        />
        <StatCard label="Estimated shop earnings" value={compactMoney(finance.shopEarnings)} icon={Wallet} hint="After commission" />
        <StatCard label="Pending settlement" value={compactMoney(finance.pendingSettlement)} icon={Banknote} hint="Illustrative estimate" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Daily sales"
            subtitle="Last 30 days · all non-cancelled orders"
            action={<Badge tone="muted">Demo</Badge>}
          />
          <div className="h-72 px-3 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finance.dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E7DF" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatDate(value, 'dd MMM')}
                  tick={{ fontSize: 10, fill: '#7A847D' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(finance.dailySales.length / 8))}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#7A847D' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip
                  formatter={(value) => [money(value), 'Sales']}
                  labelFormatter={(value) => formatDate(value, 'dd MMM yyyy')}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E8E7DF', fontSize: 12 }}
                />
                <Bar dataKey="total" fill="#1C6547" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Revenue mix" subtitle="Where the demo sales come from" />
            <div className="space-y-3 p-4">
              {[
                ['Food orders', finance.grossSales - finance.subscriptionSales - finance.bulkSales, 'Delivered à la carte'],
                ['Tiffin subscriptions', finance.subscriptionSales, `${finance.subscriptionCount} plans`],
                ['Bulk orders', finance.bulkSales, `${finance.bulkOrderCount} confirmed`],
              ].map(([label, value, hint]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-brand-text">{label}</span>
                    <span className="font-semibold text-brand-primary">{money(value)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-soft">
                    <div
                      className="h-full rounded-full bg-brand-secondary"
                      style={{
                        width: `${finance.grossSales ? Math.max(4, Math.round((Number(value) / finance.grossSales) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-brand-muted">{hint}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Commission model" subtitle="Configurable demo rate" />
            <div className="space-y-2 p-4 text-[12px]">
              <div className="flex justify-between">
                <span className="text-brand-muted">Platform default</span>
                <span className="font-medium">{finance.platformDefaultCommissionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Applied to this shop</span>
                <span className="font-semibold text-brand-primary">{finance.commissionRate}%</span>
              </div>
              <div className="flex justify-between border-t border-brand-border pt-2">
                <span className="text-brand-muted">Estimated commission</span>
                <span className="font-semibold text-brand-primary">{money(finance.commission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Pending order value</span>
                <span className="font-medium">{money(finance.pendingOrderValue)}</span>
              </div>
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-background px-2.5 py-2 text-[10.5px] leading-relaxed text-brand-muted">
                <Info size={12} className="mt-0.5 shrink-0" />
                Change the default rate from the platform admin demo settings. New estimates recalculate instantly;
                recorded orders keep their original values.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Delivered orders', finance.deliveredOrders, 'Counted as realised demo sales'],
          ['Pending orders', finance.pendingOrders, 'Not yet delivered'],
          ['Commission rate', `${finance.commissionRate}%`, 'Configurable in platform settings'],
        ].map(([label, value, hint]) => (
          <Card key={label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">{label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-primary">{value}</p>
            <p className="text-[10.5px] text-brand-muted">{hint}</p>
          </Card>
        ))}
      </div>

      <DemoNote>
        <TrendingUp size={12} className="mr-1 inline" />
        {finance.note} Subscription and bulk figures include only confirmed records — enquiries and unconfirmed
        quotations are never counted as sales.
      </DemoNote>
    </div>
  );
}
