import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Phone, Search, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import { Avatar, Badge, Card, Input, Skeleton } from '../../components/ui/primitives.jsx';
import { formatDate, money } from '../../utils/format.js';

export default function ShopCustomers() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['shop-customers', debounced],
    queryFn: () => api('/shop/customers', { query: { search: debounced || undefined } }),
  });

  const customers = data?.data ?? [];
  const totalSpend = customers.reduce((sum, customer) => sum + customer.totalSpending, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        description="Every demo customer with their order history, spend and active tiffin plans. Contact details are sample data."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Customers', customers.length, 'Demo profiles'],
          ['Repeat spend', money(totalSpend), 'Across delivered orders'],
          ['Subscribers', customers.filter((customer) => customer.activeSubscriptions > 0).length, 'With active tiffins'],
        ].map(([label, value, hint]) => (
          <Card key={label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-brand-primary">{value}</p>
            <p className="text-[10.5px] text-brand-muted">{hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border p-4">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone or email"
              className="pl-9"
            />
          </div>
          <Badge tone="muted">
            <Users size={10} /> {customers.length} customers
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Orders</th>
                  <th>Total spend</th>
                  <th>Subscriptions</th>
                  <th className="hidden md:table-cell">Last order</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={customer.name} size={30} />
                        <div>
                          <p className="text-[12.5px] font-semibold text-brand-text">{customer.name}</p>
                          <p className="text-[10px] text-brand-muted">
                            {customer.addresses?.[0]?.label ?? 'No saved address'}
                            {customer.addresses?.[0]?.pincode ? ` · ${customer.addresses[0].pincode}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="flex items-center gap-1 text-[11.5px] text-brand-muted">
                        <Phone size={11} /> {customer.phone}
                      </p>
                      <p className="text-[10px] text-brand-muted">{customer.email ?? '—'}</p>
                    </td>
                    <td className="text-[12px] font-semibold text-brand-text">{customer.totalOrders}</td>
                    <td className="text-[12px] font-semibold text-brand-primary">{money(customer.totalSpending)}</td>
                    <td>
                      {customer.activeSubscriptions > 0 ? (
                        <Badge tone="success">
                          <CalendarClock size={10} /> {customer.activeSubscriptions}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-brand-muted">—</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell">
                      {customer.lastOrder ? (
                        <div>
                          <p className="text-[11px] text-brand-text">{formatDate(customer.lastOrder.placedAt, 'dd MMM yyyy')}</p>
                          <p className="font-mono text-[10px] text-brand-muted">{customer.lastOrder.orderNumber}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-brand-muted">No orders yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-[11px] text-brand-muted">
        Spending totals only count delivered demo orders. Customer records are seeded demonstration data, not real
        people.
      </p>
    </div>
  );
}
