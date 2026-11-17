import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CalendarX, IndianRupee, PauseCircle, Percent, UtensilsCrossed } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import { Badge, Card, CardHeader, Skeleton, StatCard, Table, Td, Th } from '../../components/ui/primitives.jsx';
import { compactMoney, money } from '../../utils/format.js';

const PLAN_LABEL = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly' };

export default function PlatformSubscriptions() {
  const { data, isLoading } = useQuery({ queryKey: ['platform-subscriptions'], queryFn: () => api('/platform/subscriptions') });

  const totals = data?.data?.totals;
  const byPlan = data?.data?.byPlan ?? [];

  if (isLoading || !totals) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Subscription activity"
        description="Tiffin plan volume and value for commission tracking. Individual subscribers stay with the shop that cooks for them."
        actions={<Badge tone="gold">Demo data</Badge>}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plans" value={totals.plans} icon={CalendarClock} hint={`${totals.active} active`} />
        <StatCard label="Paused" value={totals.paused} icon={PauseCircle} hint="Resume from either side" />
        <StatCard label="Cancelled" value={totals.cancelled} icon={CalendarX} hint="Excluded from plan value" />
        <StatCard label="Plan value" value={compactMoney(totals.value)} icon={IndianRupee} tone="gold" hint="Agreed at purchase" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Commission (${totals.commissionRate}%)`}
          value={compactMoney(totals.estimatedCommission)}
          icon={Percent}
          hint="Illustrative platform fee"
        />
        <StatCard label="Meals delivered" value={totals.deliveredMeals} icon={UtensilsCrossed} hint="Generated tiffin orders" />
        <StatCard label="Meals skipped" value={totals.skippedMeals} icon={CalendarX} hint="Customer-skipped dates" />
        <StatCard label="Active rate" value={`${totals.plans ? Math.round((totals.active / totals.plans) * 100) : 0}%`} icon={CalendarClock} hint="Share of plans running" />
      </div>

      <Card className="mt-4">
        <CardHeader title="Plan mix" subtitle="Where subscription value comes from" />
        <Table>
          <thead>
            <tr>
              <Th>Plan type</Th>
              <Th className="text-right">Plans</Th>
              <Th className="text-right">Active</Th>
              <Th className="text-right">Meals delivered</Th>
              <Th className="text-right">Value</Th>
              <Th className="text-right">Commission</Th>
            </tr>
          </thead>
          <tbody>
            {byPlan.map((entry) => (
              <tr key={entry.planType}>
                <Td className="font-medium">{PLAN_LABEL[entry.planType] ?? entry.planType}</Td>
                <Td className="text-right tabular-nums">{entry.plans}</Td>
                <Td className="text-right tabular-nums">{entry.active}</Td>
                <Td className="text-right tabular-nums">{entry.deliveredMeals}</Td>
                <Td className="text-right tabular-nums">{money(entry.value)}</Td>
                <Td className="text-right font-semibold tabular-nums text-brand-primary">
                  {money((entry.value * totals.commissionRate) / 100)}
                </Td>
              </tr>
            ))}
            {!byPlan.length ? (
              <tr>
                <Td colSpan={6} className="py-8 text-center text-brand-muted">
                  No subscriptions yet.
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>

      <p className="mt-3 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-[11px] leading-relaxed text-[#6f5a20]">
        {data.meta?.note} Subscriber names, addresses and payment states are intentionally omitted from the platform view.
      </p>
    </div>
  );
}
