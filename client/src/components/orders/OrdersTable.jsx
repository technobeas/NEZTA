import { ChevronRight, Inbox } from 'lucide-react';
import { Badge, EmptyState, Skeleton, StatusBadge } from '../ui/primitives.jsx';
import { SOURCE_LABELS } from '../../utils/constants.js';
import { formatDate, money } from '../../utils/format.js';

export function OrdersTable({ orders, loading, onSelect, emptyLabel = 'No orders match these filters', showShop = false }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-11" />
        ))}
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyLabel}
        description="Try a different status filter, clear the search, or place a demo order from the customer site."
        className="border-0"
      />
    );
  }

  return (
    <>
      {/* Mobile: one stacked card per order so nothing important hides behind a scroll */}
      <div className="divide-y divide-brand-border md:hidden">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => onSelect?.(order)}
            className="flex w-full flex-col gap-2 px-4 py-3.5 text-left transition active:bg-brand-background"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11.5px] font-semibold text-brand-primary">{order.orderNumber}</p>
                <p className="mt-0.5 truncate text-[12.5px] font-medium text-brand-text">
                  {order.customer?.name ?? 'Customer'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold text-brand-primary">{money(order.total)}</p>
                <p className="text-[10px] text-brand-muted">{order.itemCount} items</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={order.status} />
              <span className="flex items-center gap-1 text-[10.5px] text-brand-muted">
                {formatDate(order.placedAt, 'dd MMM, h:mm a')}
                <ChevronRight size={13} />
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="table-base min-w-[720px]">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th className="hidden md:table-cell">Items</th>
              {showShop ? <th className="hidden lg:table-cell">Shop</th> : null}
              <th>Total</th>
              <th className="hidden sm:table-cell">Payment</th>
              <th>Status</th>
              <th className="hidden lg:table-cell">Placed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="cursor-pointer" onClick={() => onSelect?.(order)}>
                <td>
                  <p className="whitespace-nowrap font-mono text-[11.5px] font-semibold text-brand-primary">{order.orderNumber}</p>
                  <p className="mt-0.5 text-[10px] text-brand-muted">
                    {SOURCE_LABELS[order.source]}
                    {order.scheduledFor ? ` · ${formatDate(order.scheduledFor, 'dd MMM')}` : ''}
                  </p>
                </td>
                <td>
                  <p className="text-[12.5px] font-medium text-brand-text">{order.customer?.name ?? 'Customer'}</p>
                  <p className="text-[10.5px] text-brand-muted">{order.customer?.phone}</p>
                </td>
                <td className="hidden max-w-[220px] md:table-cell">
                  <p className="truncate text-[11.5px] text-brand-muted">
                    {order.items?.map((item) => `${item.quantity}× ${item.name}`).join(', ')}
                  </p>
                  <p className="text-[10px] text-brand-muted">{order.itemCount} items</p>
                </td>
                {showShop ? (
                  <td className="hidden lg:table-cell">
                    <p className="text-[11.5px] text-brand-text">{order.shop?.name}</p>
                  </td>
                ) : null}
                <td className="text-[12.5px] font-semibold text-brand-primary">{money(order.total)}</td>
                <td className="hidden sm:table-cell">
                  <p className="text-[11px] text-brand-text">
                    {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'UPI on delivery'}
                  </p>
                  <Badge tone={order.paymentStatus === 'SIMULATED_PAID' ? 'success' : 'muted'}>
                    {order.paymentStatus === 'SIMULATED_PAID' ? 'Simulated paid' : 'Pending'}
                  </Badge>
                </td>
                <td>
                  <StatusBadge status={order.status} />
                  {order.rider ? (
                    <p className="mt-1 text-[10px] text-brand-muted">Rider: {order.rider.name}</p>
                  ) : null}
                </td>
                <td className="hidden whitespace-nowrap text-[11px] text-brand-muted lg:table-cell">
                  {formatDate(order.placedAt, 'dd MMM, h:mm a')}
                </td>
                <td className="text-right">
                  <ChevronRight size={15} className="ml-auto text-brand-muted" />
                </td>
              </tr>
            ))}
            </tbody>
        </table>
      </div>
    </>
  );
}
