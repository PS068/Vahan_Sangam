import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, Star, Clock, Heart, LogOut, User,
  ChevronRight, ChevronDown, Wrench, Search, Building2, Phone, Home,
  Edit3, Save, MessageSquare, CheckCircle2, Shield, AlertCircle, Loader2, ArrowRight,
  XCircle, Check, AlertTriangle, RefreshCw, X, Ban, FileText, CheckCircle,
  Car, Activity, History, CalendarDays, ShieldCheck, Flame, Plus, Receipt, Printer, MessageCircle, Send
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import CustomerAlertBanner from '../components/CustomerAlertBanner';

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

const STATUS_CONFIGS = {
  pending: {
    label: 'Pending Approval',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    progress: 20
  },
  proposed_changes: {
    label: 'Action Required (24h Window)',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.2)]',
    progress: 35
  },
  confirmed: {
    label: 'Confirmed Slot',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    progress: 45
  },
  inProgress: {
    label: 'In Bay (Servicing)',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    progress: 65
  },
  ready: {
    label: 'Ready',
    badge: 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.2)]',
    progress: 85
  },
  completed: {
    label: 'Delivered',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    progress: 100
  },
  delivered: {
    label: 'Delivered',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    progress: 100
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    progress: 0
  },
  declined: {
    label: 'Declined',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    progress: 0
  }
};

export default function MyAccount() {
  const { currentUser, userProfile, updateUserProfileData, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'delivered' | 'cancelled' | 'all' | 'reviews'

  // Phone Validation State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Proposal Acceptance Loading
  const [acceptingProposalId, setAcceptingProposalId] = useState(null);

  // Customer Bill Modal View
  const [viewBillBooking, setViewBillBooking] = useState(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Customer Review Modal
  const [reviewBookingItem, setReviewBookingItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Current timer ticker for 24h countdowns
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userProfile || currentUser) {
      const rawP = userProfile?.phone || '';
      setPhoneInput(getClean10Digit(rawP));
    }
  }, [userProfile, currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Bookings (Check both userId and customerId)
      try {
        const q1 = query(collection(db, 'bookings'), where('userId', '==', currentUser.uid));
        const snap1 = await getDocs(q1);
        let list = snap1.docs.map(d => ({ id: d.id, bookingId: d.id, ...d.data() }));

        // Also fetch customerId if different
        try {
          const q2 = query(collection(db, 'bookings'), where('customerId', '==', currentUser.uid));
          const snap2 = await getDocs(q2);
          const list2 = snap2.docs.map(d => ({ id: d.id, bookingId: d.id, ...d.data() }));
          const map = new Map();
          [...list, ...list2].forEach(item => map.set(item.id, item));
          list = Array.from(map.values());
        } catch {
          // ignore
        }

        list.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
          return timeB - timeA;
        });
        setBookings(list);

        // Auto-trigger celebratory pop-up window for delivered vehicle
        const latestDelivered = list.find(b => {
          const st = (b.status || '').toLowerCase();
          return st === 'completed' || st === 'delivered' || Boolean(b.isDelivered);
        });
        if (latestDelivered) {
          const seenKey = `vs_deliv_popup_seen_${latestDelivered.id}`;
          if (!sessionStorage.getItem(seenKey)) {
            sessionStorage.setItem(seenKey, 'true');
            setViewBillBooking(latestDelivered);
            setIsBillModalOpen(true);
          }
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setBookings([]);
      }

      // Fetch User's Given Reviews / Feedbacks
      try {
        const rq = query(collection(db, 'reviews'), where('userId', '==', currentUser.uid));
        const rsnap = await getDocs(rq);
        if (!rsnap.empty) {
          const rlist = rsnap.docs.map(d => ({ id: d.id, ...d.data() }));
          rlist.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
            return timeB - timeA;
          });
          setReviews(rlist);
        } else {
          setReviews([]);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setReviews([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone Validation & Save Handler
  const handleValidateAndSavePhone = async (e) => {
    e.preventDefault();
    setPhoneError('');
    const cleanNumber = getClean10Digit(phoneInput);

    if (!cleanNumber || !validateIndianPhoneNumber(cleanNumber)) {
      setPhoneError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      addToast('Invalid 10-digit mobile number format.', 'error');
      return;
    }

    setIsSavingPhone(true);
    try {
      const formatted = `+91 ${cleanNumber}`;
      await updateUserProfileData({
        phone: formatted,
        phoneVerified: true,
        phoneValidatedAt: new Date().toISOString()
      });
      setIsPhoneModalOpen(false);
      addToast('Mobile number validated & saved successfully! 📱', 'success');
    } catch (err) {
      console.error('Phone update error:', err);
      addToast(err.message || 'Failed to update phone number.', 'error');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast('Signed out of VahanSangam Portal.', 'info');
    navigate('/');
  };

  // ─── 24-HOUR PROPOSAL ACCEPTANCE ───
  const handleAcceptProposal = async (booking) => {
    setAcceptingProposalId(booking.id);
    try {
      const prop = booking.proposedChanges || booking.managerProposal || {};
      const updatedFields = {
        status: 'inProgress',
        currentStage: 'In Bay',
        requestStatus: 'CONFIRMED',
        date: prop.date || prop.newDate || booking.date,
        timeSlot: prop.timeSlot || prop.newTimeSlot || booking.timeSlot,
        expectedDuration: prop.expectedDuration || prop.newTurnaround || booking.expectedDuration,
        estimatedCost: prop.quote || prop.newEstimatedCost || booking.estimatedCost || 1500,
        customerConfirmedAt: new Date().toISOString(),
        statusHistory: [
          ...(booking.statusHistory || []),
          {
            stage: 'In Bay (Customer Confirmed Schedule)',
            timestamp: new Date().toISOString(),
            notes: `Customer accepted manager's proposed slot: ${prop.date || prop.newDate || booking.date} (${prop.timeSlot || prop.newTimeSlot || booking.timeSlot})`
          }
        ]
      };

      await updateDoc(doc(db, 'bookings', booking.id), updatedFields);
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, ...updatedFields } : b));
      addToast('✅ Proposal accepted! Your service slot is locked into the live bay.', 'success');
    } catch (err) {
      console.error('Error accepting proposal:', err);
      addToast('Failed to accept proposal. Please try again.', 'error');
    } finally {
      setAcceptingProposalId(null);
    }
  };

  // ─── CANCEL / DECLINE MODAL HANDLERS ───
  const openCancelModal = (booking) => {
    setSelectedBookingForCancel(booking);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBookingForCancel) return;
    setIsSubmittingCancel(true);
    try {
      const reason = cancelReason.trim() || 'Cancelled by customer.';
      const customerDisplayName = userProfile?.name || currentUser?.displayName || 'Customer';
      const updatedFields = {
        status: 'cancelled',
        currentStage: 'Cancelled',
        requestStatus: 'DECLINED',
        isCancelled: true,
        isDeclined: true,
        cancelledBy: 'customer',
        cancelledByName: customerDisplayName,
        declinedByRole: 'customer',
        declinedByName: customerDisplayName,
        declinedBy: `${customerDisplayName} (Customer)`,
        cancellationReason: reason,
        declineReason: reason,
        cancelledAt: new Date().toISOString(),
        declinedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        statusHistory: [
          ...(selectedBookingForCancel.statusHistory || []),
          {
            stage: 'Cancelled',
            timestamp: new Date().toISOString(),
            notes: `Cancelled by customer: ${reason}`
          }
        ]
      };

      await updateDoc(doc(db, 'bookings', selectedBookingForCancel.id), updatedFields);
      setBookings(prev => prev.map(b => b.id === selectedBookingForCancel.id ? { ...b, ...updatedFields } : b));
      addToast('Booking cancelled and moved to Cancelled tab.', 'info');
      setActiveTab('cancelled');
      setCancelModalOpen(false);
      setSelectedBookingForCancel(null);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      addToast('Failed to cancel booking.', 'error');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Submit Feedback / Review
  const handleOpenReviewModal = (booking) => {
    setReviewBookingItem(booking);
    setReviewRating(5);
    setReviewComment('Excellent certified workmanship and prompt delivery!');
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!reviewBookingItem) return;
    setIsSubmittingReview(true);
    try {
      const reviewDoc = {
        garageId: reviewBookingItem.garageId || 'workshop',
        garageName: reviewBookingItem.garageName || 'Workshop',
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.displayName || 'Customer',
        userPhoto: currentUser.photoURL || null,
        vehicleModel: reviewBookingItem.vehicle || reviewBookingItem.vehicleModel || 'Vehicle',
        rating: reviewRating,
        comment: reviewComment.trim(),
        helpfulCount: 0,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'reviews'), reviewDoc);
      addToast('Thank you! Your feedback has been published. 🌟', 'success');
      setReviewBookingItem(null);
      fetchData();
    } catch (err) {
      console.error('Review error:', err);
      addToast('Failed to post review.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Helper for 24-hour expiration calculation
  // Mutually Exclusive Booking Status Helpers
  const isCancelledOrDeclined = (b) => {
    const st = (b.status || '').toLowerCase();
    const reqSt = (b.requestStatus || '').toLowerCase();
    const currentStg = (b.currentStage || '').toLowerCase();
    return (
      st === 'cancelled' ||
      st === 'declined' ||
      st === 'canceled' ||
      reqSt === 'declined' ||
      reqSt === 'cancelled' ||
      reqSt === 'canceled' ||
      currentStg.includes('cancelled') ||
      currentStg.includes('declined') ||
      Boolean(b.isCancelled) ||
      Boolean(b.isDeclined)
    );
  };

  const isDeliveredOrCompleted = (b) => {
    if (isCancelledOrDeclined(b)) return false;
    const st = (b.status || '').toLowerCase();
    return st === 'completed' || st === 'delivered' || Boolean(b.isDelivered);
  };

  const isCurrentActive = (b) => {
    return !isCancelledOrDeclined(b) && !isDeliveredOrCompleted(b);
  };

  // Helper for 24-hour expiration calculation
  const getRemainingProposalTime = (expiresAt) => {
    if (!expiresAt) return { isExpired: false, label: '24h remaining' };
    const expTime = new Date(expiresAt).getTime();
    const diff = expTime - now;
    if (diff <= 0) return { isExpired: true, label: 'Window Expired' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { isExpired: false, label: `${hours}h ${mins}m left to confirm` };
  };

  // Categorized booking lists
  const ongoingBookings = bookings.filter(isCurrentActive);
  const deliveredBookings = bookings.filter(isDeliveredOrCompleted);
  const cancelledBookings = bookings.filter(isCancelledOrDeclined);

  // Calculations for KPI Metric Cards
  const activeInBayCount = ongoingBookings.filter(b => {
    const st = (b.status || '').toLowerCase();
    return st === 'inprogress' || st === 'confirmed' || st === 'ready';
  }).length;

  const pendingDecisionCount = ongoingBookings.filter(b => {
    const st = (b.status || '').toLowerCase();
    return st === 'pending' || st === 'proposed_changes';
  }).length;

  const totalServicedCount = deliveredBookings.length;
  const totalCancelledCount = cancelledBookings.length;

  const hasValidPhone = userProfile?.phone && validateIndianPhoneNumber(userProfile.phone);

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-16 px-4 sm:px-6 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-7">

        {/* ─── 1. TOP HERO HEADER ─── */}
        <div className="glass-panel border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-white/[0.03] via-transparent to-transparent">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold">
                <ShieldCheck size={13} /> Authenticated Customer Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b7791f]">{userProfile?.name || currentUser?.displayName || 'Customer'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Securely track ongoing vehicle services, manager slot confirmations, and maintenance history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                setPhoneError('');
                setIsPhoneModalOpen(true);
              }}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Change your registered 10-digit mobile number"
            >
              <Phone size={14} className="text-amber-400" />
              <span>{userProfile?.phone || currentUser?.phone ? 'Change Mobile' : 'Add Mobile'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut size={14} /> Exit
            </button>
          </div>
        </div>

        {/* ─── 2. PHONE VALIDATION ALERT BANNER ─── */}
        {!hasValidPhone && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-300">Action Required: Validate Mobile Number</h3>
                <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                  Provide your 10-digit mobile number to receive live bay notifications, mechanic quotes, and instant WhatsApp invoices.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setPhoneError('');
                setIsPhoneModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer shrink-0"
            >
              Verify Mobile Number 📱
            </button>
          </div>
        )}

        {/* ─── LIVE COLOR PSYCHOLOGY ALERTS ─── */}
        <CustomerAlertBanner onBookingUpdated={fetchData} />

        {/* ─── 3. 4 KPI METRIC CARDS ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('current')}
            className={`glass-card p-5 rounded-2xl border transition-all cursor-pointer ${activeTab === 'current' ? 'border-accent bg-accent/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]' : 'border-white/10 hover:border-accent/40'}`}
          >
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Activity size={16} className="text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider">Active In Bay</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-accent">{activeInBayCount}</p>
          </div>

          <div 
            onClick={() => setActiveTab('current')}
            className="glass-card p-5 rounded-2xl border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Clock size={16} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Pending Decision</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-300">{pendingDecisionCount}</p>
          </div>

          <div 
            onClick={() => setActiveTab('delivered')}
            className={`glass-card p-5 rounded-2xl border transition-all cursor-pointer ${activeTab === 'delivered' ? 'border-emerald-500/60 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-white/10 hover:border-emerald-500/40'}`}
          >
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <History size={16} className="text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Delivered</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">{totalServicedCount}</p>
          </div>

          <div 
            onClick={() => setActiveTab('cancelled')}
            className={`glass-card p-5 rounded-2xl border transition-all cursor-pointer ${activeTab === 'cancelled' ? 'border-rose-500/60 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'border-white/10 hover:border-rose-500/40'}`}
          >
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Ban size={16} className="text-rose-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Cancelled / Declined</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-400">{totalCancelledCount}</p>
          </div>
        </div>

        {/* ─── 4. TABS NAVIGATION BAR ─── */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'current'
                ? 'bg-accent text-slate-950 shadow-md shadow-accent/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench size={14} />
            <span>Current Requests</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'current' ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-gray-300'
            }`}>
              {ongoingBookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('delivered')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'delivered'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle size={14} />
            <span>Delivered</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'delivered' ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-gray-300'
            }`}>
              {deliveredBookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cancelled'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Ban size={14} />
            <span>Cancelled & Declined</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'cancelled' ? 'bg-black/30 text-white' : 'bg-white/10 text-gray-300'
            }`}>
              {cancelledBookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={14} />
            <span>All Bookings</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'all' ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-gray-300'
            }`}>
              {bookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={14} />
            <span>My Feedback</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'reviews' ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-gray-300'
            }`}>
              {reviews.length}
            </span>
          </button>
        </div>

        {/* ─── 5. TAB CONTENT 1: CURRENT / ACTIVE REQUESTS ─── */}
        {(activeTab === 'current' || activeTab === 'all') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Wrench size={18} className="text-accent" /> Ongoing Services & Live Bay Sprints
              </h2>
              <span className="text-xs text-gray-400 font-mono font-bold">
                {ongoingBookings.length} active
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ongoingBookings.length === 0 ? (
              <div className="glass-panel border border-white/10 p-8 rounded-2xl text-center space-y-3">
                <Car size={36} className="text-gray-600 mx-auto" />
                <p className="text-sm font-bold text-white">No active vehicle services in progress</p>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Schedule an appointment with certified technicians for routine maintenance or repairs.
                </p>
                <Link
                  to="/discover"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-dark font-extrabold text-xs shadow-lg hover:bg-accent/90 cursor-pointer"
                >
                  <Car size={14} /> Explore Garages & Book
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {ongoingBookings.map(b => {
                  const statusCfg = STATUS_CONFIGS[b.status] || STATUS_CONFIGS.pending;
                  const isProposal = b.status === 'proposed_changes' || b.requestStatus === 'PROPOSAL_SENT';
                  const isPending = b.status === 'pending' || b.currentStage === 'Pending Approval';
                  const propTimeInfo = isProposal ? getRemainingProposalTime(b.confirmationExpiresAt) : null;
                  const progressPct = b.status === 'ready' ? 85 : b.status === 'inProgress' ? 65 : b.status === 'confirmed' ? 45 : statusCfg.progress || 20;
                  const isExpanded = expandedBookingId === b.id;
                  
                  // Cancellation rule: Once confirmed by garage (inProgress, inBay, ready, etc.), only garage owner can cancel
                  const isConfirmedByGarage = b.status === 'confirmed' || b.status === 'inProgress' || b.status === 'ready' || b.status === 'completed' || b.status === 'delivered';
                  const garageContactPhone = b.garagePhone || '9876543210';
                  const garageContactWa = b.garageWhatsapp || garageContactPhone;

                  return (
                    <div
                      key={b.id}
                      className={`glass-card rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isProposal
                          ? 'border-sky-400/60 bg-sky-950/20 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                          : isPending
                          ? 'border-amber-500/40 bg-amber-950/10'
                          : 'border-white/10 hover:border-white/20 bg-slate-950/40'
                      }`}
                    >
                      <div className="p-5 sm:p-6 space-y-4">
                        
                        {/* Status Alert Banner for this specific request */}
                        {isPending && (
                          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              <span><strong>Awaiting Garage Confirmation:</strong> Request sent to {b.garageName || 'the garage'}. Manager will review availability.</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                              PENDING
                            </span>
                          </div>
                        )}

                        {b.status === 'inProgress' && (
                          <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs text-cyan-200">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                              <span><strong>Vehicle In Bay:</strong> Certified technicians are currently working on your vehicle at {b.garageName}.</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30 shrink-0">
                              IN BAY
                            </span>
                          </div>
                        )}

                        {b.status === 'ready' && (
                          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-200">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span><strong>Ready for Pickup:</strong> All services and QC inspections are finished! Ready for delivery handover.</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                              READY
                            </span>
                          </div>
                        )}

                        {/* Top Row: Vehicle Info & Stage Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {/* Car Icon Container */}
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Car size={22} className="text-accent" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-base sm:text-lg font-black text-white">
                                  {b.vehicle || b.vehicleModel || 'Vehicle'}
                                </h3>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.badge}`}>
                                  {b.currentStage || statusCfg.label}
                                </span>
                                {b.isUrgent && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                    <Flame size={10} /> Express Bay
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {b.service || b.serviceType || 'Full Service'} • <span className="font-mono uppercase text-gray-300 font-bold">{b.plateNumber || 'N/A'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Right: Date, ID, Chevron toggle */}
                          <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            <div className="text-left sm:text-right text-xs">
                              <p className="text-gray-400 flex items-center gap-1 sm:justify-end text-[11px]">
                                <Clock size={11} className="text-accent" /> {b.date || 'Scheduled'}
                              </p>
                              <p className="font-mono text-[11px] font-bold text-gray-300 truncate max-w-[140px]">
                                #{b.id?.slice(-8) || b.id}
                              </p>
                            </div>

                            <button
                              onClick={() => setExpandedBookingId(isExpanded ? null : b.id)}
                              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
                              title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                            >
                              <ChevronRight size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Live Stage Progress Bar */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-1.5 text-xs">
                            <span className="text-gray-400 text-[11px]">Live Stage Progress</span>
                            <span className="text-accent font-bold font-mono text-xs">{progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${progressPct}%`,
                                background: 'linear-gradient(90deg, #d4af37, #b7791f)'
                              }}
                            />
                          </div>
                        </div>

                        {/* 24-Hour Reschedule Confirmation Box */}
                        {isProposal && (
                          <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                                <h4 className="text-xs font-bold text-sky-300 uppercase">Manager Proposed Reschedule</h4>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-sky-400">
                                ⏳ {propTimeInfo?.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              Workshop Manager proposed: <strong>{b.proposedChanges?.date || b.proposedChanges?.newDate || b.managerProposal?.proposedDate}</strong> ({b.proposedChanges?.timeSlot || b.proposedChanges?.newTimeSlot || b.managerProposal?.proposedTime}) • Quote: <strong>₹{b.proposedChanges?.quote || b.proposedChanges?.newEstimatedCost || b.estimatedCost || 1500}</strong>
                            </p>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleAcceptProposal(b)}
                                disabled={acceptingProposalId === b.id}
                                className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer"
                              >
                                {acceptingProposalId === b.id ? 'Accepting...' : 'Accept Proposed Slot'}
                              </button>
                              <button
                                onClick={() => openCancelModal(b)}
                                className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
                              >
                                Decline Slot
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Expandable Details Drawer */}
                        {isExpanded && (
                          <div className="pt-4 border-t border-white/10 space-y-4 animate-fade-in text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-gray-500 uppercase text-[10px] font-bold block">Service Center</span>
                                <span className="font-bold text-white text-sm mt-0.5 block">{b.garageName || 'Workshop'}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-gray-500 uppercase text-[10px] font-bold block">Expected Turnaround</span>
                                <span className="font-bold text-accent text-sm mt-0.5 block">{b.expectedDuration || b.expectedTurnaround || 'Same Day (2 - 4 Hours)'}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-gray-500 uppercase text-[10px] font-bold block">Billing & Estimate</span>
                                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                                  {b.billing?.total ? `₹${b.billing.total.toLocaleString('en-IN')}` : b.estimatedCost ? `₹${Number(b.estimatedCost).toLocaleString('en-IN')} (Expected)` : 'Bill at Delivery (Spare Parts)'}
                                </span>
                              </div>
                            </div>

                            {/* Quick Notice about Delivery Billing */}
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400">
                              💡 <strong>Billing Policy:</strong> Garage owner will provide the final itemized tax bill upon delivery after testing & fitting all genuine spare parts and labor.
                            </div>

                            {/* Action Buttons with Call & WhatsApp to Garage Owner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {b.billing?.invoiceNumber && (
                                  <button
                                    onClick={() => {
                                      setViewBillBooking(b);
                                      setIsBillModalOpen(true);
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Receipt size={13} /> View Invoice Bill
                                  </button>
                                )}

                                {/* Call Garage Owner */}
                                <a
                                  href={`tel:${garageContactPhone}`}
                                  className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                                >
                                  <Phone size={13} /> Call Garage
                                </a>

                                {/* Chat with Garage Owner on WhatsApp */}
                                <a
                                  href={`https://wa.me/${garageContactWa.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello! Regarding my booking for ${b.vehicle || b.vehicleModel} (${b.plateNumber || ''}) on VahanSangam (Booking ID: ${b.id}).`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                                >
                                  <MessageCircle size={13} /> Chat / WhatsApp
                                </a>

                                <Link
                                  to={`/garage/${b.garageId || 'workshop'}`}
                                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold flex items-center gap-1"
                                >
                                  Workshop Profile <ChevronRight size={13} />
                                </Link>
                              </div>

                              {/* Cancellation Control: Allowed for customer before bay confirmation */}
                              {isConfirmedByGarage ? (
                                <span
                                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[11px] font-medium flex items-center gap-1"
                                  title="Slot is confirmed in the active bay. Please call or chat with the garage owner for any cancellation requests."
                                >
                                  🔒 Confirmed in Bay (Call to Cancel)
                                </span>
                              ) : (
                                <button
                                  onClick={() => openCancelModal(b)}
                                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                                >
                                  Cancel Request
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── 6. TAB CONTENT 2: DELIVERED HISTORY & SEALED REPORTS ─── */}
        {(activeTab === 'delivered' || activeTab === 'all') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-400" /> Delivered History & Sealed Reports
              </h2>
              <span className="text-xs text-gray-400 font-mono font-bold">
                {deliveredBookings.length} completed
              </span>
            </div>

            {deliveredBookings.length === 0 ? (
              <div className="glass-panel border border-white/10 p-6 rounded-2xl text-center">
                <p className="text-gray-400 text-xs">No delivered services recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveredBookings.map(b => (
                  <div
                    key={b.id}
                    className="glass-card p-5 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{b.vehicle || b.vehicleModel}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Delivered & Sealed
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {b.service || b.serviceType} • <span className="font-mono text-gray-300">{b.plateNumber || 'N/A'}</span> • Workshop: <strong className="text-gray-300">{b.garageName || 'Workshop'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setViewBillBooking(b);
                          setIsBillModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 cursor-pointer"
                      >
                        <Receipt size={13} className="text-emerald-400" /> Bill & Report
                      </button>
                      <button
                        onClick={() => handleOpenReviewModal(b)}
                        className="px-3.5 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-xs font-bold flex items-center gap-1.5 border border-accent/30 cursor-pointer"
                      >
                        <Star size={13} /> Give Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── 7. TAB CONTENT 3: CANCELLED & DECLINED REQUESTS (MENTIONED BY WHOM) ─── */}
        {(activeTab === 'cancelled' || activeTab === 'all') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Ban size={18} className="text-rose-400" /> Cancelled & Declined Requests
              </h2>
              <span className="text-xs text-rose-400 font-mono font-bold">
                {cancelledBookings.length} records
              </span>
            </div>

            {cancelledBookings.length === 0 ? (
              <div className="glass-panel border border-white/10 p-6 rounded-2xl text-center">
                <p className="text-gray-400 text-xs">No cancelled or declined requests recorded.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cancelledBookings.map(b => {
                  const isCancelledByCustomer = b.cancelledBy === 'customer' || b.declinedByRole === 'customer';
                  const isAutoExpired = b.declinedBy?.includes('System') || b.status === 'Failed / Expired';
                  const byWhomLabel = isCancelledByCustomer
                    ? `👤 Cancelled by You (${b.cancelledByName || userProfile?.name || currentUser?.displayName || 'Customer'})`
                    : isAutoExpired
                    ? '⏱️ Auto-Expired (24h Confirmation Window Elapsed)'
                    : `🏢 Declined by Workshop Manager (${b.garageName || 'Garage Manager'})`;

                  const actionDate = b.cancelledAt 
                    ? new Date(b.cancelledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : b.declinedAt
                    ? new Date(b.declinedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Recently';

                  return (
                    <div
                      key={b.id}
                      className="glass-card rounded-2xl border border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50 transition-all p-5 sm:p-6 space-y-4 shadow-lg shadow-rose-950/20"
                    >
                      {/* Top Vehicle & Status Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                            <Ban size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-white">{b.vehicle || b.vehicleModel || 'Vehicle'}</h3>
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                {b.status === 'cancelled' || b.isCancelled ? 'CANCELLED' : 'DECLINED'}
                              </span>
                              <span className="text-[11px] font-mono uppercase text-gray-400 font-bold">
                                {b.plateNumber || 'N/A'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {b.service || b.serviceType || 'General Service'} • Workshop: <strong className="text-gray-300">{b.garageName || 'Workshop'}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Booking Reference */}
                        <div className="text-left sm:text-right text-xs">
                          <p className="text-gray-400 text-[11px]">Requested Schedule:</p>
                          <p className="font-semibold text-gray-300">{b.date} ({b.timeSlot || b.time || 'Preferred Slot'})</p>
                          <p className="font-mono text-[10px] text-gray-500 mt-0.5">ID: #{b.id?.slice(-8) || b.id}</p>
                        </div>
                      </div>

                      {/* Explicit By-Whom & Reason Alert Block */}
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                              {byWhomLabel}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {actionDate}
                          </span>
                        </div>

                        <p className="text-xs text-rose-200/90 leading-relaxed pl-3 border-l-2 border-rose-500/40">
                          <strong>Remarks:</strong> "{b.cancellationReason || b.declineReason || b.failReason || 'Request was cancelled/declined.'}"
                        </p>
                      </div>

                      {/* Bottom Action: Re-Book Service */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-3">
                        <span className="text-[11px] text-gray-400">
                          Need this service? You can book another preferred date or choose an alternate workshop.
                        </span>
                        <Link
                          to={`/book-service?garageId=${b.garageId || ''}`}
                          className="px-4 py-2 rounded-xl bg-accent text-slate-950 font-bold text-xs hover:bg-accent/90 transition-all flex items-center gap-1.5 shadow-md shadow-accent/20 cursor-pointer"
                        >
                          <RefreshCw size={13} /> Re-Book Service
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── 8. TAB CONTENT 4: MY FEEDBACK & REVIEWS GIVEN ─── */}
        {(activeTab === 'reviews' || activeTab === 'all') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-accent" /> My Feedback & Reviews Given ({reviews.length})
              </h2>
            </div>

            {reviews.length === 0 ? (
              <div className="glass-panel border border-white/10 p-6 rounded-2xl text-center">
                <p className="text-gray-400 text-xs">You haven't submitted any reviews yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reviews.map(r => (
                  <div key={r.id} className="glass-card p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{r.garageName}</span>
                      <div className="flex gap-1 text-amber-400">
                        {[...Array(r.rating || 5)].map((_, i) => (
                          <Star key={i} size={12} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-300 italic">"{r.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── MODAL A: PHONE NUMBER VALIDATION MODAL ─── */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-amber-500/40 w-full max-w-md shadow-2xl p-6 sm:p-7 relative">
            <button onClick={() => setIsPhoneModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white cursor-pointer">✕</button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Phone size={18} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Validate Mobile Number</h3>
                <p className="text-xs text-slate-400">Indian 10-digit phone verification</p>
              </div>
            </div>

            <form onSubmit={handleValidateAndSavePhone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Number (India) <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center bg-black/40 border border-slate-700 rounded-xl overflow-hidden focus-within:border-accent">
                  <span className="px-3.5 py-2.5 bg-slate-900 border-r border-slate-700 text-xs font-bold text-amber-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phoneInput}
                    onChange={e => {
                      setPhoneError('');
                      setPhoneInput(e.target.value.replace(/\D/g, ''));
                    }}
                    className="w-full px-3.5 py-2.5 bg-transparent text-white text-sm font-mono font-bold outline-none placeholder:text-slate-600"
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] text-rose-400 mt-1">{phoneError}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Must be 10 digits starting with 6, 7, 8, or 9.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPhone || !phoneInput}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPhone ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={15} />}
                  <span>Validate & Save Phone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL B: CELEBRATORY DELIVERY & OFFICIAL BILL MODAL ─── */}
      {isBillModalOpen && viewBillBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:static">
          <div className="rounded-3xl bg-[#0B0F17] border border-emerald-500/40 w-full max-w-2xl shadow-[0_0_50px_rgba(16,185,129,0.2)] p-6 sm:p-7 max-h-[90vh] overflow-y-auto relative print:border-none print:shadow-none print:p-6 print:bg-white print:text-black">
            
            {/* Top Close & Print Controls */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 print:hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={14} /> Service Completed & Delivered
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
                >
                  <Printer size={13} /> Print / Save PDF
                </button>
                <button onClick={() => setIsBillModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer">✕</button>
              </div>
            </div>

            {/* Celebratory Banner */}
            <div className="text-center mb-6 print:hidden">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 mb-3 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={36} className="text-emerald-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Your Vehicle is Ready & Delivered!
              </h2>
              <p className="text-xs text-gray-300 mt-1 max-w-md mx-auto leading-relaxed">
                Thank you for choosing <strong className="text-white">{viewBillBooking.garageName || 'Our Workshop'}</strong>! We appreciate your visit and hope you have a safe and smooth drive ahead. 🚗✨
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Workshop & Client Info Header */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-white print:border-b-2 print:border-black">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3 print:border-black">
                  <div>
                    <h3 className="text-base font-black text-white print:text-black">{viewBillBooking.garageName || 'VahanSangam Workshop'}</h3>
                    <p className="text-xs text-gray-400 print:text-gray-600">{viewBillBooking.garageAddress || viewBillBooking.location?.city || 'Certified Service Bay'}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Tax Invoice No.</span>
                    <span className="font-mono font-black text-emerald-400 text-sm print:text-black">{viewBillBooking.billing?.invoiceNumber || `INV-${viewBillBooking.id?.slice(-8)}`}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Customer</span>
                    <span className="font-bold text-white print:text-black">{viewBillBooking.customerName || viewBillBooking.userName || 'Valued Client'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Vehicle Details</span>
                    <span className="font-bold text-white print:text-black">{viewBillBooking.vehicle || viewBillBooking.vehicleModel}</span>
                    <span className="font-mono text-accent font-bold text-[11px] block">{viewBillBooking.plateNumber || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Delivery Status</span>
                    <span className="font-bold text-emerald-400 text-xs">✅ Delivered & QC Passed</span>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden print:border-gray-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 print:bg-gray-100 text-slate-400 print:text-black uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Item Particulars & Scope</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                    {(viewBillBooking.billing?.items || [{ name: viewBillBooking.service || 'Vehicle Service & Diagnostic', price: viewBillBooking.billing?.total || viewBillBooking.estimatedCost || 1500, qty: 1 }]).map((it, idx) => (
                      <tr key={idx} className="bg-slate-950/40">
                        <td className="py-2.5 px-3 text-white print:text-black font-medium">{it.name}</td>
                        <td className="py-2.5 px-3 text-center text-gray-400 print:text-black font-mono">{it.qty || 1}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white print:text-black">₹{((Number(it.price) || 0) * (Number(it.qty) || 1)).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {viewBillBooking.isUrgent && (
                      <tr className="text-amber-400 print:text-black bg-amber-500/5">
                        <td className="py-2 px-3 flex items-center gap-1"><Flame size={12} /> Urgent Express Bay Priority</td>
                        <td className="py-2 px-3 text-center font-mono">1</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">+₹{(viewBillBooking.urgentSurcharge || viewBillBooking.billing?.urgentSurcharge || 500).toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    {Number(viewBillBooking.billing?.discount || 0) > 0 && (
                      <tr className="text-emerald-400 print:text-black bg-emerald-500/5">
                        <td className="py-2 px-3">Promotional Discount Applied</td>
                        <td className="py-2 px-3 text-center font-mono">—</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">-₹{Number(viewBillBooking.billing?.discount).toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Bar */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center print:bg-white print:border-t-2 print:border-black">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase block">Final Amount Paid</span>
                  <span className="text-[11px] text-emerald-400 font-medium">All parts, labour & genuine fitments included</span>
                </div>
                <span className="text-2xl font-mono font-black text-emerald-400 print:text-black">₹{(viewBillBooking.billing?.total || viewBillBooking.estimatedCost || 1500).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-4 mt-2 print:hidden">
              <button
                onClick={() => {
                  const message = `Thanks for the excellent service on my ${viewBillBooking.vehicle || viewBillBooking.vehicleModel} (${viewBillBooking.plateNumber || ''}) at ${viewBillBooking.garageName || 'workshop'}! Total bill: ₹${(viewBillBooking.billing?.total || viewBillBooking.estimatedCost || 1500).toLocaleString('en-IN')}.`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageCircle size={14} /> Share on WhatsApp
              </button>

              <button
                onClick={() => {
                  setIsBillModalOpen(false);
                  handleOpenReviewModal(viewBillBooking);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-accent text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-accent/20 cursor-pointer"
              >
                <Star size={14} /> Leave Workshop Review
              </button>

              <button
                onClick={() => setIsBillModalOpen(false)}
                className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL C: CANCEL REQUEST MODAL ─── */}
      {cancelModalOpen && selectedBookingForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-rose-500/40 w-full max-w-md shadow-2xl p-6 relative">
            <button onClick={() => setCancelModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white cursor-pointer">✕</button>

            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">✕</div>
              <div>
                <h3 className="text-lg font-black text-white">Cancel Service Request</h3>
                <p className="text-xs text-slate-400">Release technician bay slot</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for cancellation</label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Change of schedule, service no longer needed..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setCancelModalOpen(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold cursor-pointer">
                  Keep Booking
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={isSubmittingCancel}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCancel ? <Loader2 size={14} className="animate-spin" /> : <span>Confirm Cancellation</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL D: GIVE REVIEW MODAL ─── */}
      {reviewBookingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-amber-500/40 w-full max-w-md shadow-2xl p-6 relative">
            <button onClick={() => setReviewBookingItem(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white cursor-pointer">✕</button>

            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Star size={18} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Rate & Review Workshop</h3>
                <p className="text-xs text-slate-400">{reviewBookingItem.garageName}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Rating (1 to 5 Stars)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`p-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        reviewRating >= star
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Comment / Feedback</label>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Describe your service experience, mechanic professionalism..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setReviewBookingItem(null)} className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-slate-950 font-black text-xs shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Post Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
