import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CustomerLayout } from '../layouts/CustomerLayout.jsx';
import { PortalLayout } from '../layouts/PortalLayout.jsx';
import { useAuth } from '../stores/auth.js';
import { ROLE_HOME } from '../utils/constants.js';
import { Spinner } from '../components/ui/primitives.jsx';
import { Login } from '../modules/auth/Login.jsx';

const Home = lazy(() => import('../modules/marketplace/Home.jsx'));
const MenuPage = lazy(() => import('../modules/marketplace/MenuPage.jsx'));
const ShopPage = lazy(() => import('../modules/marketplace/ShopPage.jsx'));
const MealBoxesPage = lazy(() => import('../modules/meal-boxes/MealBoxesPage.jsx'));
const TiffinPlansPage = lazy(() => import('../modules/subscriptions/TiffinPlansPage.jsx'));
const BulkOrdersPage = lazy(() => import('../modules/bulk-orders/BulkOrdersPage.jsx'));
const CartPage = lazy(() => import('../modules/orders/CartPage.jsx'));
const CheckoutPage = lazy(() => import('../modules/orders/CheckoutPage.jsx'));
const OrderTrackingPage = lazy(() => import('../modules/orders/OrderTrackingPage.jsx'));
const CustomerOrdersPage = lazy(() => import('../modules/orders/CustomerOrdersPage.jsx'));
const CustomerSubscriptionsPage = lazy(() => import('../modules/subscriptions/CustomerSubscriptionsPage.jsx'));
const CustomerBulkPage = lazy(() => import('../modules/bulk-orders/CustomerBulkPage.jsx'));

const ShopOverview = lazy(() => import('../modules/shop/ShopOverview.jsx'));
const ShopOrders = lazy(() => import('../modules/shop/ShopOrders.jsx'));
const ShopDeliveries = lazy(() => import('../modules/shop/ShopDeliveries.jsx'));
const ShopMenu = lazy(() => import('../modules/shop/ShopMenu.jsx'));
const ShopMealBoxes = lazy(() => import('../modules/shop/ShopMealBoxes.jsx'));
const ShopTiffin = lazy(() => import('../modules/shop/ShopTiffin.jsx'));
const ShopBulk = lazy(() => import('../modules/shop/ShopBulk.jsx'));
const ShopCustomers = lazy(() => import('../modules/shop/ShopCustomers.jsx'));
const ShopFinance = lazy(() => import('../modules/shop/ShopFinance.jsx'));

const KitchenBoardPage = lazy(() => import('../modules/kitchen/KitchenBoardPage.jsx'));
const KitchenBulkPage = lazy(() => import('../modules/kitchen/KitchenBulkPage.jsx'));
const KitchenOrdersPage = lazy(() => import('../modules/kitchen/KitchenOrdersPage.jsx'));
const RiderDashboard = lazy(() => import('../modules/rider/RiderDashboard.jsx'));

const PlatformOverview = lazy(() => import('../modules/platform/PlatformOverview.jsx'));
const PlatformShops = lazy(() => import('../modules/platform/PlatformShops.jsx'));
const PlatformOrders = lazy(() => import('../modules/platform/PlatformOrders.jsx'));
const PlatformSubscriptions = lazy(() => import('../modules/platform/PlatformSubscriptions.jsx'));
const PlatformSettings = lazy(() => import('../modules/platform/PlatformSettings.jsx'));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <p className="text-xs font-medium uppercase tracking-widest text-brand-muted">Plating up…</p>
      </div>
    </div>
  );
}

function RequireRole({ roles, children }) {
  const user = useAuth((state) => state.user);
  const token = useAuth((state) => state.token);
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] ?? '/login'} replace />;
  }
  return children;
}

function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-brand-primary">This page wandered off</h1>
      <p className="mt-3 max-w-md text-sm text-brand-muted">
        The link may be from an older demo version. Head back to the NEZTA storefront to continue the walkthrough.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white"
      >
        Back to the storefront
      </a>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="meal-boxes" element={<MealBoxesPage />} />
          <Route path="tiffin-plans" element={<TiffinPlansPage />} />
          <Route path="bulk-orders" element={<BulkOrdersPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="track/:orderNumber" element={<OrderTrackingPage />} />
          <Route
            path="account/orders"
            element={
              <RequireRole roles={['CUSTOMER']}>
                <CustomerOrdersPage />
              </RequireRole>
            }
          />
          <Route
            path="account/subscriptions"
            element={
              <RequireRole roles={['CUSTOMER']}>
                <CustomerSubscriptionsPage />
              </RequireRole>
            }
          />
          <Route
            path="account/enquiries"
            element={
              <RequireRole roles={['CUSTOMER']}>
                <CustomerBulkPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="/app"
          element={
            <RequireRole roles={['SHOP_OWNER', 'KITCHEN_STAFF', 'RIDER', 'PLATFORM_ADMIN']}>
              <PortalLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="/app/shop" replace />} />

          <Route
            path="shop"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopOverview />
              </RequireRole>
            }
          />
          <Route
            path="shop/orders"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopOrders />
              </RequireRole>
            }
          />
          <Route
            path="shop/deliveries"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopDeliveries />
              </RequireRole>
            }
          />
          <Route
            path="shop/menu"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopMenu />
              </RequireRole>
            }
          />
          <Route
            path="shop/meal-boxes"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopMealBoxes />
              </RequireRole>
            }
          />
          <Route
            path="shop/tiffin"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopTiffin />
              </RequireRole>
            }
          />
          <Route
            path="shop/bulk"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopBulk />
              </RequireRole>
            }
          />
          <Route
            path="shop/customers"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopCustomers />
              </RequireRole>
            }
          />
          <Route
            path="shop/finance"
            element={
              <RequireRole roles={['SHOP_OWNER']}>
                <ShopFinance />
              </RequireRole>
            }
          />

          <Route
            path="kitchen"
            element={
              <RequireRole roles={['KITCHEN_STAFF', 'SHOP_OWNER']}>
                <KitchenBoardPage />
              </RequireRole>
            }
          />
          <Route
            path="kitchen/bulk"
            element={
              <RequireRole roles={['KITCHEN_STAFF', 'SHOP_OWNER']}>
                <KitchenBulkPage />
              </RequireRole>
            }
          />
          <Route
            path="kitchen/orders"
            element={
              <RequireRole roles={['KITCHEN_STAFF', 'SHOP_OWNER']}>
                <KitchenOrdersPage />
              </RequireRole>
            }
          />

          <Route
            path="rider"
            element={
              <RequireRole roles={['RIDER']}>
                <RiderDashboard />
              </RequireRole>
            }
          />
          <Route
            path="rider/history"
            element={
              <RequireRole roles={['RIDER']}>
                <RiderDashboard historyOnly />
              </RequireRole>
            }
          />

          <Route
            path="platform"
            element={
              <RequireRole roles={['PLATFORM_ADMIN']}>
                <PlatformOverview />
              </RequireRole>
            }
          />
          <Route
            path="platform/shops"
            element={
              <RequireRole roles={['PLATFORM_ADMIN']}>
                <PlatformShops />
              </RequireRole>
            }
          />
          <Route
            path="platform/orders"
            element={
              <RequireRole roles={['PLATFORM_ADMIN']}>
                <PlatformOrders />
              </RequireRole>
            }
          />
          <Route
            path="platform/subscriptions"
            element={
              <RequireRole roles={['PLATFORM_ADMIN']}>
                <PlatformSubscriptions />
              </RequireRole>
            }
          />
          <Route
            path="platform/settings"
            element={
              <RequireRole roles={['PLATFORM_ADMIN']}>
                <PlatformSettings />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
