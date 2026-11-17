import { hashPassword } from '../utils/password.js';
import { addDays, round, startOfDay, toDateOnly, utcDateFromToday } from '../utils/format.js';

const img = (id, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const IMAGES = {
  hero: img('photo-1504674900247-0877df9cc836', 1600),
  mealBox: img('photo-1546069901-ba9599a7e63c'),
  tiffin: img('photo-1567337710282-00832b415979'),
  catering: img('photo-1555244162-803834f70033'),
  thali: img('photo-1589301760014-d929f3979dbc'),
  masala: img('photo-1631452180519-c014fe946bc7'),
  dal: img('photo-1546833999-b9f581a1996d'),
  chapati: img('photo-1617692855027-33b14f061079'),
  rice: img('photo-1596797038530-2c107229654b'),
  salad: img('photo-1512621776951-a57141f2eefd'),
  achar: img('photo-1601050690597-df0568f70950'),
  farsan: img('photo-1601050690117-94f5f6fa8bd7'),
  dessert: img('photo-1551024506-0bccd828d307'),
};

const DEMO_PASSWORD = 'demo1234';

function hoursAgo(hours, base = new Date()) {
  return new Date(base.getTime() - hours * 3600 * 1000);
}

function atTime(dayOffset, hour, minute = 0) {
  const date = startOfDay(addDays(new Date(), dayOffset));
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Wipes every demo table so the dataset is always reproducible. */
async function wipe(db) {
  const models = [
    'orderItemCustomization',
    'orderItem',
    'orderStatusHistory',
    'subscriptionOrder',
    'deliveryAssignment',
    'order',
    'subscriptionSkip',
    'subscriptionSchedule',
    'subscription',
    'bulkOrderStatusHistory',
    'bulkOrderItem',
    'bulkOrder',
    'bulkOrderQuotation',
    'bulkOrderEnquiry',
    'bulkOrderPackage',
    'tiffinPlanItem',
    'tiffinPlan',
    'mealBoxOptionValue',
    'mealBoxOption',
    'mealBoxItem',
    'mealBox',
    'product',
    'category',
    'coupon',
    'customerAddress',
    'customer',
    'rider',
    'shopMember',
    'shopSetting',
    'shop',
    'user',
    'platformSetting',
  ];
  for (const model of models) {
    await db[model].deleteMany({});
  }
}

export async function seedDatabase(db) {
  await wipe(db);
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  /* ------------------------------------------------------------ platform */

  await db.platformSetting.createMany({
    data: [
      { key: 'commission_rate', value: '10', label: 'Default platform commission rate (%)' },
      { key: 'platform_name', value: 'NEZTA', label: 'Marketplace display name' },
      { key: 'currency', value: 'INR', label: 'Demo currency' },
      { key: 'demo_mode', value: 'true', label: 'Demo environment flag' },
      {
        key: 'demo_notice',
        value: 'All orders, customers, riders and financial figures are demonstration data.',
        label: 'Demo disclaimer shown in the portal',
      },
    ],
  });

  const shop = await db.shop.create({
    data: {
      name: 'NEZTA',
      slug: 'nezta',
      tagline: 'Home-style meals, honest ingredients, delivered warm.',
      description:
        'NEZTA is a neighbourhood kitchen serving fresh Maharashtrian meals, customizable meal boxes, tiffin subscriptions and corporate catering. Every meal is cooked in small batches with cold-pressed oils and seasonal produce.',
      logoUrl: img('photo-1555244162-803834f70033', 400),
      bannerUrl: IMAGES.hero,
      phone: '+91 98200 11223',
      email: 'hello@nezta.demo',
      addressLine: 'Shop 4, Silver Oak Plaza, Baner Road',
      city: 'Pune',
      pincode: '411045',
      status: 'ACTIVE',
      rating: 4.7,
      ratingCount: 1284,
      settings: {
        create: {
          deliveryFee: 30,
          freeDeliveryAbove: 499,
          minOrderValue: 99,
          openingTime: '09:30',
          closingTime: '22:30',
          isAcceptingOrders: true,
        },
      },
    },
  });

  const adminUser = await db.user.create({
    data: {
      email: 'admin@nezta.demo',
      passwordHash,
      name: 'Aarav Mehta',
      phone: '+91 98200 11001',
      role: 'PLATFORM_ADMIN',
    },
  });
  const ownerUser = await db.user.create({
    data: {
      email: 'owner@nezta.demo',
      passwordHash,
      name: 'Nisha Patel',
      phone: '+91 98200 11002',
      role: 'SHOP_OWNER',
      shopId: shop.id,
    },
  });
  const kitchenUser = await db.user.create({
    data: {
      email: 'kitchen@nezta.demo',
      passwordHash,
      name: 'Ramesh Pawar',
      phone: '+91 98200 11003',
      role: 'KITCHEN_STAFF',
      shopId: shop.id,
    },
  });
  const riderUser = await db.user.create({
    data: {
      email: 'rider@nezta.demo',
      passwordHash,
      name: 'Sohail Khan',
      phone: '+91 98200 11004',
      role: 'RIDER',
      shopId: shop.id,
    },
  });
  const customerUser = await db.user.create({
    data: {
      email: 'customer@nezta.demo',
      passwordHash,
      name: 'Riya Sharma',
      phone: '+91 98200 11005',
      role: 'CUSTOMER',
    },
  });

  await db.shopMember.createMany({
    data: [
      { shopId: shop.id, userId: ownerUser.id, role: 'SHOP_OWNER' },
      { shopId: shop.id, userId: kitchenUser.id, role: 'KITCHEN_STAFF' },
      { shopId: shop.id, userId: riderUser.id, role: 'RIDER' },
    ],
  });

  const riderSohail = await db.rider.create({
    data: {
      shopId: shop.id,
      userId: riderUser.id,
      name: 'Sohail Khan',
      phone: '+91 98200 11004',
      vehicleType: 'Bike • MH12 KJ 4412',
      isAvailable: true,
    },
  });
  const riderRahul = await db.rider.create({
    data: {
      shopId: shop.id,
      name: 'Rahul Jadhav',
      phone: '+91 98200 11006',
      vehicleType: 'Scooter • MH12 QP 8890',
      isAvailable: true,
    },
  });

  const customerRiya = await db.customer.create({
    data: {
      shopId: shop.id,
      userId: customerUser.id,
      name: 'Riya Sharma',
      phone: '+91 98200 11005',
      email: 'customer@nezta.demo',
      addresses: {
        create: [
          {
            label: 'Home',
            receiverName: 'Riya Sharma',
            phone: '+91 98200 11005',
            line1: 'B-704, Sunflower Residency, Baner',
            line2: 'Near Balewadi Stadium',
            city: 'Pune',
            pincode: '411045',
            isDefault: true,
          },
          {
            label: 'Office',
            receiverName: 'Riya Sharma',
            phone: '+91 98200 11005',
            line1: '3rd Floor, Horizon IT Park, Aundh',
            city: 'Pune',
            pincode: '411007',
            isDefault: false,
          },
        ],
      },
    },
  });

  const customerVikram = await db.customer.create({
    data: {
      shopId: shop.id,
      name: 'Vikram Desai',
      phone: '+91 98200 11007',
      email: 'vikram.desai@example.com',
      addresses: {
        create: {
          label: 'Home',
          receiverName: 'Vikram Desai',
          phone: '+91 98200 11007',
          line1: '12, Rose Villa, Kothrud',
          city: 'Pune',
          pincode: '411038',
          isDefault: true,
        },
      },
    },
  });

  const customerAnjali = await db.customer.create({
    data: {
      shopId: shop.id,
      name: 'Anjali Kulkarni',
      phone: '+91 98200 11008',
      email: 'anjali.k@example.com',
      addresses: {
        create: {
          label: 'Home',
          receiverName: 'Anjali Kulkarni',
          phone: '+91 98200 11008',
          line1: 'Flat 5, Ganga Heights, Wakad',
          city: 'Pune',
          pincode: '411057',
          isDefault: true,
        },
      },
    },
  });

  /* ----------------------------------------------------------- catalogue */

  const categoryDefs = [
    { name: 'Main Course', slug: 'main-course' },
    { name: 'Breads', slug: 'breads' },
    { name: 'Rice & Sides', slug: 'rice-sides' },
    { name: 'Salads', slug: 'salads' },
    { name: 'Snacks', slug: 'snacks' },
    { name: 'Desserts', slug: 'desserts' },
  ];
  const categories = {};
  for (const [index, definition] of categoryDefs.entries()) {
    categories[definition.slug] = await db.category.create({
      data: { ...definition, shopId: shop.id, sortOrder: index },
    });
  }

  const productDefs = [
    {
      key: 'masala',
      name: 'Special Vegetable Masala',
      slug: 'special-vegetable-masala',
      price: 120,
      category: 'main-course',
      description: 'Slow-cooked seasonal vegetables in a fragrant Kolhapuri masala, finished with fresh coriander.',
      image: IMAGES.masala,
      featured: true,
      prep: 18,
    },
    {
      key: 'dal',
      name: 'Special Dal',
      slug: 'special-dal',
      price: 100,
      category: 'main-course',
      description: 'Toor dal simmered with goda masala, jaggery and a ghee tempering.',
      image: IMAGES.dal,
      featured: true,
      prep: 15,
    },
    {
      key: 'chapati',
      name: 'Chapati',
      slug: 'chapati',
      price: 10,
      category: 'breads',
      description: 'Soft whole-wheat chapati made fresh on the tawa for every order.',
      image: IMAGES.chapati,
      featured: false,
      prep: 6,
      unit: 'per chapati',
    },
    {
      key: 'rice',
      name: 'Rice',
      slug: 'rice',
      price: 60,
      category: 'rice-sides',
      description: 'Steamed sona masoori rice with a spoon of ghee.',
      image: IMAGES.rice,
      featured: false,
      prep: 10,
    },
    {
      key: 'salad',
      name: 'Salad',
      slug: 'salad',
      price: 40,
      category: 'salads',
      description: 'Crisp cucumber, tomato, onion and carrot with lemon and roasted cumin.',
      image: IMAGES.salad,
      featured: false,
      prep: 5,
    },
    {
      key: 'achar',
      name: 'Achar',
      slug: 'achar',
      price: 20,
      category: 'rice-sides',
      description: 'House-made lemon and green chilli pickle, aged for 21 days.',
      image: IMAGES.achar,
      featured: false,
      prep: 2,
      unit: 'per portion',
    },
    {
      key: 'farsan',
      name: 'Farsan',
      slug: 'farsan',
      price: 50,
      category: 'snacks',
      description: 'Crisp kothimbir vadi and sabudana wada duo with mint chutney.',
      image: IMAGES.farsan,
      featured: true,
      prep: 12,
    },
    {
      key: 'gulabjamun',
      name: 'Gulab Jamun',
      slug: 'gulab-jamun',
      price: 60,
      category: 'desserts',
      description: 'Two warm khoya dumplings soaked in cardamom syrup.',
      image: IMAGES.dessert,
      featured: false,
      prep: 5,
      unit: '2 pieces',
    },
  ];

  const products = {};
  for (const [index, definition] of productDefs.entries()) {
    products[definition.key] = await db.product.create({
      data: {
        shopId: shop.id,
        categoryId: categories[definition.category].id,
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        imageUrl: definition.image,
        price: definition.price,
        unitLabel: definition.unit ?? 'per serving',
        isFeatured: definition.featured,
        isAvailable: true,
        preparationMinutes: definition.prep,
        sortOrder: index,
      },
    });
  }

  /* --------------------------------------------------------- meal boxes */

  const mealBoxDefs = [
    {
      name: 'Regular Veg Meal Box',
      slug: 'regular-veg-meal-box',
      description: 'The everyday NEZTA thali — one sabzi, dal, chapati, rice, salad and achar.',
      imageUrl: IMAGES.mealBox,
      basePrice: 149,
      servings: 'Serves 1',
      prepMinutes: 20,
      badge: 'Everyday favourite',
      featured: true,
      items: [
        ['Special Vegetable Masala', 1],
        ['Special Dal', 1],
        ['Chapati', 2],
        ['Rice', 1],
        ['Salad', 1],
        ['Achar', 1],
      ],
      options: [
        {
          label: 'Vegetable',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: 'Special Vegetable Masala', priceDelta: 0, isDefault: true },
            { label: 'Paneer Masala', priceDelta: 40 },
          ],
        },
        {
          label: 'Dal',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: 'Special Dal', priceDelta: 0, isDefault: true },
            { label: 'Dal Fry', priceDelta: 10 },
          ],
        },
        {
          label: 'Chapati',
          type: 'MULTI',
          minSelect: 1,
          maxSelect: 3,
          values: [
            { label: '2 chapatis', priceDelta: 0, isDefault: true },
            { label: '3 chapatis', priceDelta: 10 },
            { label: '4 chapatis', priceDelta: 20 },
          ],
        },
        {
          label: 'Dessert add-on',
          type: 'ADDON',
          minSelect: 0,
          maxSelect: 1,
          isRequired: false,
          values: [
            { label: 'Gulab Jamun (2 pcs)', priceDelta: 60 },
            { label: 'No dessert', priceDelta: 0, isDefault: true },
          ],
        },
      ],
    },
    {
      name: 'Special Veg Meal Box',
      slug: 'special-veg-meal-box',
      description:
        'Our signature box: two sabzis, dal, freshly rolled chapatis, rice, salad, achar and an optional dessert. Fully customizable.',
      imageUrl: IMAGES.thali,
      basePrice: 199,
      servings: 'Serves 1 generously',
      prepMinutes: 25,
      badge: 'Most customizable',
      featured: true,
      items: [
        ['Vegetable Masala', 1],
        ['Special Dal', 1],
        ['Chapati', 2],
        ['Rice', 1],
        ['Salad', 1],
        ['Achar', 1],
      ],
      options: [
        {
          label: 'Vegetable Masala',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          helpText: 'Choose the main vegetable for your box',
          values: [
            { label: 'Special Vegetable Masala', priceDelta: 0, isDefault: true },
            { label: 'Paneer Butter Masala', priceDelta: 50 },
            { label: 'Mix Veg Kolhapuri', priceDelta: 20 },
          ],
        },
        {
          label: 'Dal',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: 'Special Dal', priceDelta: 0, isDefault: true },
            { label: 'Dal Tadka', priceDelta: 15 },
            { label: 'Amti', priceDelta: 15 },
          ],
        },
        {
          label: 'Chapati',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          helpText: 'Pick your portion of fresh chapatis',
          values: [
            { label: '2 chapatis', priceDelta: 0, isDefault: true },
            { label: '3 chapatis', priceDelta: 10 },
            { label: '4 chapatis', priceDelta: 20 },
          ],
        },
        {
          label: 'Rice',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: 'Regular', priceDelta: 0, isDefault: true },
            { label: 'Extra portion', priceDelta: 20 },
            { label: 'Jeera rice', priceDelta: 30 },
          ],
        },
        {
          label: 'Salad',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: 'Include', priceDelta: 0, isDefault: true },
            { label: 'Skip', priceDelta: 0 },
          ],
        },
        {
          label: 'Achar',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: 'Include', priceDelta: 0, isDefault: true },
            { label: 'Skip', priceDelta: 0 },
          ],
        },
        {
          label: 'Dessert',
          type: 'ADDON',
          minSelect: 0,
          maxSelect: 2,
          isRequired: false,
          helpText: 'Optional sweet endings',
          values: [
            { label: 'Gulab Jamun (2 pcs)', priceDelta: 60 },
            { label: 'Shrikhand', priceDelta: 45 },
            { label: 'No dessert', priceDelta: 0, isDefault: true },
          ],
        },
      ],
    },
    {
      name: 'Mini Lunch Box',
      slug: 'mini-lunch-box',
      description: 'A lighter box for busy afternoons — one sabzi, 2 chapatis, rice and achar.',
      imageUrl: IMAGES.mealBox,
      basePrice: 119,
      servings: 'Serves 1',
      prepMinutes: 15,
      badge: 'Light & quick',
      featured: false,
      items: [
        ['Special Vegetable Masala', 1],
        ['Chapati', 2],
        ['Rice', 1],
        ['Achar', 1],
      ],
      options: [
        {
          label: 'Chapati',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: '2 chapatis', priceDelta: 0, isDefault: true },
            { label: '3 chapatis', priceDelta: 10 },
          ],
        },
        {
          label: 'Add a salad',
          type: 'ADDON',
          minSelect: 0,
          maxSelect: 1,
          isRequired: false,
          values: [
            { label: 'Fresh salad', priceDelta: 30 },
            { label: 'No salad', priceDelta: 0, isDefault: true },
          ],
        },
      ],
    },
    {
      name: 'Premium Family Meal Box',
      slug: 'premium-family-meal-box',
      description:
        'A generous family spread: two mains, dal, six chapatis, rice, salad, achar and dessert. Serves four.',
      imageUrl: IMAGES.catering,
      basePrice: 749,
      servings: 'Serves 4',
      prepMinutes: 40,
      badge: 'Feeds the family',
      featured: true,
      items: [
        ['Paneer Butter Masala', 1],
        ['Special Vegetable Masala', 1],
        ['Special Dal', 1],
        ['Chapati', 6],
        ['Rice', 2],
        ['Salad', 1],
        ['Gulab Jamun', 2],
      ],
      options: [
        {
          label: 'Second main course',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: 'Special Vegetable Masala', priceDelta: 0, isDefault: true },
            { label: 'Paneer Butter Masala', priceDelta: 80 },
            { label: 'Veg Kofta Curry', priceDelta: 60 },
          ],
        },
        {
          label: 'Chapati count',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: '6 chapatis', priceDelta: 0, isDefault: true },
            { label: '8 chapatis', priceDelta: 20 },
            { label: '12 chapatis', priceDelta: 50 },
          ],
        },
        {
          label: 'Dessert',
          type: 'ADDON',
          minSelect: 0,
          maxSelect: 2,
          isRequired: false,
          values: [
            { label: 'Gulab Jamun (4 pcs)', priceDelta: 110 },
            { label: 'Shrikhand (500 g)', priceDelta: 160 },
            { label: 'No dessert', priceDelta: 0, isDefault: true },
          ],
        },
      ],
    },
    {
      name: 'Office Lunch Box',
      slug: 'office-lunch-box',
      description: 'Desk-friendly lunch box with a sabzi, dal, 3 chapatis, rice, salad and achar.',
      imageUrl: IMAGES.tiffin,
      basePrice: 179,
      servings: 'Serves 1',
      prepMinutes: 20,
      badge: 'Workday ready',
      featured: false,
      items: [
        ['Special Vegetable Masala', 1],
        ['Special Dal', 1],
        ['Chapati', 3],
        ['Rice', 1],
        ['Salad', 1],
      ],
      options: [
        {
          label: 'Chapati',
          type: 'SINGLE',
          minSelect: 1,
          maxSelect: 1,
          values: [
            { label: '3 chapatis', priceDelta: 0, isDefault: true },
            { label: '4 chapatis', priceDelta: 10 },
          ],
        },
        {
          label: 'Add farsan',
          type: 'ADDON',
          minSelect: 0,
          maxSelect: 1,
          isRequired: false,
          values: [
            { label: 'Farsan portion', priceDelta: 50 },
            { label: 'No farsan', priceDelta: 0, isDefault: true },
          ],
        },
      ],
    },
  ];

  for (const [index, definition] of mealBoxDefs.entries()) {
    await db.mealBox.create({
      data: {
        shopId: shop.id,
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        imageUrl: definition.imageUrl,
        basePrice: definition.basePrice,
        servings: definition.servings,
        prepMinutes: definition.prepMinutes,
        badge: definition.badge,
        isFeatured: definition.featured,
        isAvailable: true,
        sortOrder: index,
        items: {
          create: definition.items.map(([label, quantity], itemIndex) => ({
            label,
            quantity,
            sortOrder: itemIndex,
          })),
        },
        options: {
          create: definition.options.map((option, optionIndex) => ({
            label: option.label,
            type: option.type,
            minSelect: option.minSelect,
            maxSelect: option.maxSelect,
            isRequired: option.isRequired ?? true,
            helpText: option.helpText ?? null,
            sortOrder: optionIndex,
            values: {
              create: option.values.map((value, valueIndex) => ({
                label: value.label,
                priceDelta: value.priceDelta ?? 0,
                isDefault: value.isDefault ?? false,
                sortOrder: valueIndex,
              })),
            },
          })),
        },
      },
    });
  }

  /* ------------------------------------------------------ tiffin plans */

  const planDefs = [
    {
      name: 'Daily Tiffin',
      slug: 'daily-tiffin',
      planType: 'DAILY',
      durationDays: 1,
      price: 120,
      description: 'Try a single home-style lunch delivered to your door.',
      mealType: 'Veg lunch',
      deliveryWindow: '12:00 PM - 1:30 PM',
      savingsNote: null,
      featured: false,
      items: ['Special Vegetable Masala', 'Special Dal', 'Chapati', 'Rice', 'Salad'],
    },
    {
      name: 'Weekly Tiffin',
      slug: 'weekly-tiffin',
      planType: 'WEEKLY',
      durationDays: 7,
      price: 750,
      description: 'Six lunches across the week with a rotating seasonal menu.',
      mealType: 'Veg lunch',
      deliveryWindow: '12:00 PM - 1:30 PM',
      savingsNote: 'Saves ₹90 vs daily orders',
      featured: true,
      items: ['Special Vegetable Masala', 'Special Dal', 'Chapati (3)', 'Rice', 'Salad', 'Achar'],
    },
    {
      name: 'Monthly Tiffin',
      slug: 'monthly-tiffin',
      planType: 'MONTHLY',
      durationDays: 30,
      price: 2800,
      description: 'A full month of lunches with priority delivery and two skip days.',
      mealType: 'Veg lunch',
      deliveryWindow: '12:15 PM - 1:15 PM',
      savingsNote: 'Saves ₹800 vs daily orders',
      featured: true,
      items: ['Special Vegetable Masala', 'Special Dal', 'Chapati (3)', 'Rice', 'Salad', 'Achar', 'Farsan'],
    },
  ];

  const plans = {};
  for (const [index, definition] of planDefs.entries()) {
    plans[definition.slug] = await db.tiffinPlan.create({
      data: {
        shopId: shop.id,
        name: definition.name,
        slug: definition.slug,
        planType: definition.planType,
        durationDays: definition.durationDays,
        price: definition.price,
        description: definition.description,
        mealType: definition.mealType,
        deliveryWindow: definition.deliveryWindow,
        savingsNote: definition.savingsNote,
        imageUrl: IMAGES.tiffin,
        isAvailable: true,
        isFeatured: definition.featured,
        sortOrder: index,
        items: {
          create: definition.items.map((label) => ({ label, quantity: 1 })),
        },
      },
    });
  }

  /* -------------------------------------------------------- bulk packages */

  const bulkDefs = [
    {
      name: 'Office Lunch Package',
      slug: 'office-lunch-package',
      description: 'A balanced thali delivered on schedule to your office floor.',
      targetSegments: 'Offices, co-working spaces, startups',
      includes: 'Two sabzis, dal, 3 chapatis, rice, salad, achar, sealed cutlery',
      minQuantity: 20,
      perPersonPrice: 135,
      imageUrl: IMAGES.tiffin,
    },
    {
      name: 'School Meal Package',
      slug: 'school-meal-package',
      description: 'Child-friendly portions with low spice and no fried add-ons.',
      targetSegments: 'Schools, daycares, coaching classes',
      includes: 'Sabzi, dal, 2 chapatis, rice, fruit cup',
      minQuantity: 50,
      perPersonPrice: 95,
      imageUrl: IMAGES.mealBox,
    },
    {
      name: 'Hospital Meal Package',
      slug: 'hospital-meal-package',
      description: 'Dietitian-friendly meals for patients, attendants and staff.',
      targetSegments: 'Hospitals, clinics, care homes',
      includes: 'Low-oil sabzi, dal, 2 chapatis, rice, soup, no onion/garlic option',
      minQuantity: 25,
      perPersonPrice: 110,
      imageUrl: IMAGES.dal,
    },
    {
      name: 'Corporate Event Package',
      slug: 'corporate-event-package',
      description: 'Buffet-ready spread for meetings, town halls and offsites.',
      targetSegments: 'Corporate events, conferences, meetings',
      includes: 'Two mains, dal, rice, chapati counter, salad bar, dessert, service staff',
      minQuantity: 30,
      perPersonPrice: 210,
      imageUrl: IMAGES.catering,
    },
    {
      name: 'Family Gathering Package',
      slug: 'family-gathering-package',
      description: 'Celebration menu for functions and family get-togethers.',
      targetSegments: 'Family functions, celebrations, events',
      includes: 'Three mains, dal, puri & chapati, rice, farsan, dessert',
      minQuantity: 15,
      perPersonPrice: 175,
      imageUrl: IMAGES.thali,
    },
  ];

  const bulkPackages = [];
  for (const [index, definition] of bulkDefs.entries()) {
    bulkPackages.push(
      await db.bulkOrderPackage.create({
        data: { ...definition, shopId: shop.id, sortOrder: index, isActive: true },
      }),
    );
  }

  /* ------------------------------------------------------------- coupons */

  await db.coupon.createMany({
    data: [
      {
        shopId: shop.id,
        code: 'NEZTA10',
        description: '10% off your first order (up to ₹100)',
        type: 'PERCENT',
        value: 10,
        minOrderValue: 299,
        maxDiscount: 100,
      },
      {
        shopId: shop.id,
        code: 'FIRST50',
        description: 'Flat ₹50 off orders above ₹350',
        type: 'FLAT',
        value: 50,
        minOrderValue: 350,
      },
      {
        shopId: shop.id,
        code: 'TIFFIN50',
        description: 'Flat ₹50 off any tiffin order above ₹400',
        type: 'FLAT',
        value: 50,
        minOrderValue: 400,
      },
    ],
  });

  /* -------------------------------------------------------------- orders */

  const orderItemsFor = (keys) =>
    keys.map(([key, quantity]) => {
      const product = products[key];
      return {
        itemType: 'PRODUCT',
        productId: product.id,
        name: product.name,
        description: product.description,
        unitPrice: product.price,
        quantity,
        lineTotal: round(Number(product.price) * quantity),
      };
    });

  const deliveryFor = (customer) => ({
    deliveryName: customer.name,
    deliveryPhone: customer.phone,
    deliveryLine1: 'B-704, Sunflower Residency, Baner',
    deliveryLine2: 'Near Balewadi Stadium',
    deliveryCity: 'Pune',
    deliveryPincode: '411045',
  });

  const historyRows = (entries) =>
    entries.map((entry) => ({
      status: entry.status,
      actorRole: entry.role ?? 'SHOP_OWNER',
      actorName: entry.name ?? 'Nisha Patel',
      note: entry.note ?? null,
      createdAt: entry.at,
    }));

  async function createSeedOrder({
    customer,
    items,
    status,
    hoursOffset,
    dayOffset = 0,
    source = 'NORMAL',
    riderId = null,
    subscriptionId = null,
    history = [],
    paymentStatus = 'SIMULATED_PAID',
    couponCode = null,
    discount = 0,
  }) {
    const lines = orderItemsFor(items);
    const subtotal = round(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const deliveryFee = subtotal >= 499 ? 0 : 30;
    const total = round(subtotal - discount + deliveryFee);
    const placedAt = dayOffset === 0 ? hoursAgo(hoursOffset) : atTime(dayOffset, 12, 30);
    const count = await db.order.count();

    return db.order.create({
      data: {
        orderNumber: `NZ-${toDateOnly(placedAt).replace(/-/g, '').slice(2)}-${String(1000 + count)}`,
        shopId: shop.id,
        customerId: customer.id,
        source,
        status,
        subtotal,
        discount,
        deliveryFee,
        total,
        couponCode,
        paymentMethod: 'CASH_ON_DELIVERY',
        paymentStatus,
        placedAt,
        deliveredAt: status === 'DELIVERED' ? new Date(placedAt.getTime() + 45 * 60000) : null,
        riderId,
        subscriptionId,
        ...deliveryFor(customer),
        items: { create: lines },
        history: { create: historyRows(history) },
      },
    });
  }

  const pastOrderPlan = [
    { hours: 5, dayOffset: -1, customer: customerRiya, items: [['masala', 1], ['chapati', 4], ['rice', 1], ['gulabjamun', 1]] },
    { hours: 6, dayOffset: -1, customer: customerVikram, items: [['dal', 1], ['chapati', 3], ['salad', 1]] },
    { hours: 4, dayOffset: -2, customer: customerAnjali, items: [['masala', 2], ['rice', 2], ['achar', 2]] },
    { hours: 7, dayOffset: -2, customer: customerRiya, items: [['farsan', 1], ['dal', 1], ['chapati', 4]] },
    { hours: 5, dayOffset: -3, customer: customerVikram, items: [['masala', 1], ['rice', 1], ['gulabjamun', 2]] },
    { hours: 8, dayOffset: -3, customer: customerAnjali, items: [['dal', 2], ['chapati', 6], ['salad', 2]] },
    { hours: 5, dayOffset: -4, customer: customerRiya, items: [['masala', 1], ['dal', 1], ['chapati', 4], ['rice', 1]] },
    { hours: 6, dayOffset: -4, customer: customerVikram, items: [['farsan', 2], ['rice', 1]] },
    { hours: 5, dayOffset: -5, customer: customerAnjali, items: [['masala', 1], ['chapati', 3], ['gulabjamun', 1]] },
    { hours: 7, dayOffset: -5, customer: customerRiya, items: [['dal', 1], ['rice', 2], ['salad', 1]] },
    { hours: 6, dayOffset: -6, customer: customerVikram, items: [['masala', 2], ['chapati', 6], ['rice', 2], ['farsan', 1]] },
  ];

  for (const [index, entry] of pastOrderPlan.entries()) {
    const placedAtDay = entry.dayOffset;
    const history = [
      { status: 'NEW', at: atTime(placedAtDay, 12, 30) },
      { status: 'CONFIRMED', at: atTime(placedAtDay, 12, 33) },
      { status: 'PREPARING', at: atTime(placedAtDay, 12, 40), role: 'KITCHEN_STAFF', name: 'Ramesh Pawar' },
      { status: 'READY_FOR_PICKUP', at: atTime(placedAtDay, 12, 55), role: 'KITCHEN_STAFF', name: 'Ramesh Pawar' },
      { status: 'RIDER_ASSIGNED', at: atTime(placedAtDay, 13, 0) },
      { status: 'PICKED_UP', at: atTime(placedAtDay, 13, 5), role: 'RIDER', name: 'Sohail Khan' },
      { status: 'OUT_FOR_DELIVERY', at: atTime(placedAtDay, 13, 8), role: 'RIDER', name: 'Sohail Khan' },
      { status: 'DELIVERED', at: atTime(placedAtDay, 13, 25), role: 'RIDER', name: 'Sohail Khan' },
    ];
    await createSeedOrder({
      customer: entry.customer,
      items: entry.items,
      status: 'DELIVERED',
      hoursOffset: entry.hours,
      dayOffset: entry.dayOffset,
      riderId: index % 2 === 0 ? riderSohail.id : riderRahul.id,
      history,
    });
  }

  // One cancelled sample order for the analytics empty/exception states.
  await createSeedOrder({
    customer: customerAnjali,
    items: [['masala', 1], ['chapati', 2]],
    status: 'CANCELLED',
    dayOffset: -2,
    history: [
      { status: 'NEW', at: atTime(-2, 19, 10) },
      { status: 'REJECTED', at: atTime(-2, 19, 14), note: 'Kitchen closed for the day' },
    ],
  });

  // Live orders for today's dashboards.
  const newOrder = await createSeedOrder({
    customer: customerRiya,
    items: [['masala', 1], ['dal', 1], ['chapati', 4], ['rice', 1]],
    status: 'NEW',
    hoursOffset: 1.2,
    paymentStatus: 'PENDING',
    history: [{ status: 'NEW', at: hoursAgo(1.2), role: 'CUSTOMER', name: 'Riya Sharma' }],
  });

  await createSeedOrder({
    customer: customerVikram,
    items: [['farsan', 1], ['dal', 1], ['chapati', 3], ['salad', 1]],
    status: 'CONFIRMED',
    hoursOffset: 0.9,
    paymentStatus: 'PENDING',
    history: [
      { status: 'NEW', at: hoursAgo(0.9), role: 'CUSTOMER', name: 'Vikram Desai' },
      { status: 'CONFIRMED', at: hoursAgo(0.8) },
    ],
  });

  await createSeedOrder({
    customer: customerAnjali,
    items: [['masala', 2], ['rice', 2], ['gulabjamun', 2]],
    status: 'PREPARING',
    hoursOffset: 0.7,
    paymentStatus: 'PENDING',
    history: [
      { status: 'NEW', at: hoursAgo(0.7), role: 'CUSTOMER', name: 'Anjali Kulkarni' },
      { status: 'CONFIRMED', at: hoursAgo(0.65) },
      { status: 'PREPARING', at: hoursAgo(0.5), role: 'KITCHEN_STAFF', name: 'Ramesh Pawar' },
    ],
  });

  const readyOrder = await createSeedOrder({
    customer: customerVikram,
    items: [['chapati', 6], ['masala', 1], ['dal', 1], ['achar', 2]],
    status: 'RIDER_ASSIGNED',
    hoursOffset: 0.6,
    paymentStatus: 'PENDING',
    history: [
      { status: 'NEW', at: hoursAgo(0.6), role: 'CUSTOMER', name: 'Vikram Desai' },
      { status: 'CONFIRMED', at: hoursAgo(0.58) },
      { status: 'PREPARING', at: hoursAgo(0.45), role: 'KITCHEN_STAFF', name: 'Ramesh Pawar' },
      { status: 'READY_FOR_PICKUP', at: hoursAgo(0.2), role: 'KITCHEN_STAFF', name: 'Ramesh Pawar' },
      { status: 'RIDER_ASSIGNED', at: hoursAgo(0.12), role: 'SHOP_OWNER', name: 'Nisha Patel' },
    ],
  });

  /* ------------------------------------------------------- subscriptions */

  const monthlyStart = utcDateFromToday(-5);
  const monthlyEnd = addDays(monthlyStart, 29);
  const subscription = await db.subscription.create({
    data: {
      subscriptionNumber: `SUB-${toDateOnly(monthlyStart).replace(/-/g, '').slice(2)}-101`,
      shopId: shop.id,
      customerId: customerRiya.id,
      planId: plans['monthly-tiffin'].id,
      status: 'ACTIVE',
      startDate: monthlyStart,
      endDate: monthlyEnd,
      deliverySlot: '12:15 PM - 1:15 PM',
      mealPreference: 'Jain (no onion, no garlic)',
      deliveryName: 'Riya Sharma',
      deliveryPhone: '+91 98200 11005',
      deliveryLine1: 'B-704, Sunflower Residency, Baner',
      deliveryLine2: 'Near Balewadi Stadium',
      deliveryCity: 'Pune',
      deliveryPincode: '411045',
      totalPrice: 2800,
      paymentStatus: 'PENDING',
      schedules: {
        create: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, deliveryTime: '12:30 PM' })),
      },
      skips: {
        create: [{ skipDate: utcDateFromToday(2), reason: 'Travelling for work' }],
      },
    },
  });

  const perDelivery = round(2800 / 30);
  const subscriptionItems = ['Special Vegetable Masala', 'Special Dal', 'Chapati (3)', 'Rice', 'Salad', 'Achar', 'Farsan'];
  for (let index = 4; index >= 1; index -= 1) {
    const deliveryDate = utcDateFromToday(-index);
    const order = await db.order.create({
      data: {
        orderNumber: `NZT-${toDateOnly(deliveryDate).replace(/-/g, '').slice(2)}-90${index}`,
        shopId: shop.id,
        customerId: customerRiya.id,
        source: 'SUBSCRIPTION',
        status: 'DELIVERED',
        subtotal: perDelivery,
        discount: 0,
        deliveryFee: 0,
        total: perDelivery,
        paymentStatus: 'SIMULATED_PAID',
        deliveryName: 'Riya Sharma',
        deliveryPhone: '+91 98200 11005',
        deliveryLine1: 'B-704, Sunflower Residency, Baner',
        deliveryCity: 'Pune',
        deliveryPincode: '411045',
        placedAt: atTime(-index, 12, 10),
        scheduledFor: atTime(-index, 12, 30),
        deliveredAt: atTime(-index, 13, 10),
        subscriptionId: subscription.id,
        riderId: riderSohail.id,
        items: {
          create: subscriptionItems.map((label) => ({
            itemType: 'PRODUCT',
            name: label,
            unitPrice: round(perDelivery / subscriptionItems.length),
            quantity: 1,
            lineTotal: round(perDelivery / subscriptionItems.length),
            customizationSummary: 'Meal preference: Jain (no onion, no garlic)',
          })),
        },
        history: {
          create: [
            { status: 'NEW', actorRole: 'SHOP_OWNER', actorName: 'Tiffin scheduler', createdAt: atTime(-index, 11, 0) },
            { status: 'CONFIRMED', actorRole: 'SHOP_OWNER', actorName: 'Tiffin scheduler', createdAt: atTime(-index, 11, 1) },
            { status: 'PREPARING', actorRole: 'KITCHEN_STAFF', actorName: 'Ramesh Pawar', createdAt: atTime(-index, 12, 15) },
            { status: 'DELIVERED', actorRole: 'RIDER', actorName: 'Sohail Khan', createdAt: atTime(-index, 13, 10) },
          ],
        },
      },
    });
    await db.subscriptionOrder.create({
      data: { subscriptionId: subscription.id, orderId: order.id, deliveryDate },
    });
  }

  const pausedStart = utcDateFromToday(-10);
  await db.subscription.create({
    data: {
      subscriptionNumber: `SUB-${toDateOnly(pausedStart).replace(/-/g, '').slice(2)}-102`,
      shopId: shop.id,
      customerId: customerVikram.id,
      planId: plans['weekly-tiffin'].id,
      status: 'PAUSED',
      startDate: pausedStart,
      endDate: addDays(pausedStart, 6),
      deliverySlot: '12:00 PM - 1:30 PM',
      mealPreference: null,
      deliveryName: 'Vikram Desai',
      deliveryPhone: '+91 98200 11007',
      deliveryLine1: '12, Rose Villa, Kothrud',
      deliveryCity: 'Pune',
      deliveryPincode: '411038',
      totalPrice: 750,
      paymentStatus: 'PENDING',
      pausedAt: hoursAgo(72),
      schedules: { create: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, deliveryTime: '12:00 PM' })) },
    },
  });

  /* --------------------------------------------------------- bulk orders */

  const techNova = await db.bulkOrderEnquiry.create({
    data: {
      enquiryNumber: 'ENQ-240101-101',
      shopId: shop.id,
      customerId: customerRiya.id,
      packageId: bulkPackages[0].id,
      packageName: 'Office Lunch Package',
      organizationName: 'TechNova Solutions',
      contactPerson: 'Priya Nair',
      phone: '+91 98200 22001',
      email: 'priya.nair@technova.example',
      organizationType: 'Office',
      deliveryAddress: '5th Floor, Cyber Tower, Hinjewadi Phase 2, Pune 411057',
      requiredDate: addDays(startOfDay(new Date()), 3),
      preferredTime: '12:30 PM',
      estimatedQuantity: 50,
      dietaryRequirements: '10 Jain meals, 5 no-onion-garlic',
      notes: 'Monthly recurring lunch for our operations team. Need itemised invoice.',
      status: 'ENQUIRY_RECEIVED',
      statusHistory: {
        create: {
          status: 'ENQUIRY_RECEIVED',
          actorRole: 'CUSTOMER',
          actorName: 'Priya Nair',
          note: 'Enquiry submitted from the bulk orders page',
        },
      },
    },
  });

  const hospital = await db.bulkOrderEnquiry.create({
    data: {
      enquiryNumber: 'ENQ-240101-102',
      shopId: shop.id,
      customerId: customerVikram.id,
      packageId: bulkPackages[2].id,
      packageName: 'Hospital Meal Package',
      organizationName: 'Sunrise Multispeciality Hospital',
      contactPerson: 'Dr. Kavita Rao',
      phone: '+91 98200 22002',
      email: 'admin@sunrisehospital.example',
      organizationType: 'Hospital',
      deliveryAddress: 'Sunrise Hospital, Nagar Road, Pune 411014',
      requiredDate: addDays(startOfDay(new Date()), 4),
      preferredTime: '11:30 AM',
      estimatedQuantity: 120,
      dietaryRequirements: 'Low oil, low spice, diabetic-friendly',
      notes: 'Staff and attendant meals for a three day camp.',
      status: 'QUOTATION_SENT',
      statusHistory: {
        create: [
          {
            status: 'ENQUIRY_RECEIVED',
            actorRole: 'CUSTOMER',
            actorName: 'Dr. Kavita Rao',
            note: 'Enquiry submitted from the bulk orders page',
          },
          {
            status: 'QUOTATION_SENT',
            actorRole: 'SHOP_OWNER',
            actorName: 'Nisha Patel',
            note: 'Quotation QT-240101-102 sent for ₹13,200',
          },
        ],
      },
    },
  });

  await db.bulkOrderQuotation.create({
    data: {
      enquiryId: hospital.id,
      quotationNumber: 'QT-240101-102',
      packageName: 'Hospital Meal Package',
      quantity: 120,
      perPersonPrice: 110,
      additionalCharges: 400,
      discount: 400,
      total: 13200,
      terms: 'Demo quotation — 50% advance, final headcount 24 hours before delivery.',
      validUntil: addDays(startOfDay(new Date()), 7),
      status: 'SENT',
      createdByUserId: ownerUser.id,
    },
  });

  const schoolEnquiry = await db.bulkOrderEnquiry.create({
    data: {
      enquiryNumber: 'ENQ-240101-103',
      shopId: shop.id,
      customerId: customerAnjali.id,
      packageId: bulkPackages[1].id,
      packageName: 'School Meal Package',
      organizationName: 'Bright Future School',
      contactPerson: 'Meera Joshi',
      phone: '+91 98200 22003',
      email: 'meera@brightfuture.example',
      organizationType: 'School',
      deliveryAddress: 'Bright Future School, Baner Road, Pune 411045',
      requiredDate: addDays(startOfDay(new Date()), 1),
      preferredTime: '12:00 PM',
      estimatedQuantity: 200,
      dietaryRequirements: 'No chilli, moderate spice',
      notes: 'Standard lunch for a school event.',
      status: 'ACCEPTED',
      statusHistory: {
        create: [
          { status: 'ENQUIRY_RECEIVED', actorRole: 'CUSTOMER', actorName: 'Meera Joshi' },
          { status: 'QUOTATION_SENT', actorRole: 'SHOP_OWNER', actorName: 'Nisha Patel' },
          { status: 'ACCEPTED', actorRole: 'CUSTOMER', actorName: 'Meera Joshi', note: 'Quotation accepted' },
          { status: 'CONFIRMED', actorRole: 'SHOP_OWNER', actorName: 'Nisha Patel', note: 'Bulk order created' },
        ],
      },
    },
  });

  const schoolQuotation = await db.bulkOrderQuotation.create({
    data: {
      enquiryId: schoolEnquiry.id,
      quotationNumber: 'QT-240101-103',
      packageName: 'School Meal Package',
      quantity: 200,
      perPersonPrice: 95,
      additionalCharges: 500,
      discount: 500,
      total: 19000,
      terms: 'Demo quotation — delivery by 12:00 PM, sealed cutlery included.',
      validUntil: addDays(startOfDay(new Date()), 5),
      status: 'ACCEPTED',
      createdByUserId: ownerUser.id,
    },
  });

  await db.bulkOrder.create({
    data: {
      bulkOrderNumber: 'BLK-240101-103',
      shopId: shop.id,
      enquiryId: schoolEnquiry.id,
      quotationId: schoolQuotation.id,
      organizationName: 'Bright Future School',
      contactPerson: 'Meera Joshi',
      phone: '+91 98200 22003',
      email: 'meera@brightfuture.example',
      deliveryAddress: 'Bright Future School, Baner Road, Pune 411045',
      deliveryDate: addDays(startOfDay(new Date()), 1),
      deliveryTime: '12:00 PM',
      quantity: 200,
      packageName: 'School Meal Package',
      perPersonPrice: 95,
      additionalCharges: 500,
      discount: 500,
      total: 19000,
      terms: schoolQuotation.terms,
      dietaryRequirements: 'No chilli, moderate spice',
      notes: '200 school meals — production starts at 9 AM.',
      status: 'PREPARING',
      items: {
        create: [
          { label: 'School Meal Package', quantity: 200, unitPrice: 95, notes: 'No chilli, moderate spice' },
        ],
      },
      history: {
        create: [
          {
            status: 'CONFIRMED',
            actorRole: 'SHOP_OWNER',
            actorName: 'Nisha Patel',
            note: 'Converted from quotation QT-240101-103 — prices preserved',
          },
          {
            status: 'PREPARING',
            actorRole: 'KITCHEN_STAFF',
            actorName: 'Ramesh Pawar',
            note: 'Production started',
          },
        ],
      },
    },
  });

  const completedEnquiry = await db.bulkOrderEnquiry.create({
    data: {
      enquiryNumber: 'ENQ-240101-104',
      shopId: shop.id,
      customerId: customerRiya.id,
      packageId: bulkPackages[4].id,
      packageName: 'Family Gathering Package',
      organizationName: 'Greenfield Society',
      contactPerson: 'Arun Kamble',
      phone: '+91 98200 22004',
      email: 'arun@greenfield.example',
      organizationType: 'Family function',
      deliveryAddress: 'Greenfield Clubhouse, Wakad, Pune 411057',
      requiredDate: addDays(startOfDay(new Date()), -2),
      preferredTime: '7:30 PM',
      estimatedQuantity: 60,
      dietaryRequirements: 'Mixed veg, one sweet',
      notes: 'Society anniversary dinner.',
      status: 'ACCEPTED',
      statusHistory: {
        create: [
          { status: 'ENQUIRY_RECEIVED', actorRole: 'CUSTOMER', actorName: 'Arun Kamble' },
          { status: 'QUOTATION_SENT', actorRole: 'SHOP_OWNER', actorName: 'Nisha Patel' },
          { status: 'ACCEPTED', actorRole: 'CUSTOMER', actorName: 'Arun Kamble' },
        ],
      },
    },
  });

  const completedQuotation = await db.bulkOrderQuotation.create({
    data: {
      enquiryId: completedEnquiry.id,
      quotationNumber: 'QT-240101-104',
      packageName: 'Family Gathering Package',
      quantity: 60,
      perPersonPrice: 175,
      additionalCharges: 800,
      discount: 500,
      total: 10800,
      terms: 'Demo quotation — includes service staff.',
      validUntil: addDays(startOfDay(new Date()), 5),
      status: 'ACCEPTED',
      createdByUserId: ownerUser.id,
    },
  });

  await db.bulkOrder.create({
    data: {
      bulkOrderNumber: 'BLK-240101-104',
      shopId: shop.id,
      enquiryId: completedEnquiry.id,
      quotationId: completedQuotation.id,
      organizationName: 'Greenfield Society',
      contactPerson: 'Arun Kamble',
      phone: '+91 98200 22004',
      email: 'arun@greenfield.example',
      deliveryAddress: 'Greenfield Clubhouse, Wakad, Pune 411057',
      deliveryDate: addDays(startOfDay(new Date()), -2),
      deliveryTime: '7:30 PM',
      quantity: 60,
      packageName: 'Family Gathering Package',
      perPersonPrice: 175,
      additionalCharges: 800,
      discount: 500,
      total: 10800,
      terms: completedQuotation.terms,
      dietaryRequirements: 'Mixed veg, one sweet',
      status: 'COMPLETED',
      dispatchedAt: atTime(-2, 19, 0),
      completedAt: atTime(-2, 20, 15),
      items: { create: [{ label: 'Family Gathering Package', quantity: 60, unitPrice: 175 }] },
      history: {
        create: [
          { status: 'CONFIRMED', actorRole: 'SHOP_OWNER', actorName: 'Nisha Patel' },
          { status: 'PREPARING', actorRole: 'KITCHEN_STAFF', actorName: 'Ramesh Pawar' },
          { status: 'READY', actorRole: 'KITCHEN_STAFF', actorName: 'Ramesh Pawar' },
          { status: 'DISPATCHED', actorRole: 'SHOP_OWNER', actorName: 'Nisha Patel' },
          { status: 'COMPLETED', actorRole: 'SHOP_OWNER', actorName: 'Nisha Patel' },
        ],
      },
    },
  });

  /* ------------------------------------------------- ready-for-pickup assignment */

  await db.deliveryAssignment.create({
    data: {
      shopId: shop.id,
      orderId: readyOrder.id,
      riderId: riderSohail.id,
      status: 'ASSIGNED',
      otpCode: '4321',
    },
  });

  const counts = {
    users: 5,
    shops: 1,
    categories: categoryDefs.length,
    products: productDefs.length,
    mealBoxes: mealBoxDefs.length,
    tiffinPlans: planDefs.length,
    bulkPackages: bulkDefs.length,
    orders: await db.order.count(),
    subscriptions: await db.subscription.count(),
    bulkEnquiries: await db.bulkOrderEnquiry.count(),
    bulkOrders: await db.bulkOrder.count(),
    customers: await db.customer.count(),
    riders: 2,
  };

  return {
    shopId: shop.id,
    customerId: customerRiya.id,
    userIds: {
      admin: adminUser.id,
      owner: ownerUser.id,
      kitchen: kitchenUser.id,
      rider: riderUser.id,
      customer: customerUser.id,
    },
    newOrderNumber: newOrder.orderNumber,
    counts,
  };
}
