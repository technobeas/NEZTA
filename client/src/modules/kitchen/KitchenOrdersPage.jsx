import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import { OrdersTable } from '../../components/orders/OrdersTable.jsx';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal.jsx';
import { Button, Card, StatusBadge, Tabs } from '../../components/ui/primitives.jsx';
import { formatDateTime, money } from '../../utils/format.js';

export default function KitchenOrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('NEW,CONFIRMED,PREPARING,READY_FOR_PICKUP,RIDER_ASSIGNED,PICKED_UP,OUT_FOR_DELIVERY');
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['orders', { scope: 'kitchen', status }],
    queryFn: () => api('/orders', { query: { status, pageSize: 100 } }),
    refetchInterval: 20000,
  });

  const orders = data?.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Kitchen"
        title="Order queue"
        description="Every live order in the kitchen pipeline, including tiffin-generated deliveries."
        actions={
          <>
            <Link to="/app/kitchen">
              <Button variant="secondary">
                Preparation board <ArrowUpRight size={14} />
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw size={15} /> Refresh
            </Button>
          </>
        }
      />

      <Tabs
        className="mb-3 w-fit"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'NEW,CONFIRMED', label: 'To accept / start' },
          { value: 'PREPARING', label: 'Preparing' },
          { value: 'READY_FOR_PICKUP,RIDER_ASSIGNED', label: 'Ready / rider' },
          {
            value: 'NEW,CONFIRMED,PREPARING,READY_FOR_PICKUP,RIDER_ASSIGNED,PICKED_UP,OUT_FOR_DELIVERY',
            label: 'All live',
          },
        ]}
      />

      <Card>
        <OrdersTable orders={orders} loading={isLoading} onSelect={setSelected} />
      </Card>

      <OrderDetailModal
        order={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        footerNote="Kitchen actions are on the preparation board."
        actions={
          <Link to="/app/kitchen">
            <Button size="sm">Open preparation board</Button>
          </Link>
        }
      />
    </div>
  );
}
