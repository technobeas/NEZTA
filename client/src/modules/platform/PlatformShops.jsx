import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent, Store, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  Skeleton,
} from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { formatDate, money } from '../../utils/format.js';

export default function PlatformShops() {
  const queryClient = useQueryClient();
  const [commissionTarget, setCommissionTarget] = useState(null);
  const [commissionValue, setCommissionValue] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['platform-shops'], queryFn: () => api('/platform/shops') });
  const shops = data?.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-shops'] });
    queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
  };

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/platform/shops/${id}`, { method: 'PATCH', body }),
    onSuccess: (payload) => {
      toast({ title: `${payload.data.name} updated`, message: payload.data.status, tone: 'success' });
      setCommissionTarget(null);
      setStatusTarget(null);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not update the shop'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Shops"
        description="The demo runs one active shop (NEZTA) with the schema prepared for more. Activate, suspend or override commission."
        actions={<Badge tone="muted"><Store size={10} /> {shops.length} shops</Badge>}
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {shops.map((shop) => (
            <Card key={shop.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Avatar name={shop.name} size={38} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold text-brand-primary">{shop.name}</p>
                      <Badge tone={shop.status === 'ACTIVE' ? 'success' : 'danger'} dot>
                        {shop.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-brand-muted">
                      {shop.owner?.name ?? 'Unassigned owner'} · {shop.owner?.email ?? '—'}
                    </p>
                    <p className="text-[10.5px] text-brand-muted">
                      {shop.city} · joined {formatDate(shop.createdAt, 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-brand-muted">Revenue</p>
                  <p className="font-display text-lg font-semibold text-brand-primary">{money(shop.revenue)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  ['Orders', shop.orders],
                  ['Customers', shop.customers],
                  ['Tiffins', shop.subscriptions],
                  ['Products', shop.products],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-brand-background py-2">
                    <p className="text-[9.5px] uppercase tracking-widest text-brand-muted">{label}</p>
                    <p className="text-[13px] font-semibold text-brand-primary">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-brand-border pt-3">
                <div className="flex items-center gap-2">
                  <Badge tone="gold">
                    <Percent size={10} /> {shop.commissionRate}% commission
                  </Badge>
                  <Badge tone="muted">
                    <Users size={10} /> {shop.rating.toFixed(1)}★
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCommissionTarget(shop);
                      setCommissionValue(String(shop.commissionRate));
                    }}
                  >
                    Commission
                  </Button>
                  <Button
                    size="sm"
                    variant={shop.status === 'ACTIVE' ? 'ghost' : 'primary'}
                    className={shop.status === 'ACTIVE' ? 'text-brand-danger hover:bg-[#FBEAE5]' : ''}
                    onClick={() => setStatusTarget(shop)}
                  >
                    {shop.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-brand-muted">
        Suspending a shop is a demo status change. It does not stop the seeded storefront from rendering, but it
        demonstrates the marketplace control the platform team would have.
      </p>

      <Modal
        open={Boolean(commissionTarget)}
        onClose={() => setCommissionTarget(null)}
        title={`Commission for ${commissionTarget?.name ?? ''}`}
        subtitle="Leave blank to inherit the platform default rate."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCommissionTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={update.isPending}
              onClick={() =>
                update.mutate({
                  id: commissionTarget.id,
                  body: { commissionRate: commissionValue === '' ? null : Number(commissionValue) },
                })
              }
            >
              Save rate
            </Button>
          </div>
        }
      >
        <Field label="Shop commission rate (%)" hint="Allowed range 0–50%.">
          <Input
            type="number"
            min={0}
            max={50}
            step="0.5"
            value={commissionValue}
            onChange={(event) => setCommissionValue(event.target.value)}
            placeholder="Inherit platform default"
          />
        </Field>
        <p className="mt-3 rounded-lg bg-brand-background px-3 py-2 text-[11px] text-brand-muted">
          Commission values are illustrative demo calculations, not actual payouts or invoices.
        </p>
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() =>
          update.mutate({
            id: statusTarget.id,
            body: { status: statusTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
          })
        }
        loading={update.isPending}
        title={statusTarget?.status === 'ACTIVE' ? 'Suspend this shop?' : 'Activate this shop?'}
        description={
          statusTarget?.status === 'ACTIVE'
            ? 'The demo shop will be marked suspended in the marketplace listing. You can reactivate it at any time.'
            : 'The demo shop will be marked active again and appear in the marketplace.'
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Suspend shop' : 'Activate shop'}
        tone={statusTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
}
