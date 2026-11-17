import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, IndianRupee, Percent, ReceiptText, ShoppingBag } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import { Badge, Button, Card, CardHeader, Field, Input, Skeleton, StatCard, Table, Td, Th } from '../../components/ui/primitives.jsx';
import { SOURCE_LABELS } from '../../utils/constants.js';
import { compactMoney, formatDate, money } from '../../utils/format.js';

export default function PlatformOrders() {
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['platform-orders', queryString],
    queryFn: () => api(`/platform/orders${queryString ? `?${queryString}` : ''}`),
  });

  const totals = data?.data?.totals;
  const bySource = data?.data?.bySource ?? [];
  const byShop = data?.data?.byShop ?? [];
  const recent = data?.data?.recent ?? [];

  const setFilter = (key) => (event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }));

  const exportCsv = () => {
    const rows = [
      ['Commission summary'],
      ['Orders', totals?.orders ?? 0],
      ['GMV', totals?.gmv ?? 0],
      ['Commission rate (%)', totals?.commissionRate ?? 0],
      ['Estimated commission', totals?.commission ?? 0],
      [],
      ['Source', 'Orders', 'Value', 'Commission'],
      ...bySource.map((entry) => [SOURCE_LABELS[entry.source] ?? entry.source, entry.orders, entry.value, entry.commission]),
      [],
      ['Shop', 'Orders', 'Value', 'Rate (%)', 'Commission'],
      ...byShop.map((entry) => [entry.name, entry.orders, entry.value, entry.rate, entry.commission]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nezta-commission-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Commission"
        description="Order value, source mix and illustrative platform commission. Marketplace staff do not process individual orders here."
        actions={
          <Button variant="secondary" size="sm" leftIcon={Download} onClick={exportCsv} disabled={!totals}>
            Export summary
          </Button>
        }
      />

      <Card className="mb-3 flex flex-col gap-2 p-3 sm:flex-row sm:items-end">
        <Field label="From" className="sm:w-48">
          <Input type="date" value={filters.dateFrom} onChange={setFilter('dateFrom')} />
        </Field>
        <Field label="To" className="sm:w-48">
          <Input type="date" value={filters.dateTo} onChange={setFilter('dateTo')} />
        </Field>
        <p className="pb-2.5 text-[11px] text-brand-muted sm:ml-auto">
          Leave empty to include every demo order.
        </p>
      </Card>

      {isLoading || !totals ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Orders" value={totals.orders} icon={ShoppingBag} hint={`${totals.commissionableOrders} commissionable`} />
            <StatCard label="GMV" value={compactMoney(totals.gmv)} icon={IndianRupee} tone="gold" hint="Non-cancelled order value" />
            <StatCard
              label="Estimated commission"
              value={compactMoney(totals.commission)}
              icon={Percent}
              hint={`${totals.commissionRate}% platform rate`}
            />
            <StatCard label="Delivered" value={totals.delivered} icon={ReceiptText} hint={`${totals.cancelled} cancelled`} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Commission by source" subtitle="Food orders, tiffin subscriptions and bulk catering" />
              <Table>
                <thead>
                  <tr>
                    <Th>Source</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Value</Th>
                    <Th className="text-right">Commission</Th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map((entry) => (
                    <tr key={entry.source}>
                      <Td className="font-medium">{SOURCE_LABELS[entry.source] ?? entry.source}</Td>
                      <Td className="text-right tabular-nums">{entry.orders}</Td>
                      <Td className="text-right tabular-nums">{money(entry.value)}</Td>
                      <Td className="text-right font-semibold tabular-nums text-brand-primary">{money(entry.commission)}</Td>
                    </tr>
                  ))}
                  {!bySource.length ? (
                    <tr>
                      <Td colSpan={4} className="py-8 text-center text-brand-muted">
                        No orders in this range.
                      </Td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </Card>

            <Card>
              <CardHeader title="Commission by shop" subtitle="Each shop can override the platform rate" />
              <Table>
                <thead>
                  <tr>
                    <Th>Shop</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Rate</Th>
                    <Th className="text-right">Commission</Th>
                  </tr>
                </thead>
                <tbody>
                  {byShop.map((entry) => (
                    <tr key={entry.id}>
                      <Td className="font-medium">{entry.name}</Td>
                      <Td className="text-right tabular-nums">{entry.orders}</Td>
                      <Td className="text-right tabular-nums">{entry.rate}%</Td>
                      <Td className="text-right font-semibold tabular-nums text-brand-primary">{money(entry.commission)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader
              title="Latest orders"
              subtitle="Totals only — full order detail stays inside the shop and kitchen portals"
              action={<Badge tone="gold">Demo data</Badge>}
            />
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Placed</Th>
                  <Th className="hidden sm:table-cell">Source</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Commission</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id}>
                    <Td className="whitespace-nowrap font-mono text-[11.5px] font-semibold text-brand-primary">{order.orderNumber}</Td>
                    <Td className="whitespace-nowrap text-[11.5px] text-brand-muted">{formatDate(order.placedAt, 'dd MMM, h:mm a')}</Td>
                    <Td className="hidden text-[11.5px] text-brand-muted sm:table-cell">{SOURCE_LABELS[order.source] ?? order.source}</Td>
                    <Td className="text-right tabular-nums">{money(order.total)}</Td>
                    <Td className="text-right font-semibold tabular-nums text-brand-primary">{money(order.commission)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <p className="mt-3 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-[11px] leading-relaxed text-[#6f5a20]">
            {data?.meta?.note} Customer names, addresses and payment states are intentionally hidden — the platform
            team only needs totals to reconcile commission.
          </p>
        </>
      )}
    </div>
  );
}
