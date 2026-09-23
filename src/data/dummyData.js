// AutoServe Data & Schema Definitions

// 1. Collections: users
export const users = [
  {
    uid: 'admin-1',
    name: 'AutoServe Admin',
    email: 'admin@autoserve.com',
    role: 'admin',
    phone: '+91 9876500000',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    uid: 'mech-1',
    name: 'Mike Mechanic',
    email: 'mike@autoserve.com',
    role: 'mechanic',
    phone: '+91 9876500001',
    createdAt: '2026-01-05T09:30:00Z',
  },
  {
    uid: 'cust-1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    role: 'customer',
    phone: '+91 9876543210',
    createdAt: '2026-05-10T14:20:00Z',
  }
];

// 2. Collections: bookings with Agile Tasks & Timing
export const bookings = [
  {
    bookingId: 'ASV-2026-1042',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '+91 9876543210',
    vehicleModel: 'BMW 3 Series',
    plateNumber: 'MH 02 AB 1234',
    vehicleType: 'Car',
    serviceType: 'Full Service',
    preferredDate: '2026-05-20',
    preferredTime: '10:00 AM',
    status: 'Servicing',
    estimatedDays: 0,
    estimatedHours: 4,
    deadline: '2026-05-20T17:00:00',
    finalBill: 4200,
    subtotal: 4500,
    customDiscount: 300,
    appliedOffer: { code: 'FESTIVE25', discountValue: 25, discountType: 'percentage' },
    lineItems: [
      { id: 1, name: 'Full Engine Diagnostic & Labor', amount: 2500 },
      { id: 2, name: 'Synthetic Oil & Micro Filter OEM', amount: 2000 }
    ],
    tasks: [
      { id: 't1', title: '40-Point Electronic Diagnostic Check', status: 'Done', deadline: '11:00 AM', assignee: 'Mike' },
      { id: 't2', title: 'Drain Engine Oil & Replace Filter', status: 'Done', deadline: '01:00 PM', assignee: 'Mike' },
      { id: 't3', title: 'Front & Rear Brake Pad Caliper Servicing', status: 'In Progress', deadline: '03:30 PM', assignee: 'Alex' },
      { id: 't4', title: 'Foam Body Wash & Interior Vacuuming', status: 'To Do', deadline: '04:30 PM', assignee: 'Detailing Bay' }
    ],
    mechanicNotes: 'Brake pads replaced successfully. Oil filter changed.',
    isDelivered: false,
    createdAt: '2026-05-18T09:00:00Z',
    updatedAt: '2026-05-19T11:45:00Z'
  },
  {
    bookingId: 'ASV-2026-1043',
    customerId: 'cust-1',
    customerName: 'Rajesh Sharma',
    customerPhone: '+91 9876543210',
    vehicleModel: 'Porsche 911 Carrera',
    plateNumber: 'MH 01 XY 9876',
    vehicleType: 'Car',
    serviceType: 'Wheel Alignment',
    preferredDate: '2026-05-21',
    preferredTime: '02:00 PM',
    status: 'Booked',
    estimatedDays: 0,
    estimatedHours: 2,
    deadline: '2026-05-21T16:00:00',
    finalBill: 0,
    lineItems: [],
    tasks: [
      { id: 't1', title: '3D Laser Alignment Calibration', status: 'To Do', deadline: '03:00 PM', assignee: 'Wheel Bay' },
      { id: 't2', title: 'Tire Pressure & Balancing Test', status: 'To Do', deadline: '03:45 PM', assignee: 'Wheel Bay' }
    ],
    mechanicNotes: '',
    appliedOffer: null,
    isDelivered: false,
    createdAt: '2026-05-19T08:30:00Z',
    updatedAt: '2026-05-19T08:30:00Z'
  },
  {
    bookingId: 'ASV-2026-1044',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '+91 9876543210',
    vehicleModel: 'Royal Enfield Classic 350',
    plateNumber: 'MH 04 DF 5678',
    vehicleType: 'Bike',
    serviceType: 'Oil Change',
    preferredDate: '2026-05-15',
    preferredTime: '11:00 AM',
    status: 'Delivered',
    estimatedDays: 0,
    estimatedHours: 1,
    deadline: '2026-05-15T12:00:00',
    finalBill: 1200,
    lineItems: [
      { id: 1, name: 'Engine Oil & Chain Lube', amount: 900 },
      { id: 2, name: 'Brake Tightening Labor', amount: 300 }
    ],
    tasks: [
      { id: 't1', title: 'Engine Oil Replacement', status: 'Done', deadline: '11:30 AM', assignee: 'Mike' },
      { id: 't2', title: 'Chain Cleaning & Lube', status: 'Done', deadline: '11:50 AM', assignee: 'Mike' }
    ],
    mechanicNotes: 'Chain lubricated, engine oil changed, brakes tightened. Vehicle handed over.',
    isDelivered: true,
    deliveredAt: '2026-05-15T12:15:00Z',
    appliedOffer: null,
    createdAt: '2026-05-10T15:00:00Z',
    updatedAt: '2026-05-15T12:15:00Z'
  }
];

// 3. Manager Promotional Offers & Dynamic Pricing Registry
export const initialOffers = [
  {
    id: 'off-1',
    code: 'MONSOON2026',
    title: 'Monsoon Splash & Brake Shield',
    discountType: 'percentage',
    discountValue: 20,
    isSeasonal: true,
    seasonName: 'Monsoon Care',
    validUntil: '2026-09-30',
    description: 'Special 20% seasonal monsoon discount on wiper blades, brake skim, underbody rust coating.',
    applicableService: 'All Services',
    active: true,
    createdAt: '2026-05-01'
  },
  {
    id: 'off-2',
    code: 'FESTIVE25',
    title: 'Diwali & Festive Sparkle',
    discountType: 'percentage',
    discountValue: 25,
    isSeasonal: true,
    seasonName: 'Festive Season',
    validUntil: '2026-11-30',
    description: 'Festive celebration 25% discount on full multi-point vehicle service and interior detailing.',
    applicableService: 'Full Service',
    active: true,
    createdAt: '2026-05-01'
  },
  {
    id: 'off-3',
    code: 'SUMMERAC',
    title: 'Summer AC Chill Surge',
    discountType: 'flat',
    discountValue: 500,
    isSeasonal: true,
    seasonName: 'Summer Season',
    validUntil: '2026-06-30',
    description: 'Flat ₹500 seasonal waiver on air conditioning compressor gas refill and cabin sanitizer.',
    applicableService: 'AC Service',
    active: true,
    createdAt: '2026-05-10'
  },
  {
    id: 'off-4',
    code: 'FREEOILCHECK',
    title: 'Complimentary Fluid Diagnostics',
    discountType: 'flat',
    discountValue: 300,
    isSeasonal: false,
    seasonName: 'General Promo',
    validUntil: '2026-12-31',
    description: 'Flat ₹300 waiver on synthetic oil and fluid diagnostic charges.',
    applicableService: 'Oil Change',
    active: true,
    createdAt: '2026-05-05'
  }
];

// 4. Collections: bookingChats
export const bookingChats = [
  {
    bookingId: 'ASV-2026-1042',
    senderId: 'cust-1',
    senderName: 'Sarah Jenkins',
    senderRole: 'customer',
    message: 'Hi, dropped off the vehicle. Please check the deadline ETA.',
    createdAt: '2026-05-20T10:15:00Z'
  },
  {
    bookingId: 'ASV-2026-1042',
    senderId: 'admin-1',
    senderName: 'Garage Admin',
    senderRole: 'admin',
    message: 'Deadline set for today at 5:00 PM. 2 out of 4 tasks already completed.',
    createdAt: '2026-05-20T10:20:00Z'
  }
];

// 5. Collections: bookingStatusLogs
export const bookingStatusLogs = [
  {
    bookingId: 'ASV-2026-1042',
    status: 'Received',
    updatedBy: 'admin-1',
    note: 'Customer dropped off vehicle at garage bay.',
    createdAt: '2026-05-20T10:05:00Z'
  },
  {
    bookingId: 'ASV-2026-1042',
    status: 'Inspecting',
    updatedBy: 'mech-1',
    note: 'Master technician conducting multi-point vehicle inspection.',
    createdAt: '2026-05-20T10:30:00Z'
  },
  {
    bookingId: 'ASV-2026-1042',
    status: 'Servicing',
    updatedBy: 'mech-1',
    note: 'Service in progress. Agile task sprint underway.',
    createdAt: '2026-05-20T11:00:00Z'
  }
];

// ─── HELPERS & SERVICES ─────────────────────────────────────────

export const vehicleTypes = ['Car', 'Bike', 'SUV'];
export const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
];

export const STATUS_FLOW = [
  'Pending Approval',
  'Booked',
  'Received',
  'Inspecting',
  'Servicing',
  'Washing',
  'Ready',
  'Delivered',
  'Reschedule Proposed',
  'Failed / Expired'
];


export const services = [
  {
    id: 's1',
    name: 'Full Service',
    description: 'Comprehensive 40-point check, oil change, filter replacement, fluid top-up, and full exterior wash.',
    badge: 'Popular',
    estimatedTime: '3 - 4 Hours',
    defaultPrice: 2999,
    category: 'Periodic Maintenance',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's2',
    name: 'Oil Change & Filter Renewal',
    description: 'Premium synthetic engine oil flush, replacement, and OEM certified oil filter replacement.',
    badge: 'Quick Service',
    estimatedTime: '45 Mins',
    defaultPrice: 1499,
    category: 'Fluids & Engine',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's3',
    name: 'Tyre Care & Wheel Balancing',
    description: 'Tyre rotation, puncture check/repair, 3D computerized balancing, and nitrogen pressure inflation.',
    badge: 'Wheel & Tyre',
    estimatedTime: '45 Mins',
    defaultPrice: 699,
    category: 'Wheels & Tyres',
    image: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's4',
    name: 'Minor Repairs & Electricals',
    description: 'OBD-II scanner diagnosis, bulb/fuse/relay repairs, battery terminal cleaning & testing, wiper fixes.',
    badge: 'Quick Fix',
    estimatedTime: '1 Hour',
    defaultPrice: 499,
    category: 'Electrical & Diagnostics',
    image: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's5',
    name: 'Spare Parts Changing & Overhaul',
    description: 'Professional mechanical installation & replacement of genuine OEM spare parts. Final bill itemized upon delivery with spare parts cost.',
    badge: 'Spare Parts (Bill at Delivery)',
    estimatedTime: '2 - 5 Hours',
    defaultPrice: 899,
    category: 'Mechanical Overhaul',
    billNotice: 'Labour & fitting charge shown. Genuine spare parts itemized & billed at final delivery.',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's6',
    name: 'AC Service & Gas Refill',
    description: 'Refrigerant gas top-up, condenser & coil cleaning, cabin filter renewal, and vent sanitization.',
    badge: 'Climate Care',
    estimatedTime: '1.5 Hours',
    defaultPrice: 1799,
    category: 'Climate & AC',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's7',
    name: 'Brake Repair & Line Flush',
    description: 'Brake pad replacement, disc rotor skimming, caliper lubrication, and DOT4 fluid line flush.',
    badge: 'Safety',
    estimatedTime: '2 Hours',
    defaultPrice: 1199,
    category: 'Braking & Safety',
    image: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's8',
    name: 'Denting & Painting',
    description: 'Precision computerized color matching, scratch restoration, and dent removal with original OEM finish.',
    badge: 'Bodywork',
    estimatedTime: '1 - 2 Days',
    defaultPrice: 2499,
    category: 'Body & Paint',
    image: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's9',
    name: 'Wheel Alignment & Geometry',
    description: '3D laser-guided wheel alignment, computerized tire balancing, and suspension geometry tuning.',
    badge: 'Precision',
    estimatedTime: '1 Hour',
    defaultPrice: 799,
    category: 'Wheels & Tyres',
    image: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80'
  }
];
