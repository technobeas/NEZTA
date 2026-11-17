import { Bike, Clock, MapPin, Phone, ReceiptText, User } from 'lucide-react';
import { Badge, Button, Modal, StatusBadge } from '../ui/primitives.jsx';
import { SOURCE_LABELS } from '../../utils/constants.js';
import { formatDate, formatDateTime, money } from '../../utils/format.js';

/**
 * Full order view used by the shop, kitchen and platform dashboards.
 * `actions` lets each workspace pass its allowed workflow buttons.
 */
export function OrderDetailModal({ order, open, onClose, actions, footerNote }) {
  if (!order) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Order ${order.orderNumber}`}
      subtitle={`${SOURCE_LABELS[order.source]} · ${formatDateTime(order.placedAt)}`}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-brand-muted">{footerNote ?? 'Demo order records are stored in PostgreSQL.'}</p>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <Badge tone="muted">{SOURCE_LABELS[order.source]}</Badge>
            {order.subscription ? <Badge tone="gold">{order.subscription.planName}</Badge> : null}
            {order.bulkOrder ? <Badge tone="gold">{order.bulkOrder.bulkOrderNumber}</Badge> : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-brand-border">
            <div className="border-b border-brand-border bg-brand-background/50 px-3.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Items</p>
            </div>
            <div className="divide-y divide-brand-border">
              {order.items?.map((item) => (
                <div key={item.id} className="px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12.5px] font-semibold text-brand-text">
                        {item.quantity} × {item.name}
                      </p>
                      {item.itemType === 'MEAL_BOX' ? (
                        <Badge tone="gold" className="mt-1">
                          Meal box
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[12px] font-semibold text-brand-primary">{money(item.lineTotal)}</p>
                  </div>
                  {item.customizations?.length ? (
                    <div className="mt-2 space-y-1 rounded-lg bg-brand-background px-2.5 py-2">
                      {item.customizations.map((customization) => (
                        <div key={customization.id} className="flex justify-between gap-2 text-[10.5px]">
                          <span className="text-brand-muted">{customization.groupLabel}</span>
                          <span className="font-medium text-brand-text">
                            {customization.valueLabel}
                            {customization.priceDelta > 0 ? ` (+${money(customization.priceDelta)})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {item.notes ? (
                    <p className="mt-1.5 rounded-md bg-[#FBF1DD] px-2 py-1 text-[10.5px] italic text-[#8a6118]">
                      Kitchen note: {item.notes}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-brand-border bg-brand-background/40 px-3.5 py-3 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-brand-muted">Subtotal</span>
                <span>{money(order.subtotal)}</span>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-brand-secondary">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>− {money(order.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-brand-muted">Delivery</span>
                <span>{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between border-t border-brand-border pt-1.5 text-[12.5px] font-semibold">
                <span>Total</span>
                <span>{money(order.total)}</span>
              </div>
            </div>
          </div>

          {order.history?.length ? (
            <div className="rounded-xl border border-brand-border p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Status history</p>
              <ol className="mt-2 space-y-2">
                {[...order.history].reverse().slice(0, 8).map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 text-[11px]">
                    <div>
                      <p className="font-medium capitalize text-brand-text">
                        {entry.status.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      {entry.note ? <p className="text-[10px] italic text-brand-muted">{entry.note}</p> : null}
                    </div>
                    <div className="text-right text-[10px] text-brand-muted">
                      <p>{formatDate(entry.createdAt, 'dd MMM, h:mm a')}</p>
                      <p>{entry.actorName ?? 'System'}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-brand-border p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
              <User size={11} /> Customer
            </p>
            <p className="mt-2 text-[12.5px] font-semibold text-brand-text">{order.delivery.name}</p>
            <p className="text-[11.5px] text-brand-muted">{order.delivery.phone}</p>
            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-brand-muted">
              <MapPin size={12} className="mt-0.5 shrink-0" />
              <span>
                {order.delivery.line1}
                {order.delivery.line2 ? `, ${order.delivery.line2}` : ''}, {order.delivery.city}{' '}
                {order.delivery.pincode}
              </span>
            </p>
            {order.delivery.instructions ? (
              <p className="mt-2 rounded-lg bg-brand-background px-2 py-1.5 text-[10.5px] italic text-brand-muted">
                “{order.delivery.instructions}”
              </p>
            ) : null}
            <a
              href={`tel:${order.delivery.phone}`}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-secondary"
            >
              <Phone size={11} /> Call customer
            </a>
          </div>

          <div className="rounded-xl border border-brand-border p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
              <ReceiptText size={11} /> Payment
            </p>
            <p className="mt-2 text-[12px] text-brand-text">
              {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'UPI on delivery'}
            </p>
            <Badge tone={order.paymentStatus === 'SIMULATED_PAID' ? 'success' : 'muted'} className="mt-1.5">
              {order.paymentStatus === 'SIMULATED_PAID' ? 'Simulated payment recorded' : 'Payment pending'}
            </Badge>
            <p className="mt-2 text-[10px] leading-relaxed text-brand-muted">
              Demo transaction only. No payment gateway is connected.
            </p>
          </div>

          {order.rider || order.assignment ? (
            <div className="rounded-xl border border-brand-border p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                <Bike size={11} /> Delivery
              </p>
              {order.rider ? (
                <p className="mt-2 text-[12px] font-semibold text-brand-text">{order.rider.name}</p>
              ) : (
                <p className="mt-2 text-[12px] text-brand-muted">Rider not assigned yet</p>
              )}
              {order.assignment ? (
                <div className="mt-1.5 space-y-1 text-[10.5px] text-brand-muted">
                  <p>Stage: {order.assignment.status.replace(/_/g, ' ').toLowerCase()}</p>
                  {order.assignment.otpCode && order.assignment.status !== 'DELIVERED' ? (
                    <p>
                      Demo confirmation code:{' '}
                      <span className="font-mono font-semibold text-brand-primary">{order.assignment.otpCode}</span>
                    </p>
                  ) : null}
                  {order.assignment.deliveredAt ? (
                    <p className="flex items-center gap-1">
                      <Clock size={10} /> Delivered {formatDateTime(order.assignment.deliveredAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {order.scheduledFor ? (
            <div className="rounded-xl bg-brand-accent/10 px-3 py-2.5 text-[11px] text-[#6f5a20]">
              Scheduled for {formatDateTime(order.scheduledFor)}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export function WorkflowButton({ label, onClick, loading, variant = 'primary', icon: Icon }) {
  return (
    <Button size="sm" variant={variant} onClick={onClick} loading={loading}>
      {Icon ? <Icon size={13} /> : null}
      {label}
    </Button>
  );
}
