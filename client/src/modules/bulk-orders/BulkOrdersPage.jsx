import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HeartPulse,
  PartyPopper,
  Phone,
  Send,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../stores/auth.js';
import { toast, toastError } from '../../stores/ui.js';
import {
  Badge,
  Button,
  Field,
  ImageWithFallback,
  Input,
  Modal,
  SectionHeading,
  Select,
  Skeleton,
  Textarea,
} from '../../components/ui/primitives.jsx';
import { cn, formatDate, formatDateOnly, localDateString, money } from '../../utils/format.js';
import { BULK_STATUS_LABELS } from '../../utils/constants.js';

const enquirySchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required').max(120),
  contactPerson: z.string().min(2, 'Contact person is required').max(80),
  phone: z
    .string()
    .min(8, 'Enter a reachable phone number')
    .max(15)
    .regex(/^[0-9+\-\s]+$/, 'Use digits, spaces, + or -'),
  email: z.string().email('Enter a valid email address'),
  organizationType: z.enum([
    'Office',
    'Corporate',
    'School',
    'College',
    'Hospital',
    'Event',
    'Family function',
    'Meeting',
    'Other',
  ]),
  deliveryAddress: z.string().min(8, 'Full delivery address is required').max(300),
  requiredDate: z.string().min(8, 'Choose a delivery date'),
  preferredTime: z.string().min(3, 'Choose a preferred delivery time'),
  estimatedQuantity: z.coerce.number().int().min(10, 'Minimum 10 meals').max(5000),
  packageId: z.string().optional(),
  dietaryRequirements: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

const SEGMENTS = [
  { icon: Building2, label: 'Offices', copy: 'Daily team lunches' },
  { icon: Users, label: 'Corporate', copy: 'Town halls & offsites' },
  { icon: GraduationCap, label: 'Schools', copy: 'Student meal programmes' },
  { icon: HeartPulse, label: 'Hospitals', copy: 'Patients & staff' },
  { icon: PartyPopper, label: 'Events', copy: 'Celebrations & functions' },
  { icon: Store, label: 'Institutions', copy: 'Long-term partners' },
];

const STEPS = [
  { icon: Send, title: 'Send an enquiry', copy: 'Share headcount, date and any dietary needs.' },
  { icon: FileText, title: 'Receive a quotation', copy: 'The shop prices it per person and sends terms.' },
  { icon: ClipboardCheck, title: 'Accept & confirm', copy: 'Accept the quote and the kitchen plans production.' },
  { icon: Truck, title: 'Delivered on time', copy: 'Track preparation, dispatch and completion.' },
];

export default function BulkOrdersPage() {
  const { data: packages } = useQuery({ queryKey: ['bulk-packages'], queryFn: () => api('/bulk-packages') });
  const [activePackage, setActivePackage] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  function startEnquiry(pkg) {
    setActivePackage(pkg ?? null);
    setFormOpen(true);
  }

  return (
    <>
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="hero-grain absolute inset-0" />
        <div className="container-page relative grid gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="eyebrow text-brand-accent">Bulk &amp; corporate orders</p>
            <h1 className="mt-2 font-display text-[36px] font-semibold leading-[1.06] sm:text-[48px]">
              Meals for the whole
              <br />
              <span className="text-brand-accent">room, on schedule.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/65">
              NEZTA caters offices, schools, colleges, hospitals, events and family functions across Pune.
              Enquiries become formal quotations, and accepted quotations become kitchen production plans.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="gold" size="lg" onClick={() => startEnquiry(null)}>
                Request a quotation <ArrowRight size={16} />
              </Button>
              <a href="tel:+919820011223">
                <Button size="lg" variant="ghost" className="border border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <Phone size={16} /> Talk to catering
                </Button>
              </a>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-5 text-[11.5px]">
              {[
                ['15+', 'Minimum meals'],
                ['24 hrs', 'Quote turnaround'],
                ['500', 'Meals per service'],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="font-display text-2xl font-semibold text-brand-accent">{value}</p>
                  <p className="mt-0.5 text-white/50">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80"
              alt="Corporate catering buffet"
              className="aspect-[4/3.2] w-full rounded-[28px] shadow-lift"
            />
            <div className="absolute -bottom-5 left-6 right-6 rounded-2xl border border-brand-border bg-white p-4 text-brand-text shadow-lift">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Live demo order</p>
                  <p className="mt-1 text-[13px] font-semibold text-brand-primary">Bright Future School · 200 meals</p>
                </div>
                <Badge tone="warning">Preparing</Badge>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-soft">
                <div className="h-full w-[62%] rounded-full bg-brand-secondary" />
              </div>
              <p className="mt-1.5 text-[10.5px] text-brand-muted">Delivery tomorrow · 12:00 PM · kitchen production planned</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <SectionHeading
          eyebrow="Who we cater for"
          title="Institutional meals without the chaos"
          description="From a 20-person team lunch to a 500-plate function, the workflow stays the same: enquiry, quotation, confirmed production."
        />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SEGMENTS.map((segment) => (
            <div
              key={segment.label}
              className="flex items-start gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-soft"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/5 text-brand-secondary">
                <segment.icon size={17} />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-brand-primary">{segment.label}</p>
                <p className="mt-0.5 text-[11.5px] text-brand-muted">{segment.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-brand-border bg-white">
        <div className="container-page py-14">
          <SectionHeading
            eyebrow="Meal packages"
            title="Sample packages, priced per person"
            description="Every package is editable from the shop dashboard. Prices below are illustrative demo values."
            action={
              <Button variant="secondary" onClick={() => startEnquiry(null)}>
                Custom requirement
              </Button>
            }
          />

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {packages?.data?.length
              ? packages.data.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-soft transition hover:shadow-lift"
                  >
                    <ImageWithFallback src={pkg.imageUrl} alt={pkg.name} className="h-36 w-full" />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[15px] font-semibold text-brand-primary">{pkg.name}</h3>
                        <Badge tone="gold">{money(pkg.perPersonPrice)}/person</Badge>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-brand-muted">{pkg.description}</p>
                      <p className="mt-2 text-[10.5px] font-medium uppercase tracking-wide text-brand-secondary">
                        {pkg.targetSegments}
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {(pkg.includes ?? '').split(',').slice(0, 5).map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-[11.5px] text-brand-text">
                            <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-brand-secondary" />
                            {item.trim()}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <span className="text-[10.5px] text-brand-muted">Min {pkg.minQuantity} meals</span>
                        <Button size="sm" onClick={() => startEnquiry(pkg)}>
                          Enquire
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              : Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-80" />)}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-brand-primary">
              A clear path from enquiry to delivery
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-brand-muted">
              No WhatsApp negotiations or lost spreadsheets. The shop, kitchen and customer all see the same
              record.
            </p>
            <div className="mt-6 rounded-2xl border border-brand-accent/40 bg-brand-accent/10 p-4">
              <p className="text-[12px] font-semibold text-brand-primary">Minimum order quantities</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-brand-muted">
                Office and hospital packages start at 25 meals, schools at 50, events at 30 and family gatherings
                at 15. Custom requirements are always welcome.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-brand-border bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-brand-accent">
                    <step.icon size={16} />
                  </span>
                  <span className="text-[11px] font-semibold text-brand-muted">0{index + 1}</span>
                </div>
                <p className="mt-3 text-[13px] font-semibold text-brand-primary">{step.title}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-brand-muted">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MyEnquiries />

      <EnquiryModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        presetPackage={activePackage}
        packages={packages?.data ?? []}
        onSubmitted={(enquiry) => {
          setFormOpen(false);
          setConfirmation(enquiry);
        }}
      />

      <EnquiryConfirmation enquiry={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}

function MyEnquiries() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['my-bulk-enquiries'],
    queryFn: () => api('/bulk-enquiries/mine'),
    enabled: user?.role === 'CUSTOMER',
  });
  const [accepting, setAccepting] = useState(null);

  const acceptMutation = useMutation({
    mutationFn: (quotationId) => api(`/bulk-quotations/${quotationId}/accept`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Quotation accepted', message: 'The shop can now confirm your bulk order.', tone: 'success' });
      queryClient.invalidateQueries({ queryKey: ['my-bulk-enquiries'] });
    },
    onError: (error) => toastError(error, 'Could not accept this quotation'),
    onSettled: () => setAccepting(null),
  });

  const enquiries = data?.data ?? [];
  if (user?.role !== 'CUSTOMER') return null;

  return (
    <section className="border-t border-brand-border bg-white">
      <div className="container-page py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Your requests</p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold text-brand-primary">My bulk enquiries</h2>
            <p className="mt-1 text-[12.5px] text-brand-muted">
              Quotations sent by the shop appear here — accept one to let the shop confirm production.
            </p>
          </div>
          <Link to="/account/enquiries" className="text-[12.5px] font-semibold text-brand-secondary">
            Open full list
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : enquiries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-brand-border px-4 py-8 text-center text-[12.5px] text-brand-muted">
              No enquiries yet. Request a quotation above and it will appear here instantly.
            </p>
          ) : (
            enquiries.slice(0, 3).map((enquiry) => {
              const quotation = enquiry.quotations?.[0];
              return (
                <div key={enquiry.id} className="rounded-2xl border border-brand-border bg-white p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold text-brand-text">{enquiry.organizationName}</p>
                        <Badge tone={enquiry.status === 'ACCEPTED' ? 'success' : enquiry.status === 'QUOTATION_SENT' ? 'gold' : 'muted'}>
                          {BULK_STATUS_LABELS[enquiry.status] ?? enquiry.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11.5px] text-brand-muted">
                        {enquiry.enquiryNumber} · {enquiry.estimatedQuantity} meals ·{' '}
                        {formatDateOnly(enquiry.requiredDate, 'dd MMM yyyy')} · {enquiry.preferredTime}
                      </p>
                    </div>
                    {quotation ? (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-display text-lg font-semibold text-brand-primary">{money(quotation.total)}</p>
                          <p className="text-[10px] text-brand-muted">{quotation.quotationNumber}</p>
                        </div>
                        {quotation.status === 'SENT' ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setAccepting(quotation.id);
                              acceptMutation.mutate(quotation.id);
                            }}
                            loading={accepting === quotation.id}
                          >
                            Accept quote
                          </Button>
                        ) : (
                          <Badge tone="success">Accepted</Badge>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function EnquiryModal({ open, onClose, presetPackage, packages, onSubmitted }) {
  const user = useAuth((state) => state.user);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      organizationType: 'Corporate',
      requiredDate: localDateString(3),
      preferredTime: '12:30 PM',
      estimatedQuantity: presetPackage?.minQuantity ?? 50,
      packageId: presetPackage?.id ?? '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      organizationName: '',
      contactPerson: user?.name ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
      organizationType: 'Corporate',
      deliveryAddress: '',
      requiredDate: localDateString(3),
      preferredTime: '12:30 PM',
      estimatedQuantity: presetPackage?.minQuantity ?? 50,
      packageId: presetPackage?.id ?? '',
      dietaryRequirements: '',
      notes: '',
    });
  }, [open, presetPackage, reset, user]);

  const mutation = useMutation({
    mutationFn: (values) => api('/bulk-enquiries', { method: 'POST', body: values }),
    onSuccess: (payload) => {
      toast({ title: 'Enquiry received', message: payload.data.enquiryNumber, tone: 'success' });
      onSubmitted(payload.data);
    },
    onError: (error) => toastError(error, 'Could not submit the enquiry'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Request a bulk quotation"
      subtitle="Validated on both the client and the API. You will receive an enquiry reference instantly."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-brand-muted">Demo enquiry — no obligation, no payment.</p>
          <Button type="submit" form="bulk-enquiry-form" loading={mutation.isPending || isSubmitting}>
            Submit enquiry
          </Button>
        </div>
      }
    >
      <form
        id="bulk-enquiry-form"
        className="grid gap-3.5 sm:grid-cols-2"
        onSubmit={handleSubmit((values) => mutation.mutate({ ...values, packageId: values.packageId || undefined }))}
      >
        <Field label="Organization / customer name" required error={errors.organizationName?.message} className="sm:col-span-2">
          <Input placeholder="TechNova Solutions" {...register('organizationName')} error={errors.organizationName} />
        </Field>
        <Field label="Contact person" required error={errors.contactPerson?.message}>
          <Input placeholder="Priya Nair" {...register('contactPerson')} error={errors.contactPerson} />
        </Field>
        <Field label="Phone number" required error={errors.phone?.message}>
          <Input placeholder="+91 98200 00000" {...register('phone')} error={errors.phone} />
        </Field>
        <Field label="Email address" required error={errors.email?.message}>
          <Input type="email" placeholder="priya@company.com" {...register('email')} error={errors.email} />
        </Field>
        <Field label="Organization type" required error={errors.organizationType?.message}>
          <Select {...register('organizationType')}>
            {['Office', 'Corporate', 'School', 'College', 'Hospital', 'Event', 'Family function', 'Meeting', 'Other'].map(
              (type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ),
            )}
          </Select>
        </Field>
        <Field label="Delivery address" required error={errors.deliveryAddress?.message} className="sm:col-span-2">
          <Textarea
            rows={2}
            placeholder="Floor, building, area, city, pincode"
            {...register('deliveryAddress')}
            error={errors.deliveryAddress}
          />
        </Field>
        <Field label="Required delivery date" required error={errors.requiredDate?.message}>
          <Input type="date" min={localDateString(1)} {...register('requiredDate')} error={errors.requiredDate} />
        </Field>
        <Field label="Preferred delivery time" required error={errors.preferredTime?.message}>
          <Select {...register('preferredTime')}>
            {['11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '7:30 PM', '8:00 PM'].map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estimated quantity (meals)" required error={errors.estimatedQuantity?.message}>
          <Input type="number" min={10} max={5000} {...register('estimatedQuantity')} error={errors.estimatedQuantity} />
        </Field>
        <Field label="Meal package preference" error={errors.packageId?.message}>
          <Select {...register('packageId')}>
            <option value="">Custom / not sure yet</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} · {money(pkg.perPersonPrice)}/person
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Dietary or customization requirements"
          hint="Jain meals, no onion-garlic, low spice, allergies…"
          className="sm:col-span-2"
        >
          <Textarea rows={2} placeholder="5 Jain meals, 10 no-onion-garlic" {...register('dietaryRequirements')} />
        </Field>
        <Field label="Additional notes" className="sm:col-span-2">
          <Textarea rows={2} placeholder="Serve in sealed boxes, invoice needed, recurring monthly…" {...register('notes')} />
        </Field>

        {mutation.isError ? (
          <p className="sm:col-span-2 rounded-lg bg-[#FBEAE5] px-3 py-2 text-[12px] font-medium text-brand-danger">
            {mutation.error.message}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

function EnquiryConfirmation({ enquiry, onClose }) {
  if (!enquiry) return null;
  return (
    <Modal
      open={Boolean(enquiry)}
      onClose={onClose}
      title="Enquiry received"
      subtitle="The NEZTA team will respond with a quotation within one working day."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Link to="/account/enquiries">
            <Button>View my enquiries</Button>
          </Link>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-secondary/10 text-brand-secondary">
          <ClipboardCheck size={26} />
        </span>
        <p className="mt-4 font-mono text-lg font-semibold tracking-wide text-brand-primary">{enquiry.enquiryNumber}</p>
        <p className="mt-1 text-[12.5px] text-brand-muted">{enquiry.organizationName}</p>
      </div>

      <div className="mt-6 space-y-2 rounded-xl border border-brand-border bg-brand-background p-4 text-[12px]">
        {[
          ['Contact', `${enquiry.contactPerson} · ${enquiry.phone}`],
          ['Package', enquiry.packageName ?? 'Custom'],
          ['Quantity', `${enquiry.estimatedQuantity} meals`],
          ['Delivery date', formatDate(enquiry.requiredDate, 'dd MMM yyyy')],
          ['Preferred time', enquiry.preferredTime],
          ['Status', 'Enquiry received'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <span className="text-brand-muted">{label}</span>
            <span className="text-right font-medium text-brand-text">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-brand-accent/30 bg-brand-accent/10 p-3.5 text-[11.5px] leading-relaxed text-[#6f5a20]">
        <span className="font-semibold">What happens next:</span> the shop owner prepares a quotation with
        per-person pricing and terms. You can accept it from &ldquo;My bulk enquiries&rdquo;, after which the shop
        confirms the order for production.
      </div>
    </Modal>
  );
}
