import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarDays, CheckCircle2, ClipboardList, FileText, MapPin, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { toast, toastError } from '../../stores/ui.js';
import { Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui/primitives.jsx';
import { BULK_STATUS_LABELS } from '../../utils/constants.js';
import { formatDateOnly, money } from '../../utils/format.js';

const STATUS_TONES = {
  ENQUIRY_RECEIVED: 'muted',
  QUOTATION_SENT: 'gold',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'muted',
  CONFIRMED: 'success',
  PREPARING: 'warning',
  READY: 'accent',
  DISPATCHED: 'info',
  COMPLETED: 'success',
};

export default function CustomerBulkPage() {
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-bulk-enquiries'],
    queryFn: () => api('/bulk-enquiries/mine'),
  });

  const accept = useMutation({
    mutationFn: (id) => api(`/bulk-quotations/${id}/accept`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Quotation accepted', message: 'The shop can now confirm the bulk order.', tone: 'success' });
      queryClient.invalidateQueries({ queryKey: ['my-bulk-enquiries'] });
    },
    onError: (error) => toastError(error, 'Could not accept the quotation'),
    onSettled: () => setAccepting(null),
  });

  const enquiries = data?.data ?? [];

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-1.5 font-display text-[32px] font-semibold text-brand-primary">Bulk &amp; corporate enquiries</h1>
          <p className="mt-1 text-[12.5px] text-brand-muted">
            Track quotations, accept them and follow the production status of confirmed bulk orders.
          </p>
        </div>
        <Link to="/bulk-orders">
          <Button>
            <ClipboardList size={15} /> New enquiry
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : enquiries.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No bulk enquiries yet"
          description="Request a quotation for an office lunch, school meal programme, hospital ward or family function."
          action={
            <Link to="/bulk-orders">
              <Button>Request a quotation</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {enquiries.map((enquiry) => {
            const quotation = enquiry.quotations?.[0];
            return (
              <Card key={enquiry.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-border px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-brand-primary">{enquiry.organizationName}</h2>
                      <Badge tone={STATUS_TONES[enquiry.status] ?? 'muted'} dot>
                        {BULK_STATUS_LABELS[enquiry.status] ?? enquiry.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11.5px] text-brand-muted">
                      {enquiry.enquiryNumber} · {enquiry.organizationType} · {enquiry.contactPerson}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[11.5px] text-brand-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={13} /> {enquiry.estimatedQuantity} meals
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={13} /> {formatDateOnly(enquiry.requiredDate, 'dd MMM yyyy')}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_1fr]">
                  <div>
                    <p className="flex items-start gap-2 text-[12px] text-brand-muted">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-brand-secondary" />
                      {enquiry.deliveryAddress}
                    </p>
                    {enquiry.packageName ? (
                      <p className="mt-2 text-[12px] text-brand-text">
                        <span className="text-brand-muted">Package:</span> {enquiry.packageName}
                      </p>
                    ) : null}
                    {enquiry.dietaryRequirements ? (
                      <p className="mt-1.5 text-[12px] text-brand-text">
                        <span className="text-brand-muted">Dietary:</span> {enquiry.dietaryRequirements}
                      </p>
                    ) : null}
                    {enquiry.notes ? (
                      <p className="mt-1.5 text-[11.5px] italic text-brand-muted">“{enquiry.notes}”</p>
                    ) : null}

                    {enquiry.bulkOrder ? (
                      <div className="mt-3 rounded-xl border border-brand-secondary/25 bg-brand-secondary/5 px-3 py-2.5">
                        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-secondary">
                          <CheckCircle2 size={13} /> Confirmed bulk order {enquiry.bulkOrder.bulkOrderNumber}
                        </p>
                        <p className="mt-1 text-[11px] text-brand-muted">
                          Status: {BULK_STATUS_LABELS[enquiry.bulkOrder.status] ?? enquiry.bulkOrder.status}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {quotation ? (
                    <div className="rounded-xl border border-brand-border bg-brand-background/60 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                          <FileText size={11} /> {quotation.quotationNumber}
                        </p>
                        <Badge tone={quotation.status === 'ACCEPTED' ? 'success' : quotation.status === 'REJECTED' ? 'danger' : 'gold'}>
                          {quotation.status}
                        </Badge>
                      </div>
                      <p className="mt-2 font-display text-2xl font-semibold text-brand-primary">{money(quotation.total)}</p>
                      <div className="mt-2 space-y-1 text-[11px] text-brand-muted">
                        <p className="flex justify-between">
                          <span>{quotation.quantity} meals × {money(quotation.perPersonPrice)}</span>
                          <span>{money(quotation.quantity * quotation.perPersonPrice)}</span>
                        </p>
                        {quotation.additionalCharges > 0 ? (
                          <p className="flex justify-between">
                            <span>Additional charges</span>
                            <span>{money(quotation.additionalCharges)}</span>
                          </p>
                        ) : null}
                        {quotation.discount > 0 ? (
                          <p className="flex justify-between text-brand-secondary">
                            <span>Discount</span>
                            <span>− {money(quotation.discount)}</span>
                          </p>
                        ) : null}
                        <p className="pt-1 text-[10px]">Valid until {formatDateOnly(quotation.validUntil, 'dd MMM yyyy')}</p>
                      </div>
                      {quotation.terms ? (
                        <p className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[10px] leading-relaxed text-brand-muted">
                          {quotation.terms}
                        </p>
                      ) : null}
                      {quotation.status === 'SENT' ? (
                        <Button
                          size="sm"
                          className="mt-3 w-full"
                          loading={accepting === quotation.id}
                          onClick={() => {
                            setAccepting(quotation.id);
                            accept.mutate(quotation.id);
                          }}
                        >
                          Accept quotation
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-brand-border p-4 text-center">
                      <p className="text-[11.5px] leading-relaxed text-brand-muted">
                        Waiting for NEZTA to send a quotation. You will see it here as soon as it is prepared.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
