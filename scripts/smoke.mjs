/**
 * End-to-end API smoke test for the four client demonstration scenarios.
 * Requires the API to be running (npm run dev:server) and the demo data seeded.
 *
 *   node scripts/smoke.mjs
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:8787';
const PASSWORD = 'demo1234';

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, label, details) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  FAIL ${label}`);
    if (details !== undefined) console.log('       ', JSON.stringify(details).slice(0, 400));
  }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, json };
}

async function login(email) {
  const res = await api('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.json)}`);
  return res.json.token;
}

function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function main() {
  console.log(`\nNEZTA API smoke test — ${BASE}\n`);

  /* ---------------------------------------------------------------- setup */
  console.log('Scenario setup');
  const health = await api('/api/health');
  check(health.status === 200 && health.json?.status === 'ok', 'health endpoint responds');

  const accounts = await api('/api/auth/demo-accounts');
  check(accounts.json?.accounts?.length === 5, 'five demo accounts are advertised');

  const customerToken = await login('customer@nezta.demo');
  const ownerToken = await login('owner@nezta.demo');
  const kitchenToken = await login('kitchen@nezta.demo');
  const riderToken = await login('rider@nezta.demo');
  const adminToken = await login('admin@nezta.demo');
  check(Boolean(customerToken && ownerToken && kitchenToken && riderToken && adminToken), 'all demo roles can sign in');

  const me = await api('/api/auth/me', { token: customerToken });
  check(me.json?.user?.customerId, 'customer session resolves a customer profile');

  const products = await api('/api/products?all=true');
  check(products.json?.data?.length >= 8, 'catalogue exposes the seeded products');

  const mealBoxes = await api('/api/meal-boxes');
  check(mealBoxes.json?.data?.length === 5, 'five meal boxes are available');

  const plans = await api('/api/tiffin-plans');
  check(plans.json?.data?.length === 3, 'daily, weekly and monthly tiffin plans exist');

  const packages = await api('/api/bulk-packages');
  check(packages.json?.data?.length === 5, 'five bulk packages exist');

  /* ------------------------------------------------------- scenario A: order */
  console.log('\nScenario A — normal food order');
  const masala = products.json.data.find((product) => product.name === 'Special Vegetable Masala');
  const chapati = products.json.data.find((product) => product.name === 'Chapati');
  const dal = products.json.data.find((product) => product.name === 'Special Dal');

  const cartItems = [
    { type: 'PRODUCT', productId: masala.id, quantity: 1 },
    { type: 'PRODUCT', productId: dal.id, quantity: 1 },
    { type: 'PRODUCT', productId: chapati.id, quantity: 8 },
  ];

  const quote = await api('/api/orders/quote', {
    method: 'POST',
    token: customerToken,
    body: { items: cartItems, couponCode: 'NEZTA10' },
  });
  check(quote.status === 200, 'cart quote succeeds', quote.json);
  check(quote.json?.data?.subtotal === 300, 'quote subtotal is computed server-side (₹300)', quote.json?.data);
  check(quote.json?.data?.discount === 30, 'demo coupon applies 10% (₹30)', quote.json?.data);
  check(quote.json?.data?.deliveryFee === 30, 'delivery fee applies below the free-delivery threshold');

  const orderRes = await api('/api/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      items: cartItems,
      couponCode: 'NEZTA10',
      paymentMethod: 'CASH_ON_DELIVERY',
      delivery: {
        name: 'Riya Sharma',
        phone: '+91 98200 11005',
        line1: 'B-704, Sunflower Residency, Baner',
        city: 'Pune',
        pincode: '411045',
        instructions: 'Please ring the bell twice',
      },
      instructions: 'Please ring the bell twice',
      saveAddress: false,
    },
  });
  check(orderRes.status === 201, 'order is created');
  const order = orderRes.json?.data;
  check(order?.status === 'NEW', 'new order starts in NEW');
  check(order?.total === 300, 'order total matches the quote (₹300)', order?.total);
  check(Boolean(order?.orderNumber), 'order number generated', order?.orderNumber);

  const track = await api(`/api/orders/track/${order.orderNumber}`, { token: customerToken });
  check(track.status === 200 && track.json?.data?.orderNumber === order.orderNumber, 'customer can track by order number');

  const foreignTrack = await api(`/api/orders/${order.id}`, { token: riderToken });
  check(foreignTrack.status === 403, 'riders cannot read unassigned orders');

  const shopList = await api('/api/orders?status=NEW', { token: ownerToken });
  check(shopList.json?.data?.some((row) => row.id === order.id), 'shop dashboard sees the new order');

  const accept = await api(`/api/orders/${order.id}/status`, {
    method: 'POST',
    token: ownerToken,
    body: { status: 'CONFIRMED' },
  });
  check(accept.status === 200 && accept.json.data.status === 'CONFIRMED', 'shop owner accepts the order');

  const prematureReady = await api(`/api/kitchen/orders/${order.id}/ready`, { method: 'POST', token: kitchenToken });
  check(prematureReady.status === 400, 'invalid workflow transitions are rejected');

  const prepare = await api(`/api/kitchen/orders/${order.id}/prepare`, { method: 'POST', token: kitchenToken });
  check(prepare.status === 200 && prepare.json.data.status === 'PREPARING', 'kitchen starts preparation');

  const ready = await api(`/api/kitchen/orders/${order.id}/ready`, { method: 'POST', token: kitchenToken });
  check(ready.status === 200 && ready.json.data.status === 'READY_FOR_PICKUP', 'kitchen marks the order ready');

  const riders = await api('/api/shop/riders', { token: ownerToken });
  check(riders.json?.data?.length >= 2, 'shop can list riders');
  const rider = riders.json.data.find((entry) => entry.name === 'Sohail Khan') ?? riders.json.data[0];

  const assign = await api(`/api/orders/${order.id}/assign-rider`, {
    method: 'POST',
    token: ownerToken,
    body: { riderId: rider.id },
  });
  check(assign.status === 200 && assign.json.data.status === 'RIDER_ASSIGNED', 'shop owner assigns a rider');
  check(Boolean(assign.json.data.assignment?.otpCode), 'delivery confirmation code generated');

  const riderBoard = await api('/api/delivery/assignments', { token: riderToken });
  const assignment = riderBoard.json?.data?.find((row) => row.order?.id === order.id);
  check(Boolean(assignment), 'rider sees the assigned delivery');

  const acceptDelivery = await api(`/api/delivery/assignments/${assignment.id}/accept`, {
    method: 'POST',
    token: riderToken,
  });
  check(acceptDelivery.json?.data?.status === 'ACCEPTED', 'rider accepts the delivery');

  const pickup = await api(`/api/delivery/assignments/${assignment.id}/pickup`, { method: 'POST', token: riderToken });
  check(pickup.json?.data?.status === 'PICKED_UP', 'rider marks picked up');

  const out = await api(`/api/delivery/assignments/${assignment.id}/out-for-delivery`, {
    method: 'POST',
    token: riderToken,
  });
  check(out.json?.data?.status === 'OUT_FOR_DELIVERY', 'rider marks out for delivery');

  const badOtp = await api(`/api/delivery/assignments/${assignment.id}/deliver`, {
    method: 'POST',
    token: riderToken,
    body: { otp: '0000' },
  });
  check(badOtp.status === 400, 'wrong confirmation code is rejected');

  const delivered = await api(`/api/delivery/assignments/${assignment.id}/deliver`, {
    method: 'POST',
    token: riderToken,
    body: { otp: assignment.otpCode },
  });
  check(delivered.json?.data?.status === 'DELIVERED', 'rider completes delivery with the demo code');

  const finalTrack = await api(`/api/orders/${order.id}`, { token: customerToken });
  check(finalTrack.json?.data?.status === 'DELIVERED', 'customer tracking reflects the delivery');
  check(finalTrack.json?.data?.history?.length >= 7, 'full status history recorded', finalTrack.json?.data?.history);
  check(finalTrack.json?.data?.paymentStatus === 'SIMULATED_PAID', 'demo payment marked as simulated');

  const adminOverview = await api('/api/platform/overview', { token: adminToken });
  check(adminOverview.json?.data?.recentOrders?.some((row) => row.id === order.id), 'platform overview sees the order');
  check(
    adminOverview.json?.data?.sourceBreakdown?.length >= 1,
    'platform source breakdown is calculated',
    adminOverview.json?.data?.sourceBreakdown,
  );

  /* --------------------------------------------------- scenario B: meal box */
  console.log('\nScenario B — customizable meal box');
  const specialBox = mealBoxes.json.data.find((box) => box.name === 'Special Veg Meal Box');
  check(Boolean(specialBox), 'special veg meal box exists');
  const chapatiOption = specialBox.options.find((option) => option.label === 'Chapati');
  const riceOption = specialBox.options.find((option) => option.label === 'Rice');
  const dessertOption = specialBox.options.find((option) => option.label === 'Dessert');
  const saladOption = specialBox.options.find((option) => option.label === 'Salad');
  const vegOption = specialBox.options.find((option) => option.label === 'Vegetable Masala');
  const boxDalOption = specialBox.options.find((option) => option.label === 'Dal');
  const acharOption = specialBox.options.find((option) => option.label === 'Achar');

  const valueId = (option, label) => option.values.find((value) => value.label === label).id;
  const requiredSelections = [
    { optionId: vegOption.id, valueIds: [valueId(vegOption, 'Special Vegetable Masala')] },
    { optionId: boxDalOption.id, valueIds: [valueId(boxDalOption, 'Special Dal')] },
    { optionId: acharOption.id, valueIds: [valueId(acharOption, 'Include')] },
  ];

  const boxQuote = await api('/api/orders/quote', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [
        {
          type: 'MEAL_BOX',
          mealBoxId: specialBox.id,
          quantity: 1,
          selections: [
            ...requiredSelections,
            { optionId: chapatiOption.id, valueIds: [valueId(chapatiOption, '4 chapatis')] },
            { optionId: riceOption.id, valueIds: [valueId(riceOption, 'Extra portion')] },
            { optionId: dessertOption.id, valueIds: [valueId(dessertOption, 'Gulab Jamun (2 pcs)')] },
            { optionId: saladOption.id, valueIds: [valueId(saladOption, 'Skip')] },
          ],
        },
      ],
    },
  });
  check(boxQuote.status === 200, 'meal box quote succeeds', boxQuote.json);
  check(boxQuote.json?.data?.lines?.[0]?.unitPrice === 299, 'meal box dynamic pricing applies deltas (₹299)', boxQuote.json?.data?.lines?.[0]);

  const invalidBox = await api('/api/orders/quote', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [{ type: 'MEAL_BOX', mealBoxId: specialBox.id, quantity: 1, selections: [] }],
    },
  });
  check(invalidBox.status === 400, 'missing required meal box choices are rejected', invalidBox.json);

  const boxOrder = await api('/api/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [
        {
          type: 'MEAL_BOX',
          mealBoxId: specialBox.id,
          quantity: 1,
          notes: 'Less spicy please',
          selections: [
            ...requiredSelections,
            { optionId: chapatiOption.id, valueIds: [valueId(chapatiOption, '3 chapatis')] },
            { optionId: riceOption.id, valueIds: [valueId(riceOption, 'Extra portion')] },
            { optionId: dessertOption.id, valueIds: [valueId(dessertOption, 'Gulab Jamun (2 pcs)')] },
            { optionId: saladOption.id, valueIds: [valueId(saladOption, 'Include')] },
          ],
        },
      ],
      paymentMethod: 'CASH_ON_DELIVERY',
      delivery: {
        name: 'Riya Sharma',
        phone: '+91 98200 11005',
        line1: 'B-704, Sunflower Residency, Baner',
        city: 'Pune',
        pincode: '411045',
      },
    },
  });
  check(boxOrder.status === 201, 'meal box order is created');
  const boxLine = boxOrder.json?.data?.items?.[0];
  check(boxLine?.customizations?.length === 7, 'customizations are stored on the order item', boxLine);
  check(Boolean(boxLine?.customizationSummary), 'customization summary is stored', boxLine?.customizationSummary);

  const kitchenBoard = await api('/api/kitchen/board', { token: kitchenToken });
  check(
    kitchenBoard.json?.data?.new?.some((row) => row.id === boxOrder.json.data.id),
    'kitchen board shows the meal box order',
  );

  /* ----------------------------------------------- scenario C: subscriptions */
  console.log('\nScenario C — tiffin subscription');
  const monthlyPlan = plans.json.data.find((plan) => plan.planType === 'MONTHLY');
  const subscriptionRes = await api('/api/subscriptions', {
    method: 'POST',
    token: customerToken,
    body: {
      planId: monthlyPlan.id,
      startDate: today(),
      mealPreference: 'Regular veg',
      deliverySlot: '12:30 PM',
      delivery: {
        name: 'Riya Sharma',
        phone: '+91 98200 11005',
        line1: 'B-704, Sunflower Residency, Baner',
        city: 'Pune',
        pincode: '411045',
      },
    },
  });
  check(subscriptionRes.status === 201, 'subscription purchase succeeds', subscriptionRes.json);
  const subscription = subscriptionRes.json?.data;
  check(subscription?.status === 'ACTIVE', 'subscription is active');
  check(subscription?.totalPrice === 2800, 'monthly plan price applied');
  check(subscription?.upcomingDeliveries?.length > 0, 'upcoming deliveries are projected');

  const pause = await api(`/api/subscriptions/${subscription.id}/pause`, { method: 'POST', token: customerToken });
  check(pause.json?.data?.status === 'PAUSED', 'customer pauses the subscription');
  const resume = await api(`/api/subscriptions/${subscription.id}/resume`, { method: 'POST', token: customerToken });
  check(resume.json?.data?.status === 'ACTIVE', 'customer resumes the subscription');

  const skipDate = today(1);
  const skip = await api(`/api/subscriptions/${subscription.id}/skip`, {
    method: 'POST',
    token: customerToken,
    body: { date: skipDate, reason: 'Out of town' },
  });
  check(skip.status === 200, 'customer skips a delivery', skip.json);

  const outOfRangeSkip = await api(`/api/subscriptions/${subscription.id}/skip`, {
    method: 'POST',
    token: customerToken,
    body: { date: today(120) },
  });
  check(outOfRangeSkip.status === 400, 'skip outside the subscription period is rejected');

  const generate = await api('/api/subscriptions/generate-orders', {
    method: 'POST',
    token: ownerToken,
    body: { date: today() },
  });
  check(generate.status === 200, 'shop generates subscription orders', generate.json);
  check(generate.json?.data?.summary?.generated >= 1, 'at least one subscription order generated', generate.json?.data);

  const regenerate = await api('/api/subscriptions/generate-orders', {
    method: 'POST',
    token: ownerToken,
    body: { date: today() },
  });
  check(
    regenerate.json?.data?.summary?.generated === 0,
    'order generation is idempotent (no duplicates on re-run)',
    regenerate.json?.data,
  );

  const subOrders = await api(`/api/subscriptions/${subscription.id}/orders`, { token: customerToken });
  check(subOrders.json?.data?.length >= 1, 'generated orders are linked to the subscription');

  const pausedGeneration = await api('/api/subscriptions/generate-orders', {
    method: 'POST',
    token: ownerToken,
    body: { date: skipDate },
  });
  check(
    pausedGeneration.status === 200 &&
      !pausedGeneration.json.data.generated.some((row) => row.subscriptionId === subscription.id),
    'skipped dates are respected during generation',
    pausedGeneration.json?.data,
  );

  const shopSubs = await api('/api/subscriptions', { token: ownerToken });
  check(shopSubs.json?.data?.length >= 2, 'shop can see subscribers');

  /* ------------------------------------------------------ scenario D: bulk */
  console.log('\nScenario D — bulk corporate order');
  const officePackage = packages.json.data.find((pkg) => pkg.name === 'Office Lunch Package');
  const enquiryRes = await api('/api/bulk-enquiries', {
    method: 'POST',
    token: customerToken,
    body: {
      packageId: officePackage.id,
      organizationName: 'Smoke Test Industries',
      contactPerson: 'Test Contact',
      phone: '+91 98200 33999',
      email: 'test@growth.example',
      organizationType: 'Corporate',
      deliveryAddress: 'Plot 9, Test Park, Hinjewadi, Pune 411057',
      requiredDate: today(4),
      preferredTime: '12:30 PM',
      estimatedQuantity: 50,
      dietaryRequirements: '5 Jain meals',
      notes: 'Smoke test enquiry',
    },
  });
  check(enquiryRes.status === 201, 'public bulk enquiry is accepted', enquiryRes.json);
  const enquiry = enquiryRes.json?.data;
  check(Boolean(enquiry?.enquiryNumber), 'enquiry reference generated', enquiry?.enquiryNumber);

  const enquiryList = await api('/api/bulk-enquiries', { token: ownerToken });
  check(enquiryList.json?.data?.some((row) => row.id === enquiry.id), 'shop sees the enquiry');

  const quoteRes = await api(`/api/bulk-enquiries/${enquiry.id}/quotations`, {
    method: 'POST',
    token: ownerToken,
    body: {
      packageName: 'Office Lunch Package',
      quantity: 50,
      perPersonPrice: 135,
      additionalCharges: 300,
      discount: 200,
      terms: 'Smoke test terms',
    },
  });
  check(quoteRes.status === 201, 'shop sends a quotation', quoteRes.json);
  const quotation = quoteRes.json?.data;
  check(quotation?.total === 6850, 'quotation total is computed by the server (₹6850)', quotation);

  const accepting = await api(`/api/bulk-quotations/${quotation.id}/accept`, {
    method: 'POST',
    token: customerToken,
  });
  check(
    accepting.status === 200 && accepting.json.data.status === 'ACCEPTED',
    'customer accepts the quotation',
    accepting.json,
  );

  const convert = await api(`/api/bulk-quotations/${quotation.id}/convert`, { method: 'POST', token: ownerToken });
  check(convert.status === 201, 'accepted quotation converts into a bulk order', convert.json);
  const bulkOrder = convert.json?.data;
  check(bulkOrder?.total === 6850, 'quoted price is preserved on the bulk order');
  check(bulkOrder?.status === 'CONFIRMED', 'bulk order starts CONFIRMED');

  const convertAgain = await api(`/api/bulk-quotations/${quotation.id}/convert`, {
    method: 'POST',
    token: ownerToken,
  });
  check(convertAgain.status === 409, 'quotation cannot be converted twice');

  const kitchenBulk = await api('/api/kitchen/bulk', { token: kitchenToken });
  check(
    kitchenBulk.json?.data?.orders?.some((row) => row.id === bulkOrder.id),
    'kitchen production board shows the bulk order',
  );
  check(
    kitchenBulk.json?.data?.aggregate?.some((row) => row.quantity >= 50),
    'kitchen aggregates bulk quantities',
    kitchenBulk.json?.data?.aggregate,
  );

  const bulkPreparing = await api(`/api/bulk-orders/${bulkOrder.id}/status`, {
    method: 'PATCH',
    token: kitchenToken,
    body: { status: 'PREPARING' },
  });
  check(bulkPreparing.json?.data?.status === 'PREPARING', 'kitchen starts bulk preparation');

  const bulkReady = await api(`/api/bulk-orders/${bulkOrder.id}/status`, {
    method: 'PATCH',
    token: ownerToken,
    body: { status: 'READY' },
  });
  check(bulkReady.json?.data?.status === 'READY', 'bulk order marked ready');

  const bulkDispatch = await api(`/api/bulk-orders/${bulkOrder.id}/status`, {
    method: 'PATCH',
    token: ownerToken,
    body: { status: 'DISPATCHED' },
  });
  check(bulkDispatch.json?.data?.status === 'DISPATCHED', 'shop marks the bulk order dispatched');

  const bulkComplete = await api(`/api/bulk-orders/${bulkOrder.id}/status`, {
    method: 'PATCH',
    token: ownerToken,
    body: { status: 'COMPLETED' },
  });
  check(bulkComplete.json?.data?.status === 'COMPLETED', 'bulk order completed');

  /* --------------------------------------------------------- dashboards */
  console.log('\nDashboards and configuration');
  const shopOverview = await api('/api/shop/overview', { token: ownerToken });
  check(shopOverview.status === 200 && shopOverview.json.data.metrics.todaysOrders >= 1, 'shop overview metrics load');
  check(shopOverview.json.data.salesTrend.length === 7, 'shop sales trend returns seven days');

  const finance = await api('/api/shop/finance', { token: ownerToken });
  check(finance.status === 200 && finance.json.data.commissionRate === 10, 'shop finance uses the 10% demo commission');

  const customers = await api('/api/shop/customers', { token: ownerToken });
  check(customers.json?.data?.length >= 3, 'customer directory loads');

  const settingsPatch = await api('/api/platform/settings', {
    method: 'PATCH',
    token: adminToken,
    body: { commissionRate: 12 },
  });
  check(settingsPatch.status === 200, 'platform can update the demo commission rate');

  const financeAfter = await api('/api/shop/finance', { token: ownerToken });
  check(financeAfter.json.data.commissionRate === 12, 'new estimates use the updated commission rate');

  await api('/api/platform/settings', { method: 'PATCH', token: adminToken, body: { commissionRate: 10 } });

  const shops = await api('/api/platform/shops', { token: adminToken });
  check(shops.json?.data?.some((shop) => shop.name === 'NEZTA'), 'platform shop directory lists NEZTA');

  const suspend = await api(`/api/platform/shops/${shops.json.data[0].id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'SUSPENDED' },
  });
  check(suspend.json?.data?.status === 'SUSPENDED', 'platform can suspend a demo shop');
  await api(`/api/platform/shops/${shops.json.data[0].id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'ACTIVE' },
  });

  const unauthorized = await api('/api/platform/overview', { token: customerToken });
  check(unauthorized.status === 403, 'role guard blocks platform access for customers');

  /* --------------------------------------------------------------- report */
  console.log(`\n──────────── ${passed} passed, ${failed} failed ────────────`);
  if (failed) {
    console.log('Failed checks:');
    for (const label of failures) console.log(` - ${label}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\nSmoke test crashed:', error.message);
  process.exitCode = 1;
});
