import { money } from './format.js';

export function serializeCategory(category) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: category._count?.products ?? undefined,
  };
}

export function serializeProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    shopId: product.shopId,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    name: product.name,
    slug: product.slug,
    description: product.description,
    imageUrl: product.imageUrl,
    price: money(product.price),
    unitLabel: product.unitLabel,
    isVeg: product.isVeg,
    isAvailable: product.isAvailable,
    isFeatured: product.isFeatured,
    preparationMinutes: product.preparationMinutes,
    sortOrder: product.sortOrder,
  };
}

export function serializeMealBoxValue(value) {
  return {
    id: value.id,
    label: value.label,
    priceDelta: money(value.priceDelta),
    isDefault: value.isDefault,
    productId: value.productId ?? null,
  };
}

export function serializeMealBoxOption(option) {
  return {
    id: option.id,
    label: option.label,
    type: option.type,
    minSelect: option.minSelect,
    maxSelect: option.maxSelect,
    isRequired: option.isRequired,
    helpText: option.helpText,
    values: (option.values ?? []).map(serializeMealBoxValue),
  };
}

export function serializeMealBox(mealBox) {
  if (!mealBox) return null;
  return {
    id: mealBox.id,
    shopId: mealBox.shopId,
    name: mealBox.name,
    slug: mealBox.slug,
    description: mealBox.description,
    imageUrl: mealBox.imageUrl,
    basePrice: money(mealBox.basePrice),
    servings: mealBox.servings,
    prepMinutes: mealBox.prepMinutes,
    badge: mealBox.badge,
    isAvailable: mealBox.isAvailable,
    isFeatured: mealBox.isFeatured,
    items: (mealBox.items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity,
      productId: item.productId ?? null,
    })),
    options: (mealBox.options ?? []).map(serializeMealBoxOption),
  };
}

export function serializeOrderItem(item) {
  return {
    id: item.id,
    itemType: item.itemType,
    productId: item.productId,
    mealBoxId: item.mealBoxId,
    name: item.name,
    description: item.description,
    unitPrice: money(item.unitPrice),
    quantity: item.quantity,
    lineTotal: money(item.lineTotal),
    customizationSummary: item.customizationSummary,
    notes: item.notes,
    customizations: (item.customizations ?? []).map((customization) => ({
      id: customization.id,
      groupLabel: customization.groupLabel,
      optionLabel: customization.optionLabel,
      valueLabel: customization.valueLabel,
      quantity: customization.quantity,
      priceDelta: money(customization.priceDelta),
    })),
  };
}

export function serializeHistory(entry) {
  return {
    id: entry.id,
    status: entry.status,
    actorRole: entry.actorRole,
    actorName: entry.actorName,
    note: entry.note,
    createdAt: entry.createdAt,
  };
}

export function serializeAssignment(assignment) {
  if (!assignment) return null;
  return {
    id: assignment.id,
    status: assignment.status,
    otpCode: assignment.otpCode,
    otpVerified: assignment.otpVerified,
    riderId: assignment.riderId,
    riderName: assignment.rider?.name ?? null,
    riderPhone: assignment.rider?.phone ?? null,
    assignedAt: assignment.assignedAt,
    acceptedAt: assignment.acceptedAt,
    pickedUpAt: assignment.pickedUpAt,
    outForDeliveryAt: assignment.outForDeliveryAt,
    deliveredAt: assignment.deliveredAt,
    failureReason: assignment.failureReason,
  };
}

export function serializeOrder(order, { includeDetails = true } = {}) {
  if (!order) return null;
  const base = {
    id: order.id,
    orderNumber: order.orderNumber,
    shopId: order.shopId,
    source: order.source,
    status: order.status,
    subtotal: money(order.subtotal),
    discount: money(order.discount),
    deliveryFee: money(order.deliveryFee),
    total: money(order.total),
    couponCode: order.couponCode,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    placedAt: order.placedAt,
    scheduledFor: order.scheduledFor,
    deliveredAt: order.deliveredAt,
    delivery: {
      name: order.deliveryName,
      phone: order.deliveryPhone,
      line1: order.deliveryLine1,
      line2: order.deliveryLine2,
      city: order.deliveryCity,
      pincode: order.deliveryPincode,
      instructions: order.deliveryInstructions,
    },
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email,
        }
      : null,
    rider: order.rider ? { id: order.rider.id, name: order.rider.name, phone: order.rider.phone } : null,
    shop: order.shop ? { id: order.shop.id, name: order.shop.name, slug: order.shop.slug } : null,
    itemCount: order._count?.items ?? order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    subscription: order.subscription
      ? {
          id: order.subscription.id,
          subscriptionNumber: order.subscription.subscriptionNumber,
          planName: order.subscription.plan?.name ?? null,
        }
      : null,
    bulkOrder: order.bulkOrder
      ? {
          id: order.bulkOrder.id,
          bulkOrderNumber: order.bulkOrder.bulkOrderNumber,
          organizationName: order.bulkOrder.organizationName,
        }
      : null,
  };

  if (!includeDetails) {
    return {
      ...base,
      items: (order.items ?? []).map((item) => ({ name: item.name, quantity: item.quantity })),
    };
  }

  return {
    ...base,
    items: (order.items ?? []).map(serializeOrderItem),
    history: (order.history ?? []).map(serializeHistory),
    assignment: serializeAssignment(order.assignment),
    notes: order.notes ?? null,
  };
}

export function serializeCustomer(customer) {
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    createdAt: customer.createdAt,
    addresses: (customer.addresses ?? []).map((address) => ({
      id: address.id,
      label: address.label,
      receiverName: address.receiverName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      pincode: address.pincode,
      isDefault: address.isDefault,
    })),
    totalOrders: customer._count?.orders ?? undefined,
  };
}

export function serializePlan(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    shopId: plan.shopId,
    name: plan.name,
    slug: plan.slug,
    planType: plan.planType,
    durationDays: plan.durationDays,
    price: money(plan.price),
    description: plan.description,
    mealType: plan.mealType,
    deliveryWindow: plan.deliveryWindow,
    mealsPerDay: plan.mealsPerDay,
    savingsNote: plan.savingsNote,
    imageUrl: plan.imageUrl,
    isAvailable: plan.isAvailable,
    isFeatured: plan.isFeatured,
    items: (plan.items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity,
      productId: item.productId ?? null,
    })),
    subscriberCount: plan._count?.subscriptions ?? undefined,
  };
}

export function serializeSubscription(subscription) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    subscriptionNumber: subscription.subscriptionNumber,
    status: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    deliverySlot: subscription.deliverySlot,
    mealPreference: subscription.mealPreference,
    totalPrice: money(subscription.totalPrice),
    paymentStatus: subscription.paymentStatus,
    pausedAt: subscription.pausedAt,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    delivery: {
      name: subscription.deliveryName,
      phone: subscription.deliveryPhone,
      line1: subscription.deliveryLine1,
      line2: subscription.deliveryLine2,
      city: subscription.deliveryCity,
      pincode: subscription.deliveryPincode,
    },
    plan: subscription.plan
      ? {
          id: subscription.plan.id,
          name: subscription.plan.name,
          planType: subscription.plan.planType,
          durationDays: subscription.plan.durationDays,
          price: money(subscription.plan.price),
          mealType: subscription.plan.mealType,
          deliveryWindow: subscription.plan.deliveryWindow,
        }
      : null,
    customer: subscription.customer
      ? {
          id: subscription.customer.id,
          name: subscription.customer.name,
          phone: subscription.customer.phone,
          email: subscription.customer.email,
        }
      : null,
    schedule: (subscription.schedules ?? []).map((slot) => ({
      weekday: slot.weekday,
      deliveryTime: slot.deliveryTime,
    })),
    skips: (subscription.skips ?? []).map((skip) => ({ id: skip.id, date: skip.skipDate, reason: skip.reason })),
    orders: (subscription.orders ?? []).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      scheduledFor: order.scheduledFor,
      total: money(order.total),
      deliveryDate: order.subscriptionOrder?.deliveryDate ?? order.scheduledFor,
    })),
  };
}

export function serializeQuotation(quotation) {
  if (!quotation) return null;
  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber,
    packageName: quotation.packageName,
    quantity: quotation.quantity,
    perPersonPrice: money(quotation.perPersonPrice),
    additionalCharges: money(quotation.additionalCharges),
    discount: money(quotation.discount),
    total: money(quotation.total),
    terms: quotation.terms,
    validUntil: quotation.validUntil,
    status: quotation.status,
    createdAt: quotation.createdAt,
    bulkOrderId: quotation.bulkOrder?.id ?? null,
  };
}

export function serializeEnquiry(enquiry) {
  if (!enquiry) return null;
  return {
    id: enquiry.id,
    enquiryNumber: enquiry.enquiryNumber,
    organizationName: enquiry.organizationName,
    contactPerson: enquiry.contactPerson,
    phone: enquiry.phone,
    email: enquiry.email,
    organizationType: enquiry.organizationType,
    deliveryAddress: enquiry.deliveryAddress,
    requiredDate: enquiry.requiredDate,
    preferredTime: enquiry.preferredTime,
    estimatedQuantity: enquiry.estimatedQuantity,
    packageName: enquiry.packageName,
    dietaryRequirements: enquiry.dietaryRequirements,
    notes: enquiry.notes,
    status: enquiry.status,
    createdAt: enquiry.createdAt,
    quotations: (enquiry.quotations ?? []).map(serializeQuotation),
    bulkOrder: enquiry.bulkOrder
      ? { id: enquiry.bulkOrder.id, bulkOrderNumber: enquiry.bulkOrder.bulkOrderNumber, status: enquiry.bulkOrder.status }
      : null,
    history: (enquiry.statusHistory ?? []).map((entry) => ({
      id: entry.id,
      status: entry.status,
      actorName: entry.actorName,
      note: entry.note,
      createdAt: entry.createdAt,
    })),
  };
}

export function serializeBulkOrder(bulkOrder) {
  if (!bulkOrder) return null;
  return {
    id: bulkOrder.id,
    bulkOrderNumber: bulkOrder.bulkOrderNumber,
    organizationName: bulkOrder.organizationName,
    contactPerson: bulkOrder.contactPerson,
    phone: bulkOrder.phone,
    email: bulkOrder.email,
    deliveryAddress: bulkOrder.deliveryAddress,
    deliveryDate: bulkOrder.deliveryDate,
    deliveryTime: bulkOrder.deliveryTime,
    quantity: bulkOrder.quantity,
    packageName: bulkOrder.packageName,
    perPersonPrice: money(bulkOrder.perPersonPrice),
    additionalCharges: money(bulkOrder.additionalCharges),
    discount: money(bulkOrder.discount),
    total: money(bulkOrder.total),
    terms: bulkOrder.terms,
    dietaryRequirements: bulkOrder.dietaryRequirements,
    notes: bulkOrder.notes,
    status: bulkOrder.status,
    dispatchedAt: bulkOrder.dispatchedAt,
    completedAt: bulkOrder.completedAt,
    createdAt: bulkOrder.createdAt,
    quotationNumber: bulkOrder.quotation?.quotationNumber ?? null,
    items: (bulkOrder.items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity,
      unitPrice: item.unitPrice ? money(item.unitPrice) : null,
      notes: item.notes,
    })),
    history: (bulkOrder.history ?? []).map((entry) => ({
      id: entry.id,
      status: entry.status,
      actorName: entry.actorName,
      note: entry.note,
      createdAt: entry.createdAt,
    })),
    rider: bulkOrder.assignments?.[0]?.rider
      ? { id: bulkOrder.assignments[0].rider.id, name: bulkOrder.assignments[0].rider.name }
      : null,
  };
}
