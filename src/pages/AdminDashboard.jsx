import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Car, Users, ClipboardList, ChevronRight, Search, ShieldCheck, LogOut, RefreshCw, 
  Tag, Plus, CheckCircle2, Percent, Clock, AlertTriangle, Flame, Lock, Layers, 
  Activity, CheckSquare, Sparkles, Filter, Wrench, ArrowUpRight, Zap, MapPin, 
  Calendar, DollarSign, X, Check, Gift, Sun, CloudRain, Snowflake, FlameKindling,
  BarChart3
} from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { initialOffers, services } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import IntelligencePanel from '../components/IntelligencePanel';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL'); // 'ALL' | 'IN_BAY' | 'QUEUE' | 'READY' | 'DELIVERED'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'offers'
  const [showIntelligencePanel, setShowIntelligencePanel] = useState(false);

  // Vehicle Intake Modal State
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicleModel: '',
    plateNumber: '',
    customerName: '',
    customerPhone: '',
    serviceType: 'EV Periodic Maintenance',
    city: 'Pune',
    address: 'Bay 4 Direct Walk-in Intake',
    pincode: '411041',
    pickupType: 'Direct Workshop Walk-in',
    isUrgent: false,
    urgentSurcharge: 0,
    deadlineDays: 1,
    deadlineHours: 4,
    notes: 'Direct garage intake by manager.'
  });

  // Manager Offers State
  const [offers, setOffers] = useState(() => {
    try {
      const saved = localStorage.getItem('autoserve_manager_offers');
      return saved ? JSON.parse(saved) : initialOffers;
    } catch {
      return initialOffers;
    }
  });

  // Create Seasonal Offer Modal State
  const [isCreateOfferOpen, setIsCreateOfferOpen] = useState(false);
  const [newOffer, setNewOffer] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: 15,
    isSeasonal: true,
    seasonName: 'Monsoon Care',
    validUntil: '31 Oct 2026'
  });

  const { currentUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadBookings = async () => {
    try {
      setIsRefreshing(true);
      const bookingQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(bookingQuery);
      setBookings(snapshot.docs.map(doc => ({ bookingId: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Failed to load admin bookings:', err);
      addToast('Error syncing database records.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleLogout = () => {
    logout();
    addToast('Logged out of Manager Command Center.', 'info');
    navigate('/login');
  };

  // Handle Quick Add Vehicle Intake by Manager
  const handleAddVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!newVehicle.vehicleModel || !newVehicle.plateNumber || !newVehicle.customerName) {
      addToast('Please fill in Vehicle Model, Plate Number, and Customer Name.', 'error');
      return;
    }

    try {
      setIsSubmittingVehicle(true);
      const generatedId = `AS-BAY-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const deadlineDate = new Date(now.getTime() + (Number(newVehicle.deadlineDays) * 24 + Number(newVehicle.deadlineHours)) * 60 * 60 * 1000);

      const vehicleBookingData = {
        bookingId: generatedId,
        vehicleModel: newVehicle.vehicleModel,
        plateNumber: newVehicle.plateNumber.toUpperCase(),
        customerName: newVehicle.customerName,
        customerPhone: newVehicle.customerPhone || '9876543210',
        serviceType: newVehicle.serviceType,
        status: 'Received',
        currentStage: 'Received',
        isDelivered: false,
        isUrgent: Boolean(newVehicle.isUrgent),
        urgentSurcharge: Boolean(newVehicle.isUrgent) ? Number(newVehicle.urgentSurcharge || 500) : 0,
        createdAt: now.toISOString(),
        deadline: deadlineDate.toISOString(),
        location: {
          city: newVehicle.city,
          address: newVehicle.address,
          pincode: newVehicle.pincode,
          pickupType: newVehicle.pickupType
        },
        mechanicNotes: newVehicle.notes,
        tasks: [
          { id: 1, title: 'In-Bay Intake Check & Visual Diagnostic', status: 'In Progress' },
          { id: 2, title: 'High Voltage Battery & Health Scan', status: 'Pending' },
          { id: 3, title: 'Regen Brake & Suspension Torque Verification', status: 'Pending' },
          { id: 4, title: 'Final Road Test & Quality Certification', status: 'Pending' }
        ],
        billing: {
          items: [
            { name: newVehicle.serviceType, price: 1200, category: 'Labour & Diagnostics' }
          ],
          discount: 0,
          urgentSurcharge: Boolean(newVehicle.isUrgent) ? Number(newVehicle.urgentSurcharge || 500) : 0,
          total: Boolean(newVehicle.isUrgent) ? 1200 + Number(newVehicle.urgentSurcharge || 500) : 1200
        }
      };

      // Save to Firestore
      await setDoc(doc(db, 'bookings', generatedId), vehicleBookingData);

      // Save Initial Live Telemetry to Realtime Database
      try {
        await set(ref(rtdb, `vehicles/${generatedId}`), {
          soc: 78,
          soh: 96,
          batteryTemp: 29.5,
          coolantFlow: 4.8,
          insulationResistance: 520,
          currentAmps: 0.0,
          status: 'Received',
          lastUpdated: new Date().toLocaleTimeString()
        });
      } catch (telemetryErr) {
        console.warn('Realtime database init note:', telemetryErr);
      }

      setBookings(prev => [vehicleBookingData, ...prev]);
      setIsAddVehicleOpen(false);
      addToast(`Vehicle ${newVehicle.plateNumber} successfully added to Bay Intake!`, 'success');
      
      // Reset form
      setNewVehicle({
        vehicleModel: '',
        plateNumber: '',
        customerName: '',
        customerPhone: '',
        serviceType: 'EV Periodic Maintenance',
        city: 'Pune',
        address: 'Bay 4 Direct Walk-in Intake',
        pincode: '411041',
        pickupType: 'Direct Workshop Walk-in',
        isUrgent: false,
        urgentSurcharge: 0,
        deadlineDays: 1,
        deadlineHours: 4,
        notes: 'Direct garage intake by manager.'
      });
    } catch (err) {
      console.error('Failed to create vehicle intake:', err);
      addToast('Error adding vehicle to database.', 'error');
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  // Handle Seasonal Offer Creation
  const handleCreateOffer = (e) => {
    e.preventDefault();
    if (!newOffer.code || !newOffer.title || !newOffer.discountValue) {
      addToast('Please fill in Offer Code, Title, and Discount Value.', 'error');
      return;
    }

    const created = {
      id: `offer_${Date.now()}`,
      code: newOffer.code.toUpperCase().replace(/\s+/g, ''),
      title: newOffer.title,
      description: newOffer.description,
      discountType: newOffer.discountType,
      discountValue: Number(newOffer.discountValue),
      isSeasonal: Boolean(newOffer.isSeasonal),
      seasonName: newOffer.isSeasonal ? newOffer.seasonName : '',
      validUntil: newOffer.validUntil || 'End of Season'
    };

    const updated = [created, ...offers];
    setOffers(updated);
    try {
      localStorage.setItem('autoserve_manager_offers', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setIsCreateOfferOpen(false);
    addToast(`Offer '${created.code}' activated for manager quote engine!`, 'success');

    setNewOffer({
      code: '',
      title: '',
      description: '',
      discountType: 'percentage',
      discountValue: 15,
      isSeasonal: true,
      seasonName: 'Monsoon Care',
      validUntil: '31 Oct 2026'
    });
  };

  // Auto-check expired proposals (24h timer elapsed)
  useEffect(() => {
    bookings.forEach(async (b) => {
      if ((b.status === 'Reschedule Proposed' || b.requestStatus === 'PROPOSAL_SENT') && b.proposalExpiresAt) {
        const isExpired = Date.now() > new Date(b.proposalExpiresAt).getTime();
        if (isExpired && b.status !== 'Failed / Expired') {
          try {
            await setDoc(doc(db, 'bookings', b.bookingId), {
              ...b,
              status: 'Failed / Expired',
              requestStatus: 'EXPIRED',
              failReason: '24-hour proposal confirmation window elapsed without customer response.',
              expiredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {
            console.error('Auto expire proposal error:', e);
          }
        }
      }
    });
  }, [bookings]);

  // Structured Lane Classifications
  const pendingOrders = bookings.filter(b => (b.status === 'Pending Approval' || b.status === 'Reschedule Proposed') && !b.isDelivered && b.status !== 'Delivered' && b.status !== 'Declined' && !b.isDeclined);
  const inBayOrders = bookings.filter(b => (b.status === 'Servicing' || b.status === 'Inspecting' || b.status === 'Received') && !b.isDelivered && b.status !== 'Delivered' && b.status !== 'Declined' && !b.isDeclined);
  const queueOrders = bookings.filter(b => b.status === 'Booked' && !b.isDelivered && b.status !== 'Delivered' && b.status !== 'Declined' && !b.isDeclined);
  const readyOrders = bookings.filter(b => b.status === 'Ready' && !b.isDelivered && b.status !== 'Delivered' && b.status !== 'Declined' && !b.isDeclined);
  const deliveredOrders = bookings.filter(b => b.status === 'Delivered' || b.isDelivered);
  const failedOrders = bookings.filter(b => b.status === 'Declined' || b.isDeclined || b.status === 'Failed / Expired' || b.requestStatus === 'DECLINED' || b.requestStatus === 'EXPIRED');
  const activeOrders = bookings.filter(b => !b.isDelivered && b.status !== 'Delivered' && b.status !== 'Failed / Expired' && b.status !== 'Declined' && !b.isDeclined);

  // Urgent priority jobs count across all active workshop stages
  const urgentOrders = bookings.filter(b => 
    (b.isUrgent || Number(b.urgentSurcharge) > 0) &&
    !b.isDelivered && 
    b.status !== 'Delivered' && 
    b.status !== 'Declined' && 
    !b.isDeclined && 
    b.status !== 'Failed / Expired'
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending Approval':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse';
      case 'Reschedule Proposed':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]';
      case 'Declined':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]';
      case 'Failed / Expired':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Booked': 
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_0_10px_rgba(56,189,248,0.15)]';
      case 'Received': 
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]';
      case 'Inspecting': 
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]';
      case 'Servicing': 
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
      case 'Washing': 
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]';
      case 'Ready': 
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.25)]';
      case 'Delivered': 
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]';
      default: 
        return 'bg-slate-500/15 text-slate-300 border-slate-500/20';
    }
  };

  // Segregated filters
  const filteredBookings = bookings.filter(b => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (b.bookingId && b.bookingId.toLowerCase().includes(term)) ||
      (b.vehicleModel && b.vehicleModel.toLowerCase().includes(term)) ||
      (b.plateNumber && b.plateNumber.toLowerCase().includes(term)) ||
      (b.serviceType && b.serviceType.toLowerCase().includes(term)) ||
      (b.customerName && b.customerName.toLowerCase().includes(term)) ||
      (b.location?.city && b.location.city.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    const isDelivered = b.status === 'Delivered' || b.isDelivered;
    const isFailed = b.status === 'Declined' || b.isDeclined || b.status === 'Failed / Expired' || b.requestStatus === 'DECLINED' || b.requestStatus === 'EXPIRED';

    if (selectedStageFilter === 'URGENT') {
      return (b.isUrgent || Number(b.urgentSurcharge) > 0) && !isDelivered && !isFailed;
    }

    if (selectedStageFilter === 'PENDING') {
      return (b.status === 'Pending Approval' || b.status === 'Reschedule Proposed') && !isDelivered && !isFailed;
    }

    if (selectedStageFilter === 'FAILED') {
      return isFailed;
    }

    if (selectedStageFilter === 'DELIVERED') {
      return isDelivered;
    }

    // For other tabs, exclude Delivered and Failed
    if (isDelivered || isFailed) {
      return false;
    }

    if (selectedStageFilter === 'IN_BAY') {
      return (b.status === 'Servicing' || b.status === 'Inspecting' || b.status === 'Received' || b.status === 'Washing') && !isDelivered && !isFailed;
    }
    if (selectedStageFilter === 'QUEUE') {
      return b.status === 'Booked' && !isDelivered && !isFailed;
    }
    if (selectedStageFilter === 'READY') {
      return b.status === 'Ready' && !isDelivered && !isFailed;
    }
    return !isDelivered && !isFailed;
  });

  return (
    <div className="min-h-screen bg-[#070a12] pt-24 pb-16 animate-fade-in text-slate-100 relative overflow-hidden selection:bg-sky-500/30">
      {/* Eye-Pleasing Psychological Background Lighting Orbs */}
      <div className="absolute top-10 right-0 w-[550px] h-[550px] bg-sky-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-40 left-0 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 left-1/3 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* TOP BAR: GARAGE PROFILE & QUICK ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 text-slate-950 font-black text-xl">
                AS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Workshop Operations HQ</h1>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Bay
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manager: <span className="text-sky-300 font-semibold">{currentUser?.name || 'Administrator'}</span> • Direct Work Stream & Dispatch Desk
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsAddVehicleOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
            >
              <Plus size={16} /> Add Vehicle / Walk-in
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'offers' ? 'board' : 'offers')}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'offers' 
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/25' 
                  : 'bg-white/5 hover:bg-white/10 text-amber-300 border-amber-400/30'
              }`}
            >
              <Tag size={15} /> Seasonal Discounts ({offers.length})
            </button>
            <button
              onClick={() => setShowIntelligencePanel(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-violet-500/25 active:scale-95 transition-all border border-violet-400/30"
            >
              <BarChart3 size={15} /> Intelligence Panel
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <LogOut size={14} /> Exit
            </button>
          </div>
        </div>

        {activeTab === 'board' && (
          <>
            {/* WORKFLOW PSYCHOLOGY KPI METRIC TILES */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
              
              {/* 0. Pending Approvals & Negotiations */}
              <div 
                onClick={() => setSelectedStageFilter(selectedStageFilter === 'PENDING' ? 'ALL' : 'PENDING')}
                className={`p-5 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
                  selectedStageFilter === 'PENDING' 
                    ? 'bg-gradient-to-br from-amber-500/25 via-amber-600/10 to-[#0c1322] border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)] scale-[1.02]' 
                    : 'bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-[#0b101c] border-amber-500/20 hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-amber-300 font-bold mb-2 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Clock size={16} className="text-amber-400" /> Pending Approval</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Action</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{pendingOrders.length}</p>
                <p className="text-[11px] text-amber-200/70 mt-1">Awaiting manager slot decision</p>
              </div>

              {/* 1. Active in Bay (Energy, Craftsmanship & Warm Action) */}
              <div 
                onClick={() => setSelectedStageFilter(selectedStageFilter === 'IN_BAY' ? 'ALL' : 'IN_BAY')}
                className={`p-5 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
                  selectedStageFilter === 'IN_BAY' 
                    ? 'bg-gradient-to-br from-sky-500/25 via-blue-600/10 to-[#0c1322] border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.3)] scale-[1.02]' 
                    : 'bg-gradient-to-br from-sky-500/10 via-slate-900/60 to-[#0b101c] border-sky-500/20 hover:border-sky-400/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-sky-300 font-bold mb-2 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Activity size={16} className="text-sky-400" /> Active in Bay</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">In Bay</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{inBayOrders.length}</p>
                <p className="text-[11px] text-sky-200/70 mt-1">Undergoing live repair & tuning</p>
              </div>

              {/* 2. Urgent Priority Jobs (CLICKABLE URGENT FILTER) */}
              <div 
                onClick={() => setSelectedStageFilter(selectedStageFilter === 'URGENT' ? 'ALL' : 'URGENT')}
                className={`p-5 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
                  selectedStageFilter === 'URGENT' 
                    ? 'bg-gradient-to-br from-amber-500/25 via-rose-950/50 to-[#0c1322] border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] scale-[1.02]' 
                    : urgentOrders.length > 0 
                      ? 'bg-gradient-to-br from-rose-500/20 via-rose-950/40 to-[#0b101c] border-rose-500/40 hover:border-amber-400/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]' 
                      : 'bg-gradient-to-br from-rose-500/10 via-slate-900/60 to-[#0b101c] border-rose-500/20 hover:border-rose-400/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-rose-300 font-bold mb-2 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Zap size={16} className="text-amber-400" /> Urgent Express</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {selectedStageFilter === 'URGENT' ? 'Filtered' : 'Priority Bay'}
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{urgentOrders.length}</p>
                <p className="text-[11px] text-rose-200/70 mt-1">
                  {selectedStageFilter === 'URGENT' ? 'Viewing all urgent vehicles' : 'Click to filter urgent vehicles'}
                </p>
              </div>

              {/* 3. Ready in Bay (Quality Assurance & Achievement) */}
              <div 
                onClick={() => setSelectedStageFilter(selectedStageFilter === 'READY' ? 'ALL' : 'READY')}
                className={`p-5 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
                  selectedStageFilter === 'READY' 
                    ? 'bg-gradient-to-br from-yellow-500/25 via-amber-600/10 to-[#0c1322] border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.3)] scale-[1.02]' 
                    : 'bg-gradient-to-br from-yellow-500/10 via-slate-900/60 to-[#0b101c] border-yellow-500/20 hover:border-yellow-400/60 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-yellow-300 font-bold mb-2 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-yellow-400" /> Ready in Bay</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">QC Passed</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{readyOrders.length}</p>
                <p className="text-[11px] text-yellow-200/70 mt-1">Awaiting client pickup</p>
              </div>

              {/* 4. Delivered History */}
              <div 
                onClick={() => setSelectedStageFilter(selectedStageFilter === 'DELIVERED' ? 'ALL' : 'DELIVERED')}
                className={`p-5 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
                  selectedStageFilter === 'DELIVERED' 
                    ? 'bg-gradient-to-br from-emerald-500/25 via-teal-900/20 to-[#0c1322] border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-[1.02]' 
                    : 'bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-[#0b101c] border-emerald-500/20 hover:border-emerald-400/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-emerald-300 font-bold mb-2 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Lock size={15} className="text-emerald-400" /> Delivered History</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Sealed</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{deliveredOrders.length}</p>
                <p className="text-[11px] text-emerald-200/70 mt-1">Archived delivered logs</p>
              </div>
            </div>

            {/* SEARCH & STAGE FILTERS BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {/* Filter Pills with Color Coding */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1.5 bg-[#0a0f1d]/80 border border-white/10 rounded-2xl backdrop-blur-xl">
                {[
                  { key: 'ALL', label: `Active Works (${activeOrders.length})`, color: 'hover:text-sky-300' },
                  { key: 'URGENT', label: `⚡ Urgent Express (${urgentOrders.length})`, color: 'hover:text-amber-300' },
                  { key: 'PENDING', label: `Pending Approvals (${pendingOrders.length})`, color: 'hover:text-amber-300' },
                  { key: 'IN_BAY', label: `In Bay (${inBayOrders.length})`, color: 'hover:text-sky-300' },
                  { key: 'QUEUE', label: `Queue (${queueOrders.length})`, color: 'hover:text-sky-300' },
                  { key: 'READY', label: `Ready (${readyOrders.length})`, color: 'hover:text-yellow-300' },
                  { key: 'DELIVERED', label: `Delivered Only (${deliveredOrders.length})`, color: 'hover:text-emerald-300' },
                  { key: 'FAILED', label: `Declined / Failed (${failedOrders.length})`, color: 'hover:text-rose-300' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedStageFilter(tab.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedStageFilter === tab.key
                        ? tab.key === 'URGENT'
                          ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 scale-102'
                          : tab.key === 'PENDING' 
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 scale-102'
                          : tab.key === 'FAILED'
                          ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black shadow-lg shadow-rose-500/25 scale-102'
                          : tab.key === 'DELIVERED'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/25 scale-102'
                          : 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 font-black shadow-lg shadow-sky-500/25 scale-102'
                        : `text-slate-400 hover:bg-white/5 ${tab.color}`
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vehicle, plate, client, location..." 
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0a0f1d]/90 border border-white/10 rounded-2xl text-white outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all text-xs placeholder-slate-500 shadow-inner"
                />
              </div>
            </div>

            {/* STRUCTURED FLEET GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBookings.map((b) => {
                const totalTasks = b.tasks?.length || 0;
                const doneTasks = b.tasks?.filter(t => t.status === 'Done').length || 0;
                const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                const isDelivered = b.status === 'Delivered' || b.isDelivered;
                const isDeclined = b.status === 'Declined' || b.isDeclined || b.requestStatus === 'DECLINED';
                const isPending = (b.status === 'Pending Approval' || b.requestStatus === 'PENDING_APPROVAL') && !isDeclined;
                const isReschedule = (b.status === 'Reschedule Proposed' || b.requestStatus === 'PROPOSAL_SENT') && !isDeclined;
                const isFailed = isDeclined || b.status === 'Failed / Expired' || b.requestStatus === 'EXPIRED';
                const hasUrgent = b.isUrgent || Number(b.urgentSurcharge) > 0;

                // Color-adaptive progress bar gradient
                let progressGradient = 'bg-gradient-to-r from-indigo-500 to-purple-500';
                if (progressPct >= 100) {
                  progressGradient = 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]';
                } else if (progressPct >= 50) {
                  progressGradient = 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.4)]';
                }

                // Deadline urgency check
                let deadlineBadge = null;
                if (isDelivered) {
                  deadlineBadge = (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full shadow-sm">
                      <Lock size={10} /> Sealed & Delivered
                    </span>
                  );
                } else if (isDeclined) {
                  deadlineBadge = (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded-full shadow-sm">
                      <AlertTriangle size={10} /> Declined ({b.declinedByName || 'User'})
                    </span>
                  );
                } else if (isFailed) {
                  deadlineBadge = (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-full shadow-sm">
                      <AlertTriangle size={10} /> Expired Request
                    </span>
                  );
                } else if (isPending) {
                  deadlineBadge = (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-200 bg-amber-500/25 border border-amber-500/50 px-3 py-1 rounded-full animate-pulse shadow-sm">
                      <Clock size={10} className="text-amber-400" /> Awaiting Confirmation
                    </span>
                  );
                } else if (isReschedule) {
                  deadlineBadge = (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-sky-200 bg-sky-500/25 border border-sky-500/50 px-3 py-1 rounded-full shadow-sm">
                      <Calendar size={10} className="text-sky-400" /> Reschedule Proposed (24h)
                    </span>
                  );
                } else if (b.deadline) {
                  const diffHours = Math.round((new Date(b.deadline).getTime() - Date.now()) / (1000 * 60 * 60));
                  if (diffHours < 0) {
                    deadlineBadge = (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-200 bg-rose-500/25 border border-rose-500/50 px-3 py-1 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                        <AlertTriangle size={11} className="text-rose-400" /> Overdue ({Math.abs(diffHours)}h ago)
                      </span>
                    );
                  } else if (diffHours <= 4) {
                    deadlineBadge = (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-200 bg-amber-500/25 border border-amber-500/50 px-3 py-1 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                        <Flame size={11} className="text-amber-400" /> {diffHours}h left
                      </span>
                    );
                  } else {
                    deadlineBadge = (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-3 py-1 rounded-full">
                        <Clock size={11} className="text-sky-400" /> {diffHours}h ETA
                      </span>
                    );
                  }
                }

                return (
                  <div 
                    key={b.bookingId} 
                    onClick={() => navigate(`/admin/booking/${b.bookingId}`)}
                    className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 hover:shadow-2xl flex flex-col justify-between space-y-4 backdrop-blur-xl relative overflow-hidden group ${
                      isDelivered 
                        ? 'border-emerald-500/20 bg-gradient-to-br from-[#0a141c]/90 via-[#070e17]/80 to-[#05090f] hover:border-emerald-500/40' 
                        : isFailed
                        ? 'border-rose-500/20 bg-gradient-to-br from-[#1a0c10]/90 via-[#100709]/80 to-[#070a12] opacity-80 hover:border-rose-500/50'
                        : hasUrgent
                        ? 'border-amber-400/50 bg-gradient-to-br from-[#1e1307]/90 via-[#140b0a]/85 to-[#070a12] shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400'
                        : isPending
                        ? 'border-amber-400/40 bg-gradient-to-br from-[#1c1407]/90 via-[#120e06]/85 to-[#070a12] shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-amber-400'
                        : 'border-white/10 bg-gradient-to-br from-[#0e1628]/85 via-[#0b101c]/90 to-[#070a12] hover:border-sky-400/40 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)]'
                    }`}
                  >
                    {/* Subtle Top Glow */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                    <div>
                      {/* Top ID & Badges Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-mono font-bold text-xs text-sky-300 bg-sky-950/60 px-3 py-1 rounded-xl border border-sky-500/30 shadow-inner">
                          {b.bookingId}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {hasUrgent && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                              <Zap size={10} className="fill-rose-400 text-rose-400" /> EXPRESS PRIORITY {Number(b.urgentSurcharge) > 0 ? `(+₹${b.urgentSurcharge})` : ''}
                            </span>
                          )}
                          {deadlineBadge}
                        </div>
                      </div>

                      {/* Vehicle & Plate */}
                      <div className="mb-3">
                        <h3 className="text-lg font-black text-white leading-snug group-hover:text-amber-300 transition-colors">
                          {b.vehicleModel}
                        </h3>
                        <div className="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-black/50 border border-white/10 font-mono text-[11px] font-bold text-slate-300 tracking-wider">
                          {b.plateNumber || 'MH 00 XX 0000'}
                        </div>
                      </div>

                      {/* Location & Service Mode */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                        <MapPin size={12} className="text-sky-400 shrink-0" />
                        <span className="truncate font-medium">
                          {b.location?.city ? `${b.location.city} • ${b.location.pickupType || 'Workshop'}` : (b.location?.address || 'Direct Garage Intake')}
                        </span>
                      </div>

                      {/* Stage & Service Scope */}
                      <div className="flex items-center justify-between gap-2 mb-3.5 pt-2 border-t border-white/5 text-xs">
                        <span className={`text-[11px] px-3 py-0.5 rounded-full border font-extrabold ${getStatusColor(b.status)}`}>
                          ● {b.status}
                        </span>
                        <span className="text-slate-300 font-medium truncate max-w-[150px]">{b.serviceType}</span>
                      </div>

                      {/* Agile Tasks Progress Bar */}
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1.5"><CheckSquare size={13} className="text-sky-400" /> Agile Checklist</span>
                          <span className="text-amber-300 font-bold font-mono">{doneTasks}/{totalTasks} Done ({progressPct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className={`h-full rounded-full transition-all duration-500 ${progressGradient}`} style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3.5 border-t border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Customer</p>
                        <p className="text-slate-200 font-semibold truncate max-w-[130px]">{b.customerName || 'Customer'}</p>
                      </div>

                      <Link 
                        to={`/admin/booking/${b.bookingId}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all duration-200 active:scale-95 ${
                          isDelivered 
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30' 
                            : isPending
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-500/20 animate-pulse'
                            : isFailed
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                            : 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 hover:brightness-110 shadow-sky-500/20'
                        }`}
                      >
                        {isDelivered ? 'View Record' : isPending ? 'Review Slot' : isFailed ? 'View Dead Record' : 'Manage & Quote'} <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredBookings.length === 0 && (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-[#0a0f1d]/60 backdrop-blur-xl">
                <Car className="mx-auto text-slate-600 mb-3" size={36} />
                <p className="text-slate-400 text-sm font-medium">
                  {selectedStageFilter === 'URGENT'
                    ? 'No urgent priority vehicles in the workshop right now.'
                    : selectedStageFilter === 'DELIVERED' 
                    ? 'No delivered vehicles in archived records.' 
                    : selectedStageFilter === 'PENDING'
                    ? 'No pending slot confirmation requests at this moment.'
                    : selectedStageFilter === 'FAILED'
                    ? 'No failed or expired transactions.'
                    : 'No active vehicle bookings match your current filter.'}
                </p>
              </div>
            )}
          </>
        )}

        {/* TAB 2: SEASONAL OFFERS & PRICING CONTROLS */}
        {activeTab === 'offers' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-[#0d1322]/90 via-[#0e172a]/85 to-[#0b101c]/90 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Tag className="text-amber-400" size={20} /> Seasonal Discounts & Manager Pricing Engine
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure seasonal promotions (Monsoon, Festive, Summer, Winter) applied during manager quotation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreateOfferOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Plus size={14} /> Add Seasonal Offer
                </button>
                <button
                  onClick={() => setActiveTab('board')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                >
                  Back to Live Fleet
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {offers.map((offer) => {
                let seasonIcon = <Gift size={13} className="text-amber-400" />;
                if (offer.seasonName?.toLowerCase().includes('monsoon')) seasonIcon = <CloudRain size={13} className="text-sky-400" />;
                if (offer.seasonName?.toLowerCase().includes('summer')) seasonIcon = <Sun size={13} className="text-amber-400" />;
                if (offer.seasonName?.toLowerCase().includes('winter')) seasonIcon = <Snowflake size={13} className="text-cyan-300" />;
                if (offer.seasonName?.toLowerCase().includes('festive')) seasonIcon = <FlameKindling size={13} className="text-rose-400" />;

                return (
                  <div key={offer.id} className="p-5 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#0e172a]/90 via-[#0b101c] to-[#080d1a] backdrop-blur-xl space-y-3 shadow-lg hover:border-amber-400/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-extrabold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-xl tracking-wider">
                        {offer.code}
                      </span>
                      {offer.isSeasonal ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-300 font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                          {seasonIcon} {offer.seasonName || 'Seasonal Promo'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                          ● Regular Offer
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-sm font-black text-white">{offer.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{offer.description}</p>
                    
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <p className="text-xs font-black text-amber-400">
                        {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} FLAT DISCOUNT`}
                      </p>
                      {offer.validUntil && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Expires: {offer.validUntil}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: ADD VEHICLE INTAKE MODAL */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1120] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Plus className="text-emerald-400" /> Manual Vehicle Intake
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Register walk-in or urgent breakdown vehicles directly into service bay.</p>
              </div>
              <button 
                onClick={() => setIsAddVehicleOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Vehicle Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Nexon EV Max"
                    value={newVehicle.vehicleModel}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleModel: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Number Plate *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH 12 TR 8899"
                    value={newVehicle.plateNumber}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white uppercase outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Patil"
                    value={newVehicle.customerName}
                    onChange={(e) => setNewVehicle({ ...newVehicle, customerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Customer Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9822334455"
                    value={newVehicle.customerPhone}
                    onChange={(e) => setNewVehicle({ ...newVehicle, customerPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Service Package</label>
                <select
                  value={newVehicle.serviceType}
                  onChange={(e) => setNewVehicle({ ...newVehicle, serviceType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-400"
                >
                  <option value="EV Periodic Maintenance">EV Periodic Maintenance</option>
                  <option value="High Voltage Battery Diagnostic & BMS Calibration">High Voltage Battery Diagnostic & BMS Calibration</option>
                  <option value="Brake System Overhaul & Regen Tuning">Brake System Overhaul & Regen Tuning</option>
                  <option value="Thermal & Coolant Flush System">Thermal & Coolant Flush System</option>
                  <option value="Rapid Express Inspection & QC">Rapid Express Inspection & QC</option>
                </select>
              </div>

              {/* Location Details */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                  <MapPin size={14} /> Intake Location & Service Mode
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">City</label>
                    <input
                      type="text"
                      value={newVehicle.city}
                      onChange={(e) => setNewVehicle({ ...newVehicle, city: e.target.value })}
                      className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white outline-none focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Service Mode</label>
                    <select
                      value={newVehicle.pickupType}
                      onChange={(e) => setNewVehicle({ ...newVehicle, pickupType: e.target.value })}
                      className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white outline-none focus:border-sky-400"
                    >
                      <option value="Direct Workshop Walk-in">Direct Workshop Walk-in</option>
                      <option value="Home Pickup & Drop">Home Pickup & Drop</option>
                      <option value="Roadside Urgent Assist">Roadside Urgent Assist</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Address / Landmark</label>
                  <input
                    type="text"
                    value={newVehicle.address}
                    onChange={(e) => setNewVehicle({ ...newVehicle, address: e.target.value })}
                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Urgent Priority & Surcharge Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 to-amber-950/20 border border-rose-500/20 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newVehicle.isUrgent}
                    onChange={(e) => setNewVehicle({ ...newVehicle, isUrgent: e.target.checked })}
                    className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-black text-rose-300 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-400" /> Mark as Urgent Express Service
                    </span>
                    <p className="text-[11px] text-slate-400">Gives priority bay allocation and urgent queue ranking.</p>
                  </div>
                </label>

                {newVehicle.isUrgent && (
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-4">
                    <label className="text-slate-300 font-bold">Priority Surcharge (₹):</label>
                    <input
                      type="number"
                      value={newVehicle.urgentSurcharge}
                      onChange={(e) => setNewVehicle({ ...newVehicle, urgentSurcharge: Number(e.target.value) })}
                      className="w-28 px-3 py-1.5 bg-black/50 border border-rose-500/40 rounded-lg text-amber-300 font-bold text-right outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Deadlines */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Deadline Days</label>
                  <input
                    type="number"
                    min="0"
                    value={newVehicle.deadlineDays}
                    onChange={(e) => setNewVehicle({ ...newVehicle, deadlineDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Deadline Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={newVehicle.deadlineHours}
                    onChange={(e) => setNewVehicle({ ...newVehicle, deadlineHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVehicle}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                >
                  {isSubmittingVehicle ? 'Registering Vehicle...' : '➕ Register Vehicle Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE SEASONAL OFFER MODAL */}
      {isCreateOfferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1120] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Tag className="text-amber-400" /> Create Seasonal Discount
              </h3>
              <button 
                onClick={() => setIsCreateOfferOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MONSOON2026"
                  value={newOffer.code}
                  onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-amber-300 font-mono font-bold uppercase outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monsoon Shield & Brake Care"
                  value={newOffer.title}
                  onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 15% off all high-voltage insulation and brake maintenance"
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Discount Type</label>
                  <select
                    value={newOffer.discountType}
                    onChange={(e) => setNewOffer({ ...newOffer, discountType: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={newOffer.discountValue}
                    onChange={(e) => setNewOffer({ ...newOffer, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-amber-400 font-bold outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newOffer.isSeasonal}
                    onChange={(e) => setNewOffer({ ...newOffer, isSeasonal: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="font-bold text-amber-300">Is Seasonal Campaign?</span>
                </label>

                {newOffer.isSeasonal && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Season Name</label>
                      <select
                        value={newOffer.seasonName}
                        onChange={(e) => setNewOffer({ ...newOffer, seasonName: e.target.value })}
                        className="w-full px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs"
                      >
                        <option value="Monsoon Care">Monsoon Care</option>
                        <option value="Festive Dhamaka">Festive Dhamaka</option>
                        <option value="Summer AC Special">Summer AC Special</option>
                        <option value="Winter EV Care">Winter EV Care</option>
                        <option value="Spring Maintenance">Spring Maintenance</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Valid Until</label>
                      <input
                        type="text"
                        placeholder="e.g. 30 Nov 2026"
                        value={newOffer.validUntil}
                        onChange={(e) => setNewOffer({ ...newOffer, validUntil: e.target.value })}
                        className="w-full px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs"
                      >
                      </input>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOfferOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md"
                >
                  Create & Activate Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTELLIGENCE PANEL OVERLAY */}
      {showIntelligencePanel && (
        <IntelligencePanel onClose={() => setShowIntelligencePanel(false)} />
      )}

    </div>
  );
}
