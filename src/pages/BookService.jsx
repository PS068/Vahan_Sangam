import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Calendar, Clock, Car, Settings, Check, MapPin, ShieldCheck, Tag, Sparkles, Phone, Flame, AlertCircle } from 'lucide-react';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { services, timeSlots, vehicleTypes, initialOffers } from '../data/dummyData';
import BookingStepper from '../components/BookingStepper';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';

const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450' width='100%25' height='100%25'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23141414'/%3E%3Cstop offset='100%25' stop-color='%23080808'/%3E%3C/linearGradient%3E%3ClinearGradient id='gold' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23d4af37'/%3E%3Cstop offset='100%25' stop-color='%23b7791f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23bg)'/%3E%3Ccircle cx='400' cy='200' r='60' fill='%23222' stroke='url(%23gold)' stroke-width='2' opacity='0.6'/%3E%3Cpath d='M380 180 L420 220 M420 180 L380 220' stroke='url(%23gold)' stroke-width='4' stroke-linecap='round'/%3E%3Ctext x='400' y='300' font-family='sans-serif' font-size='22' font-weight='800' fill='%23d4af37' text-anchor='middle' letter-spacing='2'%3EAUTOSERVE%3C/text%3E%3Ctext x='400' y='330' font-family='sans-serif' font-size='13' fill='%23888' text-anchor='middle'%3EPREMIUM AUTOMOTIVE SERVICE%3C/text%3E%3C/svg%3E";

// Strict Indian 10-digit mobile number validator
const validateIndianPhoneNumber = (phone) => {
  if (!phone) return false;
  const cleaned = phone.toString().replace(/\D/g, '');
  const rawNumber = cleaned.length === 12 && cleaned.startsWith('91')
    ? cleaned.slice(2)
    : cleaned.length === 11 && cleaned.startsWith('0')
    ? cleaned.slice(1)
    : cleaned;
  return /^[6-9]\d{9}$/.test(rawNumber);
};

const getClean10Digit = (phone) => {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/\D/g, '');
  return cleaned.length === 12 && cleaned.startsWith('91')
    ? cleaned.slice(2)
    : cleaned.length === 11 && cleaned.startsWith('0')
    ? cleaned.slice(1)
    : cleaned;
};

// Automatic Indian Vehicle Number Formatter (e.g. MH-10-XX-1221)
export const formatIndianVehiclePlate = (val) => {
  if (!val) return '';
  const clean = val.toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  
  // Standard format: State(2) - RTO(2) - Series(1-3) - Number(1-4)
  // Match groups sequentially
  const m = clean.match(/^([A-Z]{0,2})([0-9]{0,2})([A-Z]{0,3})([0-9]{0,4})$/);
  if (m) {
    const parts = [m[1], m[2], m[3], m[4]].filter(Boolean);
    return parts.join('-');
  }
  return clean;
};

export default function BookService() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { currentUser, userProfile, updateUserProfileData, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const urlGarageId = searchParams.get('garageId') || location.state?.garageId;
  const [selectedGarage, setSelectedGarage] = useState(location.state?.garage || null);
  const [garageLoading, setGarageLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    vehicleType: 'Car',
    brand: '',
    model: '',
    plateNumber: '',
    fuelType: 'Petrol',
    serviceId: services[0]?.id || 1,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Default tomorrow
    time: '10:00 AM - 12:00 PM',
    expectedDuration: 'Same Day (2 - 4 Hours)',
    isUrgent: false,
    note: '',
    location: {
      city: 'Mumbai',
      address: '',
      pincode: '',
      pickupType: 'Workshop Bay Visit'
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [phoneInput, setPhoneInput] = useState(() => {
    return getClean10Digit(userProfile?.phone || currentUser?.phone || '');
  });
  const [phoneError, setPhoneError] = useState('');

  // Fetch garage details if garageId provided
  useEffect(() => {
    const fetchGarageDetails = async () => {
      if (!urlGarageId) return;
      if (selectedGarage && selectedGarage.id === urlGarageId) return;
      
      setGarageLoading(true);
      try {
        const snap = await getDoc(doc(db, 'garages', urlGarageId));
        if (snap.exists()) {
          setSelectedGarage({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.warn('Error fetching garage details for booking:', err);
      } finally {
        setGarageLoading(false);
      }
    };
    fetchGarageDetails();
  }, [urlGarageId]);

  // Sync phone when userProfile changes
  useEffect(() => {
    if (userProfile?.phone || currentUser?.phone) {
      const p = getClean10Digit(userProfile?.phone || currentUser?.phone);
      if (p && !phoneInput) setPhoneInput(p);
    }
  }, [userProfile, currentUser]);

  const defaultUrgentCharge = 500;

  const nextStep = () => {
    // Model/Series is now optional: only Brand and Plate Number are required
    if (step === 1 && (!bookingData.vehicleType || !bookingData.brand?.trim() || !bookingData.plateNumber?.trim())) {
      addToast('Please provide vehicle Brand and License Plate Number.', 'error');
      return;
    }
    if (step === 2 && !bookingData.serviceId) {
      addToast('Please choose a service package.', 'error');
      return;
    }
    if (step === 3 && (!bookingData.date || !bookingData.time)) {
      addToast('Please select your preferred service date and time.', 'error');
      return;
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleConfirm = async () => {
    // 1. Phone number validation check
    const cleanPhone = getClean10Digit(phoneInput);
    if (!cleanPhone || !validateIndianPhoneNumber(cleanPhone)) {
      setPhoneError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      addToast('Valid 10-digit mobile number is required to confirm booking.', 'error');
      return;
    }

    const formattedPhone = `+91 ${cleanPhone}`;
    setPhoneError('');

    // Save phone to user profile if logged in
    if (isAuthenticated && updateUserProfileData) {
      try {
        await updateUserProfileData({
          phone: formattedPhone,
          phoneVerified: true,
          phoneValidatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Profile phone update warning:', e);
      }
    }

    const selectedService = services.find(s => s.id === bookingData.serviceId) || services[0];
    
    const customerId = isAuthenticated && currentUser?.uid ? currentUser.uid : null;
    const customerName = isAuthenticated && (userProfile?.name || currentUser?.displayName) 
      ? (userProfile?.name || currentUser?.displayName) 
      : 'Customer';
    const customerPhone = formattedPhone;

    const garageId = selectedGarage?.id || urlGarageId || 'workshop';
    const garageName = selectedGarage?.garageName || 'VahanSangam Workshop';
    const garagePhone = selectedGarage?.phone || '9876543210';
    const garageWhatsapp = selectedGarage?.whatsapp || garagePhone;
    const garageAddress = selectedGarage?.address || selectedGarage?.city || '';

    const baseCost = Number(selectedService?.defaultPrice || 1500);
    const urgentFee = bookingData.isUrgent ? defaultUrgentCharge : 0;
    const totalEst = baseCost + urgentFee;

    const vehicleTitle = bookingData.model?.trim() 
      ? `${bookingData.brand.trim()} ${bookingData.model.trim()}`
      : bookingData.brand.trim();

    const payload = {
      garageId,
      garageName,
      garagePhone,
      garageWhatsapp,
      garageAddress,
      customerId,
      userId: customerId,
      customerName,
      userName: customerName,
      customerPhone,
      customerEmail: currentUser?.email || '',
      vehicle: vehicleTitle,
      vehicleModel: vehicleTitle,
      brand: bookingData.brand.trim(),
      model: bookingData.model?.trim() || 'Standard Edition',
      plateNumber: bookingData.plateNumber.toUpperCase().trim(),
      fuelType: bookingData.fuelType,
      vehicleType: bookingData.vehicleType,
      service: selectedService?.name || 'General Full Service',
      serviceId: bookingData.serviceId,
      serviceType: selectedService?.name || 'General Full Service',
      requestedDate: bookingData.date,
      requestedTime: bookingData.time,
      date: bookingData.date,
      timeSlot: bookingData.time,
      preferredDate: bookingData.date,
      preferredTime: bookingData.time,
      expectedDuration: bookingData.expectedDuration || 'Same Day (2 - 4 Hours)',
      expectedTurnaround: bookingData.expectedDuration || 'Same Day (2 - 4 Hours)',
      note: bookingData.note || '',
      isUrgent: Boolean(bookingData.isUrgent),
      urgentSurcharge: urgentFee,
      location: {
        city: bookingData.location?.city || selectedGarage?.city || 'City Bay',
        address: bookingData.location?.address || selectedGarage?.address || '',
        pincode: bookingData.location?.pincode || selectedGarage?.pincode || '',
        pickupType: 'Workshop Bay Visit'
      },
      status: 'pending',
      currentStage: 'Pending Approval',
      requestStatus: 'PENDING_APPROVAL',
      estimatedCost: totalEst,
      billing: {
        items: [
          { name: selectedService?.name || 'General Full Service', price: baseCost, category: 'Labour & Service', qty: 1 }
        ],
        discount: 0,
        urgentSurcharge: urgentFee,
        total: totalEst
      },
      managerProposal: null,
      proposalExpiresAt: null,
      confirmationExpiresAt: null,
      isDelivered: false,
      tasks: [
        { id: 1, title: 'In-Bay Intake Check & Visual Diagnostic', status: 'Pending' },
        { id: 2, title: 'Service Execution & Component Testing', status: 'Pending' },
        { id: 3, title: 'QC Inspection & Road Test', status: 'Pending' },
        { id: 4, title: 'Final Wash & Client Delivery Dispatch', status: 'Pending' }
      ],
      mechanicNotes: 'Request sent to Garage Manager. Slot is awaiting manager confirmation & bay allocation.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      setIsSubmitting(true);
      const docRef = await addDoc(collection(db, 'bookings'), payload);

      try {
        await set(ref(rtdb, `bookings/${docRef.id}`), {
          bookingId: docRef.id,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (rtdbError) {
        console.warn('Realtime Database mirror failed:', rtdbError);
      }

      const modalPayload = {
        bookingId: docRef.id,
        ...bookingData,
        customerPhone,
        customerName,
        garageName,
        garageAddress,
        service: selectedService,
        estimatedCost: totalEst
      };

      addToast(`Booking request sent to ${garageName}! 🎉`, 'success');
      setSuccessModalData(modalPayload);
    } catch (error) {
      console.error('Booking save failed:', error);
      addToast(`Unable to save booking: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = services.find(s => s.id === bookingData.serviceId);

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-20 animate-fade-in text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-3">
            <ShieldCheck size={14} /> {selectedGarage?.garageName ? `${selectedGarage.garageName} • Verified Service Center` : 'Official Verified Service Center'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Book Vehicle Service</h1>
          <p className="text-gray-400 text-sm">
            {selectedGarage?.address ? `${selectedGarage.garageName} — ${selectedGarage.address}` : 'Schedule appointment with certified technicians.'}
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-10">
          <BookingStepper currentStep={step} />
        </div>

        {/* Form Container */}
        <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl">
          
          {/* STEP 1: VEHICLE DETAILS */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Car className="text-accent" size={22} /> Step 1: Vehicle Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Vehicle Category</label>
                  <div className="flex gap-3">
                    {vehicleTypes.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setBookingData({...bookingData, vehicleType: type})}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                          bookingData.vehicleType === type 
                            ? 'border-accent bg-accent/10 text-accent shadow-[0_0_12px_rgba(212,175,55,0.25)]' 
                            : 'border-white/10 text-gray-400 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Fuel / Powertrain Type</label>
                  <select 
                    value={bookingData.fuelType}
                    onChange={(e) => setBookingData({...bookingData, fuelType: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-all"
                  >
                    <option className="bg-[#111] text-white">Petrol</option>
                    <option className="bg-[#111] text-white">Diesel</option>
                    <option className="bg-[#111] text-white">Electric (EV)</option>
                    <option className="bg-[#111] text-white">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Brand / Manufacturer <span className="text-amber-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. BMW, Honda, Tata, Hyundai, Royal Enfield" 
                    value={bookingData.brand}
                    onChange={(e) => setBookingData({...bookingData, brand: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-all placeholder-gray-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Model / Series
                    </label>
                    <span className="text-[10px] text-gray-500 font-medium bg-white/5 px-2 py-0.5 rounded-md">Optional</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="e.g. 3 Series, Nexon, Creta, Classic 350 (Optional)" 
                    value={bookingData.model}
                    onChange={(e) => setBookingData({...bookingData, model: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-all placeholder-gray-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Registration License Plate <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[11px] text-accent font-medium">Auto-formatted (e.g. MH-10-XX-1221)</span>
                  </div>
                  
                  <input 
                    type="text" 
                    maxLength={13}
                    placeholder="e.g. MH-10-XX-1221" 
                    value={bookingData.plateNumber}
                    onChange={(e) => {
                      const formatted = formatIndianVehiclePlate(e.target.value);
                      setBookingData({...bookingData, plateNumber: formatted});
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-accent transition-all font-mono uppercase tracking-widest placeholder-gray-500"
                  />

                  {/* High Security Registration Plate (HSRP) Styled Live Preview */}
                  {bookingData.plateNumber && (
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-[11px] text-gray-500">Plate Preview:</span>
                      <div className="inline-flex items-center rounded-lg bg-[#f0f3f6] text-[#111827] border-2 border-black/80 px-2.5 py-1 shadow-md font-mono font-black tracking-widest text-sm">
                        <div className="flex flex-col items-center justify-center border-r border-black/20 pr-1.5 mr-2">
                          <span className="text-[7px] text-blue-700 font-bold leading-none">IND</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 my-0.5" />
                        </div>
                        <span>{bookingData.plateNumber}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT SERVICE */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="text-accent" size={22} /> Step 2: Select Service Scope
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map(service => (
                  <div 
                    key={service.id}
                    onClick={() => setBookingData({...bookingData, serviceId: service.id})}
                    className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                      bookingData.serviceId === service.id 
                        ? 'border-accent shadow-[0_0_20px_rgba(212,175,55,0.25)] bg-accent/5' 
                        : 'border-white/10 hover:border-white/25 bg-white/5'
                    }`}
                  >
                    <div className="h-28 w-full overflow-hidden relative bg-[#111]">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10" />
                      {bookingData.serviceId === service.id && (
                        <div className="absolute top-3 right-3 z-20 bg-accent text-[#050505] rounded-full p-1 shadow-md">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                      <img 
                        src={service.image || fallbackImage} 
                        alt={service.name} 
                        className="w-full h-28 object-cover relative z-0"
                        onError={(e) => { e.currentTarget.src = fallbackImage; }}
                      />
                    </div>
                    <div className="p-4 relative z-20">
                      <h3 className="text-base font-bold text-white mb-1">{service.name}</h3>
                      <p className="text-xs text-gray-400 mb-2.5 line-clamp-2 leading-relaxed">{service.description}</p>
                      
                      {service.billNotice && (
                        <div className="mb-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-medium">
                          ⚡ {service.billNotice}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                        <span className="text-gray-400 flex items-center gap-1 text-[11px]">
                          <Clock size={12} /> {service.estimatedTime}
                        </span>
                        <span className="text-accent font-mono font-bold text-xs bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
                          {service.defaultPrice ? `Starts at ₹${service.defaultPrice.toLocaleString('en-IN')}` : 'Quote on Inspection'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PICK DATE, TIME & LOCATION */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="text-accent" size={22} /> Step 3: Schedule, Location & Priority
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Service Appointment Date</label>
                  <input 
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingData.date}
                    onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Service Duration Preference</label>
                  <select 
                    value={bookingData.expectedDuration}
                    onChange={(e) => setBookingData({...bookingData, expectedDuration: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-all"
                  >
                    <option className="bg-[#111] text-white">Same Day (2 - 4 Hours)</option>
                    <option className="bg-[#111] text-white">Express Quick-Service (1 - 2 Hours)</option>
                    <option className="bg-[#111] text-white">Comprehensive (Full Day / Overnight)</option>
                  </select>
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Available Service Time Slots</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setBookingData({...bookingData, time})}
                      className={`py-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                        bookingData.time === time 
                          ? 'border-accent bg-accent/15 text-accent shadow-[0_0_12px_rgba(212,175,55,0.25)]' 
                          : 'border-white/10 text-gray-400 hover:border-white/30 bg-white/5'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Input Block */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <MapPin size={16} className="text-accent" /> Customer Address / Bay Drop-in Location
                  </h3>
                  {selectedGarage?.address && (
                    <span className="text-[11px] text-amber-300 font-medium">
                      Workshop: {selectedGarage.garageName}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">City / Region</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mumbai, Pune, Thane" 
                      value={bookingData.location.city}
                      onChange={(e) => setBookingData({
                        ...bookingData,
                        location: { ...bookingData.location, city: e.target.value }
                      })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-accent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Address / Landmark / Area</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Apt 402, Sea Crest Towers, Bandra West" 
                      value={bookingData.location.address}
                      onChange={(e) => setBookingData({
                        ...bookingData,
                        location: { ...bookingData.location, address: e.target.value }
                      })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Urgent Express Service Block */}
              <div 
                onClick={() => setBookingData({...bookingData, isUrgent: !bookingData.isUrgent})}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex items-start gap-4 ${
                  bookingData.isUrgent 
                    ? 'bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                    : 'bg-white/5 border-white/10 hover:border-amber-400/40'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={bookingData.isUrgent}
                  onChange={() => {}} // Handled by container click
                  className="mt-1 w-5 h-5 rounded accent-amber-500 cursor-pointer shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-extrabold text-white">
                      ⚡ Need Urgent Express Service? (+₹{defaultUrgentCharge} Bay Priority Charge)
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Express Bay
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Flags your vehicle for immediate priority diagnostics, front-of-the-queue bay allocation, and expedited turnaround with standard ₹{defaultUrgentCharge} surcharge.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-accent" size={22} /> Step 4: Review Appointment Request
              </h2>
              
              <div className="glass-card border border-white/10 rounded-2xl overflow-hidden p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-white font-bold text-base">{selectedGarage?.garageName || 'VahanSangam Certified Workshop'}</h3>
                    <p className="text-xs text-amber-300 flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin size={12} className="text-accent" /> {selectedGarage?.address || selectedGarage?.city || bookingData.location.city || 'Automotive Tech Bay'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-accent/20 border border-accent/40 rounded-xl flex items-center justify-center text-accent font-bold text-sm">
                    {selectedGarage?.garageName ? selectedGarage.garageName.slice(0, 2).toUpperCase() : 'VS'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-gray-500 uppercase tracking-wider mb-1">Vehicle</p>
                    <p className="text-white font-semibold text-sm">
                      {bookingData.brand} {bookingData.model?.trim() ? `• ${bookingData.model}` : ''}
                    </p>
                    <p className="text-accent font-mono font-bold mt-0.5">{bookingData.plateNumber} • {bookingData.fuelType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase tracking-wider mb-1">Service & Priority</p>
                    <p className="text-white font-semibold text-sm">{selectedService?.name}</p>
                    <p className="text-gray-400 mt-0.5">
                      {bookingData.isUrgent ? (
                        <span className="text-amber-400 font-bold">⚡ Urgent Express (+₹{defaultUrgentCharge} Surcharge)</span>
                      ) : (
                        'Standard Schedule'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase tracking-wider mb-1">Scheduled Date & Time</p>
                    <p className="text-white font-semibold text-sm">{bookingData.date || '—'}</p>
                    <p className="text-gray-400 mt-0.5">{bookingData.time || '—'}</p>
                  </div>
                </div>

                {/* Customer Contact & Phone Confirmation Details */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-gray-400 block text-[11px] uppercase font-bold tracking-wider">Contact Name:</span>
                      <span className="text-white font-bold text-sm">{userProfile?.name || currentUser?.displayName || currentUser?.name || 'Customer'}</span>
                    </div>
                    {validateIndianPhoneNumber(phoneInput) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full w-fit">
                        <ShieldCheck size={13} /> Mobile Verified (+91)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full w-fit">
                        <Phone size={12} /> 10-Digit Mobile Required
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Contact Mobile Number <span className="text-amber-400">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono font-bold text-gray-300">
                        🇮🇳 +91
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Enter 10-digit number (e.g. 9876543210)"
                        value={phoneInput}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setPhoneInput(cleaned);
                          if (phoneError) setPhoneError('');
                        }}
                        className={`flex-1 bg-black/50 border rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none transition-all ${
                          validateIndianPhoneNumber(phoneInput)
                            ? 'border-emerald-500/60 focus:border-emerald-400'
                            : phoneInput.length > 0
                            ? 'border-amber-500/60 focus:border-amber-400'
                            : 'border-white/10 focus:border-accent'
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] text-rose-400 mt-1 font-medium">{phoneError}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      Important: Used for instant WhatsApp updates, job estimates, and mechanic status notifications.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-xs space-y-1 text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Sparkles size={14} className="text-accent" /> Manager Transparent Pricing & Seasonal Offers:
                  </div>
                  <p className="leading-relaxed">
                    Once your vehicle arrives at the bay, our certified garage manager conducts physical diagnostics, applies applicable seasonal promo discounts/offers, and sends an itemized digital breakdown directly for your live review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            {step > 1 ? (
              <button 
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors py-2 px-4 rounded-xl hover:bg-white/5"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button 
                type="button"
                onClick={nextStep}
                disabled={
                  (step === 1 && (!bookingData.brand?.trim() || !bookingData.plateNumber?.trim())) ||
                  (step === 2 && !bookingData.serviceId) ||
                  (step === 3 && (!bookingData.date || !bookingData.time))
                }
                className="flex items-center gap-2 bg-white text-[#050505] text-xs font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex items-center gap-2 text-[#050505] text-xs font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
              >
                {isSubmitting ? 'Registering Booking...' : 'Confirm & Request Service'} <CheckCircle2 size={16} />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ─── REQUEST SENT SUCCESS POP UP WINDOW MODAL ─── */}
      {successModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-accent/40 w-full max-w-lg shadow-[0_0_50px_rgba(212,175,55,0.2)] p-6 sm:p-8 relative text-white animate-scale-in overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <button
              onClick={() => navigate('/my-account')}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
              title="Close and go to My Account"
            >
              ✕
            </button>

            {/* Header with Icon */}
            <div className="text-center mb-6">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-3 border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={36} className="text-emerald-400" />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-black flex items-center justify-center text-[10px] font-black shadow-md">
                  ✓
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Request Sent to Workshop
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                Appointment Request Sent!
              </h2>
              <p className="text-xs text-gray-300 max-w-sm mx-auto mt-1">
                Your request has been dispatched to <strong className="text-white">{successModalData.garageName}</strong>. Awaiting garage manager review.
              </p>
            </div>

            {/* Ticket Card Details */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs mb-6">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Reference ID</span>
                <span className="font-mono font-black text-accent text-xs">#{successModalData.bookingId?.slice(-8) || 'VS-NEW'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <p className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1 mb-0.5">
                    <Car size={11} className="text-accent" /> Vehicle
                  </p>
                  <p className="text-white font-bold truncate">{successModalData.brand} {successModalData.model || ''}</p>
                  <p className="text-accent font-mono font-bold text-[11px]">{successModalData.plateNumber}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <p className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1 mb-0.5">
                    <Sparkles size={11} className="text-accent" /> Service
                  </p>
                  <p className="text-white font-bold truncate">{successModalData.service?.name || 'Full Service'}</p>
                  <p className="text-emerald-400 font-mono font-bold text-[11px]">Starts at ₹{successModalData.estimatedCost || 1500}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <p className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1 mb-0.5">
                    <Calendar size={11} className="text-accent" /> Scheduled Date
                  </p>
                  <p className="text-white font-bold">{successModalData.date}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <p className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1 mb-0.5">
                    <Clock size={11} className="text-accent" /> Preferred Time
                  </p>
                  <p className="text-white font-bold">{successModalData.time}</p>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1"><MapPin size={12} className="text-accent" /> {successModalData.garageName}</span>
                <span className="text-emerald-400 font-semibold">📱 {successModalData.customerPhone}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => navigate('/my-account')}
                className="flex-1 py-3 px-4 rounded-xl text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-accent/20 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
              >
                Track in My Account <ChevronRight size={14} />
              </button>

              <button
                onClick={() => navigate('/booking-success', { state: successModalData })}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/15 transition-all text-center cursor-pointer"
              >
                View Full Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
