# NEZTA — client demo MVP

Multi-shop food ordering, tiffin subscriptions, bulk catering and delivery
operations, built as an interactive sales demonstration. Everything runs on
seeded demo data: payments and rider movements are simulated.

- **Client:** React + Vite + Tailwind, TanStack Query, Zustand, React Router
- **Server:** Hono on Node (`server/src/node-server.js`) with Prisma + PostgreSQL
- **PWA:** installable from any portal, offline app shell

## Run it

```bash
npm install                # workspace install (client + server)
npm run db:migrate         # create the schema
npm run db:seed            # load the demo dataset (wipes + reseeds)
npm run dev                # API on :8787 and Vite on :5173
```

Useful extras:

```bash
npm run build              # production client build
npm run preview            # serve the build on :4173 (API proxied, PWA enabled)
node scripts/smoke.mjs     # 84 end-to-end API checks across all four scenarios
```

Demo password for every account is `demo1234`; the login screen lists one-click
accounts for each role.

## Portals and routes

| Area | Route | What it demonstrates |
| --- | --- | --- |
| Storefront | `/` | Marketplace home, categories, featured dishes |
| Menu / shops | `/menu`, `/shop` | Catalogue browsing, search and sorting |
| Meal boxes | `/meal-boxes` | Customisable boxes with option pricing |
| Tiffin | `/tiffin-plans` | Daily / weekly / monthly subscriptions |
| Bulk | `/bulk-orders` | Corporate enquiry → quotation → acceptance |
| Cart & checkout | `/cart`, `/checkout` | Server-priced quote, coupon, COD/UPI demo payment |
| Tracking | `/track/:orderNumber` | Live order flow with per-step timeline |
| Customer account | `/account/orders`, `/account/subscriptions`, `/account/enquiries` | Order history, plan management, bulk enquiries |
| Shop | `/app/shop` | Daily operations overview |
| Shop orders | `/app/shop/orders` | Accept, prepare, assign riders, close tickets |
| **Shop deliveries** | `/app/shop/deliveries` | **Dispatch ready orders, track riders on the road, record pickups and failures** |
| Shop menu | `/app/shop/menu` | Products, availability toggle (hide **and** restore), categories |
| Shop subscriptions | `/app/shop/tiffin`, `/app/shop/meal-boxes` | Plans and box catalogue |
| Shop bulk | `/app/shop/bulk` | Enquiries, quotations, production orders |
| Shop customers / finance | `/app/shop/customers`, `/app/shop/finance` | Directory and commission-aware revenue |
| Kitchen | `/app/kitchen`, `/app/kitchen/orders`, `/app/kitchen/bulk` | Preparation board and bulk production |
| Rider | `/app/rider`, `/app/rider/history` | Accept, pick up, out for delivery, OTP completion |
| Platform | `/app/platform` | Marketplace overview |
| Platform commission | `/app/platform/orders` | **Totals-only order value, source mix and estimated commission** |
| Platform subscriptions | `/app/platform/subscriptions` | **Plan volume and commission, no subscriber detail** |
| Platform shops / settings | `/app/platform/shops`, `/app/platform/settings` | Directory, suspension, commission rate |

### Shop delivery management

`/app/shop/deliveries` is the dispatch desk for the shop:

- **Queue tiles** — ready to dispatch, active, on the road, delivered and failed today.
- **Rider capacity** — live load per rider with vehicle and availability.
- **Ready for dispatch** — orders the kitchen has packed; assign a rider in one tap.
- **On the road** — active deliveries with rider, collect amount, demo code, and the
  ability to record a pickup, close the delivery or report a failure.

Rider actions and the shop desk write to the same order and assignment records the
customer tracking page reads, so status changes appear everywhere immediately.

### Platform views stay totals-only

The platform console intentionally drops customer names, addresses, item lists and
payment states. Orders and subscriptions expose counts, GMV and estimated commission
(platform rate with per-shop overrides) so marketplace staff can reconcile commission
without processing individual orders.

## Menu availability

Hiding a dish keeps it in the catalogue. On `/app/shop/menu` the availability chip
toggles both ways — an unavailable item shows **Make available** and comes back to the
storefront instantly. The "Unavailable" filter lists hidden dishes so nothing gets lost.

## Mobile behaviour

- Portal tables collapse into stacked order cards below `md`, and the menu catalogue
  keeps its availability switch in the first column so it never needs a sideways scroll.
- Checkout pins the total and "Place demo order" to the bottom of the screen.
- Modals render in a portal, so they stay anchored to the viewport even inside animated
  page transitions (bottom sheets on phones, centred dialogs on desktop).

## Install as an app (PWA)

The build ships a manifest, maskable icons and a service worker:

- `client/public/manifest.webmanifest` — name, icons, shortcuts (Menu, Orders, Portal), theme.
- `client/public/sw.js` — caches the shell and static assets; `/api` always hits the network.
- `client/src/services/pwa.js` — registers the worker (production builds only) and holds the
  `beforeinstallprompt` state.
- `client/src/components/InstallAppButton.jsx` — "Install" in the customer header, the mobile
  drawer, every portal header and the login screen. Chrome/Edge show the native prompt;
  Safari users get Add-to-Home-Screen instructions.

Test it against the production build (`npm run build && npm run preview`), then open
<http://localhost:4173>. Registration only runs in a production build so Vite HMR stays clean.

Icon PNGs are generated without any image dependency:

```bash
node client/scripts/generate-pwa-icons.mjs
```
