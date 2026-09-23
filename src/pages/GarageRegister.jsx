import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Clock, Wrench, Shield, CheckCircle2,
  ChevronRight, ChevronLeft, Camera, Car, Star, Save, Loader2, Upload, Trash2, AlertCircle
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';

const TOTAL_STEPS = 5;

const VEHICLE_TYPE_OPTIONS = ['2-Wheeler', '4-Wheeler', 'EV', 'Commercial Vehicle', 'Heavy Vehicles'];
const SERVICE_CATEGORY_OPTIONS = [
  'Full Service', 'Oil Change', 'Engine Repair', 'AC Service', 'Wheel Alignment',
  'Denting & Painting', 'Battery Replacement', 'Brake Service', 'Transmission Repair',
  'EV Servicing', 'Battery Diagnostics', 'Tyre Change', 'Fork Service',
  'Detailing & PPF', 'Ceramic Coating', 'Software Diagnostics', 'Roadside Assistance'
];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

const DEFAULT_HOURS = { mon: '9AM–7PM', tue: '9AM–7PM', wed: '9AM–7PM', thu: '9AM–7PM', fri: '9AM–7PM', sat: '9AM–5PM', sun: 'Closed' };

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${s < step ? 'bg-accent text-[#050505]' : s === step ? 'bg-accent/20 border-2 border-accent text-accent' : 'bg-white/5 border border-white/15 text-gray-500'}`}>
            {s < step ? <CheckCircle2 size={14} /> : s}
          </div>
          {s < TOTAL_STEPS && (
            <div className={`w-8 sm:w-12 h-0.5 mx-1 transition-all ${s < step ? 'bg-accent' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function GarageRegister() {
  const { currentUser, userProfile, finishOnboarding } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Basic Info
  const [garageName, setGarageName] = useState('');
  const [ownerName, setOwnerName] = useState(userProfile?.name || currentUser?.displayName || '');
  const [establishedYear, setEstablishedYear] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 — Location
  const [address, setAddress] = useState(userProfile?.address || '');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [mapLink, setMapLink] = useState('');

  // Step 3 — Contact & Hours
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [whatsapp, setWhatsapp] = useState(userProfile?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [workingHours, setWorkingHours] = useState({ ...DEFAULT_HOURS });

  // Step 4 — Services
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [brandsServiced, setBrandsServiced] = useState('');

  // Step 5 — Certifications & MANDATORY Garage Photo
  const [certifications, setCertifications] = useState('');
  const [photoData, setPhotoData] = useState(''); // Direct file base64 or URL
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoSourceMode, setPhotoSourceMode] = useState('upload'); // 'upload' | 'url'

  const toggleArray = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  // Handle direct file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size should be less than 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(reader.result);
      addToast('Garage photo uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const activePhoto = photoData || photoUrlInput;

  const validateStep = () => {
    if (step === 1) {
      if (!garageName.trim()) { addToast('Garage name is required.', 'error'); return false; }
      if (!ownerName.trim()) { addToast('Owner name is required.', 'error'); return false; }
    }
    if (step === 2) {
      if (!address.trim()) { addToast('Street / Building address is required.', 'error'); return false; }
      if (!city.trim()) { addToast('City is required.', 'error'); return false; }
      if (!pincode.trim() || pincode.length < 6) { addToast('Valid 6-digit pincode required.', 'error'); return false; }
    }
    if (step === 3) {
      if (!phone.trim() || phone.trim().length < 10) { addToast('Valid 10-digit phone number is required.', 'error'); return false; }
    }
    if (step === 4) {
      if (vehicleTypes.length === 0) { addToast('Select at least one vehicle type.', 'error'); return false; }
      if (serviceCategories.length === 0) { addToast('Select at least one service.', 'error'); return false; }
    }
    if (step === 5) {
      if (!activePhoto) {
        addToast('Garage photo is required! Please upload or provide a photo.', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);

    try {
      const garageData = {
        ownerId: currentUser.uid,
        ownerName: ownerName.trim(),
        ownerEmail: currentUser.email,
        ownerPhotoURL: currentUser.photoURL || null,

        garageName: garageName.trim(),
        description: description.trim() || `${garageName} offers top-tier vehicle service and genuine spare parts with verified mechanics.`,
        establishedYear: establishedYear ? parseInt(establishedYear) : new Date().getFullYear(),

        area: area.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim() || 'State',
        pincode: pincode.trim(),
        mapLink: mapLink.trim(),

        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        email: email.trim(),
        workingHours,

        vehicleTypes,
        serviceCategories,
        brandsServiced: brandsServiced ? brandsServiced.split(',').map(s => s.trim()).filter(Boolean) : ['All Major Brands'],

        certifications: certifications ? certifications.split(',').map(s => s.trim()).filter(Boolean) : ['Verified Workshop'],
        photo: activePhoto,
        photos: [activePhoto],

        rating: 5.0,
        totalRatings: 1,
        isVerified: true,
        isActive: true,
        openNow: true,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to Firestore (keyed by owner's UID)
      await setDoc(doc(db, 'garages', currentUser.uid), garageData);

      finishOnboarding();
      addToast(`${garageName} is now registered and live on VahanSangam! 🎉`, 'success');
      navigate('/garage-dashboard', { replace: true });
    } catch (err) {
      console.error('Garage registration error:', err);
      addToast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
            <Building2 size={13} /> Garage Partner Registration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Register Your Service Centre
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Join thousands of workshops receiving direct online bookings
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator step={step} />

        {/* Step Content */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">

          {/* STEP 1 — Basic Info */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-extrabold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                <Building2 size={18} className="text-accent" /> Basic Details
              </h2>

              <Field label="Garage / Workshop Name *">
                <input type="text" value={garageName} onChange={e => setGarageName(e.target.value)}
                  placeholder="e.g. Apex Precision Motors"
                  className="input-style" />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Owner / Manager Name *">
                  <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="input-style" />
                </Field>
                <Field label="Year Established">
                  <input type="number" value={establishedYear} onChange={e => setEstablishedYear(e.target.value)}
                    placeholder="e.g. 2018" min="1950" max={new Date().getFullYear()}
                    className="input-style" />
                </Field>
              </div>

              <Field label="Short Description / About Workshop">
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your equipment, specialties, team expertise, customer guarantee..."
                  className="input-style resize-none" />
              </Field>
            </div>
          )}

          {/* STEP 2 — Location */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <MapPin size={18} className="text-accent" /> Location & Workshop Address
                </h2>
                <span className="text-[11px] text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  📍 Highlighted to Customers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Area / Locality / Landmark *">
                  <input type="text" value={area} onChange={e => setArea(e.target.value)}
                    placeholder="e.g. Bandra West / Sector 62 / Koramangala"
                    className="input-style" />
                </Field>
                <Field label="City *">
                  <input type="text" value={city} onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Mumbai, Pune, Noida, Bengaluru"
                    className="input-style" />
                </Field>
              </div>

              <Field label="Full Street / Building / Plot Address *">
                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Plot No. 42, Service Lane, Near Metro Gate 3"
                  className="input-style" />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="State">
                  <input type="text" value={state} onChange={e => setState(e.target.value)}
                    placeholder="e.g. Maharashtra / Uttar Pradesh"
                    className="input-style" />
                </Field>
                <Field label="Pincode * (6 Digits)">
                  <input type="text" value={pincode} onChange={e => setPincode(e.target.value)}
                    placeholder="e.g. 400050" maxLength={6}
                    className="input-style font-mono" />
                </Field>
              </div>

              <Field label="Google Maps Pin / Link (Optional)">
                <input type="url" value={mapLink} onChange={e => setMapLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="input-style" />
              </Field>

              {/* Live Location Highlight Preview */}
              {(city || area || address) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
                    Live Customer Location Badge Preview:
                  </span>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/40 text-white text-xs font-bold">
                    <MapPin size={14} className="text-accent animate-bounce" />
                    <span>{area ? `${area}, ` : ''}{city || 'City'}{pincode ? ` (${pincode})` : ''}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Contact & Hours */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-extrabold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                <Phone size={18} className="text-accent" /> Contact & Working Hours
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone / Mobile Number *">
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="input-style" />
                </Field>
                <Field label="WhatsApp Booking Number">
                  <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="input-style" />
                </Field>
              </div>

              <Field label="Contact Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="service@apexprecision.com"
                  className="input-style" />
              </Field>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock size={13} /> Weekly Working Hours
                </label>
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center justify-between gap-3 text-xs">
                      <span className="w-24 text-gray-400 font-medium">{DAY_LABELS[day]}</span>
                      <input
                        type="text"
                        value={workingHours[day]}
                        onChange={e => setWorkingHours(prev => ({ ...prev, [day]: e.target.value }))}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — Services & Vehicles */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-extrabold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                <Wrench size={18} className="text-accent" /> Services & Vehicles Serviced
              </h2>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Car size={13} /> Vehicle Types Serviced *
                </label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_TYPE_OPTIONS.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleArray(vehicleTypes, setVehicleTypes, type)}
                      className={`text-xs px-3.5 py-2 rounded-xl font-semibold border transition-all
                        ${vehicleTypes.includes(type)
                          ? 'bg-accent/20 border-accent text-accent'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Wrench size={13} /> Service Offerings * (Click to select)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORY_OPTIONS.map(svc => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => toggleArray(serviceCategories, setServiceCategories, svc)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                        ${serviceCategories.includes(svc)
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Brands Serviced (comma separated)">
                <input type="text" value={brandsServiced} onChange={e => setBrandsServiced(e.target.value)}
                  placeholder="e.g. Maruti Suzuki, Hyundai, Honda, Tata, Toyota, BMW, Audi"
                  className="input-style" />
              </Field>
            </div>
          )}

          {/* STEP 5 — Certifications & MANDATORY Garage Photo */}
          {step === 5 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-extrabold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                <Shield size={18} className="text-accent" /> Certifications & Garage Photo
              </h2>

              <Field label="Certifications / Authorizations (comma separated)">
                <input type="text" value={certifications} onChange={e => setCertifications(e.target.value)}
                  placeholder="e.g. ISO 9001:2015, OEM Certified, BOSCH Authorized"
                  className="input-style" />
              </Field>

              {/* MANDATORY PHOTO UPLOAD SECTION */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/15">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={14} className="text-accent" /> Garage Photo <span className="text-rose-400">* (Mandatory)</span>
                  </label>
                  <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPhotoSourceMode('upload')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        photoSourceMode === 'upload' ? 'bg-accent text-dark' : 'text-gray-400'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoSourceMode('url')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        photoSourceMode === 'url' ? 'bg-accent text-dark' : 'text-gray-400'
                      }`}
                    >
                      Photo URL
                    </button>
                  </div>
                </div>

                {/* Upload Box */}
                {photoSourceMode === 'upload' ? (
                  <div>
                    {!photoData ? (
                      <label className="border-2 border-dashed border-white/20 hover:border-accent/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                        <Upload size={28} className="text-gray-400 group-hover:text-accent mb-2 transition-colors" />
                        <span className="text-xs font-bold text-white mb-1">Click or Drag & Drop Garage Photo</span>
                        <span className="text-[11px] text-gray-500">Supports JPG, PNG, WEBP (Max 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-white/20">
                        <img src={photoData} alt="Garage Preview" className="w-full h-44 object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={13} /> Photo attached
                          </span>
                          <button
                            type="button"
                            onClick={() => setPhotoData('')}
                            className="p-2 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white transition-all flex items-center gap-1 text-xs"
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={photoUrlInput}
                      onChange={e => setPhotoUrlInput(e.target.value)}
                      placeholder="https://example.com/your-garage-photo.jpg"
                      className="input-style mb-2"
                    />
                    {photoUrlInput && (
                      <div className="relative rounded-2xl overflow-hidden border border-white/20 mt-2">
                        <img
                          src={photoUrlInput}
                          alt="URL Preview"
                          className="w-full h-44 object-cover"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {!activePhoto && (
                  <p className="text-[11px] text-amber-400/90 mt-2.5 flex items-center gap-1.5">
                    <AlertCircle size={12} /> A garage photo is required to display your workshop on the marketplace. You can update it anytime from your dashboard.
                  </p>
                )}
              </div>

              {/* Summary preview */}
              <div className="p-4 rounded-2xl bg-white/3 border border-white/10 space-y-1.5">
                <h3 className="text-xs font-bold text-white mb-2">Registration Summary</h3>
                <p className="text-xs text-gray-400"><span className="text-gray-300">Garage:</span> {garageName}</p>
                <p className="text-xs text-gray-400"><span className="text-gray-300">Location:</span> {city}, {state}</p>
                <p className="text-xs text-gray-400"><span className="text-gray-300">Contact:</span> {phone}</p>
                <p className="text-xs text-gray-400"><span className="text-gray-300">Vehicles:</span> {vehicleTypes.join(', ')}</p>
                <p className="text-xs text-gray-400"><span className="text-gray-300">Services:</span> {serviceCategories.length} selected</p>
                <p className="text-xs text-gray-400"><span className="text-gray-300">Photo:</span> {activePhoto ? '✅ Attached' : '❌ Required'}</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-7 pt-5 border-t border-white/10">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-all cursor-pointer">
                <ChevronLeft size={16} /> Back
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[#050505] font-extrabold text-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}>
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[#050505] font-extrabold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Registering...' : 'Submit & Go Live'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-5">
          <Star size={10} className="inline text-accent mr-1" />
          Your garage will be verified and displayed immediately to car owners.
        </p>
      </div>
    </div>
  );
}

// Reusable field wrapper
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
