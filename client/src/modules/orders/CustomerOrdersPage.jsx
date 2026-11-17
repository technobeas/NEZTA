import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bike, CalendarClock, ChevronRight, ReceiptText, ShoppingBag } from 'lucide-react';
import { api } from '../../services/api.js';
import {
  Badge,
  Button,
  EmptyState,
  Skeleton,
  StatusBadge,
  Tabs,
} from '../../components/ui/primitives.jsx';
import { useAuth } from '../../stores/auth.js';
import { ORDER_STATUS_LABELS, SOURCE_LABELS } from '../../utils/constants.js';
import { formatDate, formatDateTime, money } from '../../utils/format.js';

const ACTIVE = ['NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

export default function CustomerOrdersPage() {
  const user = useAuth((state) => state.user);
  const [tab, setTab] = useState('active');

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api('/orders', { query: { pageSize: 50 } }),
    enabled: Boolean(user),
  });

  const orders = data?.data ?? [];
  const filtered = useMemo(() => {
    if (tab === 'active') return orders.filter((order) => ACTIVE.includes(order.status));
    if (tab === 'completed') return orders.filter((order) => order.status === 'DELIVERED');
    return orders;
  }, [orders, tab]);

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-1.5 font-display text-[32px] font-semibold text-brand-primary">Orders</h1>
          <p className="mt-1 text-[12.5px] text-brand-muted">
            Every order, tiffin delivery and status change in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/account/subscriptions">
            <Button variant="secondary">
              <CalendarClock size={15} /> Tiffin plans
            </Button>
          </Link>
          <Link to="/menu">
            <Button>
              <ShoppingBag size={15} /> Order again
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <Tabs
            value={tab}
            onChange={setTab}
            className="mb-4 w-fit"
            options={[
              { value: 'active', label: 'Active', count: orders.filter((order) => ACTIVE.includes(order.status)).length },
              {
                value: 'completed',
                label: 'Delivered',
                count: orders.filter((order) => order.status === 'DELIVERED').length,
              },
              { value: 'all', label: 'All', count: orders.length },
            ]}
          />

          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28" />)
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title={tab === 'active' ? 'No active orders right now' : 'No orders here yet'}
                description="Place a demo order and it will appear here with live status updates."
                action={
                  <Link to="/menu">
                    <Button>Browse the menu</Button>
                  </Link>
                }
              />
            ) : (
              filtered.map((order) => (
                <Link
                  key={order.id}
                  to={`/track/${order.orderNumber}`}
                  className="group block rounded-2xl border border-brand-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-[13px] font-semibold text-brand-primary">{order.orderNumber}</p>
                        <StatusBadge status={order.status} />
                        {order.source !== 'NORMAL' ? <Badge tone="gold">{SOURCE_LABELS[order.source]}</Badge> : null}
                      </div>
                      <p className="mt-1 text-[11.5px] text-brand-muted">
                        {formatDateTime(order.placedAt)} · {order.itemCount} items
                      </p>
                      <p className="mt-1.5 text-[12px] text-brand-text">
                        {order.items?.slice(0, 3).map((item) => `${item.quantity}× ${item.name}`).join(' · ')}
                        {order.items?.length > 3 ? ` +${order.items.length - 3} more` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-display text-lg font-semibold text-brand-primary">{money(order.total)}</p>
                        <p className="text-[10px] text-brand-muted">{ORDER_STATUS_LABELS[order.status]}</p>
                      </div>
                      <ChevronRight size={16} className="text-brand-muted transition group-hover:translate-x-0.5 group-hover:text-brand-secondary" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">Account</p>
            <p className="mt-2 text-[13px] font-semibold text-brand-primary">{user?.name}</p>
            <p className="text-[11.5px] text-brand-muted">{user?.email}</p>
            <div className="mt-3 space-y-1.5">
              <Link to="/account/subscriptions" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] text-brand-muted hover:bg-brand-background">
                Tiffin subscriptions <ArrowRight size={12} />
              </Link>
              <Link to="/account/enquiries" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] text-brand-muted hover:bg-brand-background">
                Bulk enquiries <ArrowRight size={12} />
              </Link>
              <Link to="/cart" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] text-brand-muted hover:bg-brand-background">
                Current cart <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-brand-primary p-4 text-white">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-brand-accent">
              <Bike size={12} /> Order tracking
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/65">
              Tracking refreshes every 6 seconds while an order is active, so status changes made in the shop or
              rider app show up immediately.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
