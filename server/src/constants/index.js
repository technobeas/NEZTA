export const ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  SHOP_OWNER: 'SHOP_OWNER',
  KITCHEN_STAFF: 'KITCHEN_STAFF',
  RIDER: 'RIDER',
  CUSTOMER: 'CUSTOMER',
};

/** Ordered happy path used by the customer tracking timeline. */
export const ORDER_FLOW = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'RIDER_ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const ORDER_STATUS_LABELS = {
  NEW: 'Order placed',
  CONFIRMED: 'Order confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  RIDER_ASSIGNED: 'Rider assigned',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  DELIVERY_FAILED: 'Delivery failed',
};

/** Allowed workflow transitions. Anything not listed here is rejected. */
export const ORDER_TRANSITIONS = {
  NEW: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['RIDER_ASSIGNED', 'CANCELLED'],
  RIDER_ASSIGNED: ['PICKED_UP', 'DELIVERY_FAILED'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
  DELIVERY_FAILED: [],
};

/** Which roles may perform each transition. */
export const TRANSITION_ROLES = {
  CONFIRMED: ['SHOP_OWNER', 'PLATFORM_ADMIN'],
  REJECTED: ['SHOP_OWNER', 'PLATFORM_ADMIN'],
  PREPARING: ['SHOP_OWNER', 'KITCHEN_STAFF', 'PLATFORM_ADMIN'],
  READY_FOR_PICKUP: ['SHOP_OWNER', 'KITCHEN_STAFF', 'PLATFORM_ADMIN'],
  RIDER_ASSIGNED: ['SHOP_OWNER', 'PLATFORM_ADMIN'],
  PICKED_UP: ['RIDER', 'SHOP_OWNER'],
  OUT_FOR_DELIVERY: ['RIDER', 'SHOP_OWNER'],
  DELIVERED: ['RIDER', 'SHOP_OWNER'],
  DELIVERY_FAILED: ['RIDER', 'SHOP_OWNER'],
  CANCELLED: ['CUSTOMER', 'SHOP_OWNER', 'PLATFORM_ADMIN'],
};

/** Customers may only cancel early in the lifecycle. */
export const CUSTOMER_CANCELLABLE = ['NEW', 'CONFIRMED'];

export const BULK_FLOW = [
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'COMPLETED',
];

export const BULK_TRANSITIONS = {
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const DEMO_ACCOUNTS = [
  {
    role: 'PLATFORM_ADMIN',
    email: 'admin@nezta.demo',
    name: 'Aarav Mehta',
    label: 'Platform Admin',
    description: 'Marketplace overview, shops, commission settings',
  },
  {
    role: 'SHOP_OWNER',
    email: 'owner@nezta.demo',
    name: 'Nisha Patel',
    label: 'Shop Owner',
    description: 'NEZTA shop operations, menu, subscriptions and bulk orders',
  },
  {
    role: 'KITCHEN_STAFF',
    email: 'kitchen@nezta.demo',
    name: 'Ramesh Pawar',
    label: 'Kitchen Staff',
    description: 'Kitchen board, preparation and ready-for-pickup',
  },
  {
    role: 'RIDER',
    email: 'rider@nezta.demo',
    name: 'Sohail Khan',
    label: 'Delivery Rider',
    description: 'Assigned deliveries and demo OTP confirmation',
  },
  {
    role: 'CUSTOMER',
    email: 'customer@nezta.demo',
    name: 'Riya Sharma',
    label: 'Customer',
    description: 'Ordering, subscriptions, bulk enquiries and tracking',
  },
];

export const DEMO_PASSWORD = 'demo1234';

export const COMMISSION_SETTING_KEY = 'commission_rate';
