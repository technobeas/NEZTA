export const ORDER_FLOW = [
  { status: 'NEW', label: 'Order placed', description: 'We received your order' },
  { status: 'CONFIRMED', label: 'Order confirmed', description: 'NEZTA accepted the order' },
  { status: 'PREPARING', label: 'Preparing', description: 'The kitchen is cooking your meal' },
  { status: 'READY_FOR_PICKUP', label: 'Ready for pickup', description: 'Packed and waiting for the rider' },
  { status: 'RIDER_ASSIGNED', label: 'Rider assigned', description: 'A rider is on the way to the kitchen' },
  { status: 'PICKED_UP', label: 'Picked up', description: 'Your food is with the rider' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', description: 'Arriving shortly' },
  { status: 'DELIVERED', label: 'Delivered', description: 'Enjoy your meal' },
];

export const ORDER_STATUS_LABELS = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
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

export const ORDER_STATUS_TONES = {
  NEW: 'gold',
  CONFIRMED: 'info',
  PREPARING: 'warning',
  READY_FOR_PICKUP: 'accent',
  RIDER_ASSIGNED: 'info',
  PICKED_UP: 'info',
  OUT_FOR_DELIVERY: 'accent',
  DELIVERED: 'success',
  CANCELLED: 'muted',
  REJECTED: 'danger',
  DELIVERY_FAILED: 'danger',
};

export const SOURCE_LABELS = {
  NORMAL: 'Food order',
  SUBSCRIPTION: 'Tiffin',
  BULK: 'Bulk order',
};

export const BULK_STATUS_LABELS = {
  ENQUIRY_RECEIVED: 'Enquiry received',
  QUOTATION_SENT: 'Quotation sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  DISPATCHED: 'Dispatched',
  COMPLETED: 'Completed',
};

export const SUBSCRIPTION_STATUS_LABELS = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export const DELIVERY_STATUS_LABELS = {
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
};

export const CUSTOMER_NAV = [
  { to: '/menu', label: 'Food Menu' },
  { to: '/meal-boxes', label: 'Meal Boxes' },
  { to: '/tiffin-plans', label: 'Tiffin Plans' },
  { to: '/bulk-orders', label: 'Bulk Orders' },
];

export const ROLE_HOME = {
  PLATFORM_ADMIN: '/app/platform',
  SHOP_OWNER: '/app/shop',
  KITCHEN_STAFF: '/app/kitchen',
  RIDER: '/app/rider',
  CUSTOMER: '/',
};

export const ROLE_LABELS = {
  PLATFORM_ADMIN: 'Platform admin',
  SHOP_OWNER: 'Shop owner',
  KITCHEN_STAFF: 'Kitchen staff',
  RIDER: 'Delivery rider',
  CUSTOMER: 'Customer',
};
