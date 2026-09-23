import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Car, History, Clock, ChevronRight, Activity, Wrench, CheckCircle, ShieldCheck, LogOut, PlusCircle, Lock, Flame } from 'lucide-react';
import { STATUS_FLOW } from '../data/dummyData';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';

export default function MyGarage() {
  const { currentUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!currentUser?.uid) return;
      try {
        setLoading(true);
        const bookingQuery = query(collection(db, 'bookings'), where('customerId', '==', currentUser.uid));
        const bookingSnap = await getDocs(bookingQuery);
        setBookings(bookingSnap.docs.map(doc => ({ bookingId: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Failed to load user bookings:', err);
        addToast('Error fetching your garage bookings.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser, addToast]);

  const handleLogout = () => {
    logout();
    addToast('Signed out of My Garage.', 'info');
    navigate('/');
  };

  const pendingBookings = bookings.filter(b => (b.status === 'Pending Approval' || b.status === 'Reschedule Proposed') && !b.isDelivered && b.status !== 'Delivered' && b.status !== 'Declined' && !b.isDeclined);
  const activeBookings = bookings.filter(b => b.status !== 'Delivered' && !b.isDelivered && b.status !== 'Failed / Expired' && b.status !== 'Declined' && !b.isDeclined && b.status !== 'Pending Approval' && b.status !== 'Reschedule Proposed');
  const completedBookings = bookings.filter(b => b.status === 'Delivered' || b.isDelivered);
  const failedBookings = bookings.filter(b => b.status === 'Declined' || b.isDeclined || b.status === 'Failed / Expired' || b.requestStatus === 'DECLINED' || b.requestStatus === 'EXPIRED');

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending Approval': return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'Reschedule Proposed': return 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]';
      case 'Declined': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Failed / Expired': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'Booked': return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'Received': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Inspecting': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Servicing': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Washing': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'Ready': return 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30';
      case 'Delivered': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  const getStatusProgress = (status) => {
    const idx = STATUS_FLOW.indexOf(status);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / STATUS_FLOW.length) * 100);
  };

  const BookingCard = ({ b }) => {
    const isPending = (b.status === 'Pending Approval' || b.requestStatus === 'PENDING_APPROVAL') && b.status !== 'Declined';
    const isReschedule = (b.status === 'Reschedule Proposed' || b.requestStatus === 'PROPOSAL_SENT') && b.status !== 'Declined';
    const isDeclined = b.status === 'Declined' || b.isDeclined || b.requestStatus === 'DECLINED';
    const isFailed = isDeclined || b.status === 'Failed / Expired' || b.requestStatus === 'EXPIRED';

    return (
      <Link 
        key={b.bookingId} 
        to={`/booking/${b.bookingId}`}
        className={`block glass-card rounded-2xl border transition-all duration-300 group overflow-hidden shadow-lg ${
          isReschedule 
            ? 'border-sky-400/60 bg-sky-950/20 hover:border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
            : isPending
            ? 'border-amber-400/50 bg-amber-950/10 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
            : isFailed
            ? 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50 opacity-85'
            : 'border-white/10 hover:border-accent/50 hover:shadow-accent/10'
        }`}
      >
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group-hover:border-accent/40 transition-colors shrink-0">
                <Car size={22} className={isFailed ? 'text-rose-400' : isPending ? 'text-amber-400' : isReschedule ? 'text-sky-400' : 'text-accent'} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors">{b.vehicleModel}</h3>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${getStatusColor(b.status)}`}>
                    {b.status}
                  </span>
                  {isDeclined && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400 text-rose-300 font-bold">
                      ⛔ Declined by {b.declinedByName || (b.declinedBy ? b.declinedBy.split('(')[0].trim() : 'Participant')}
                    </span>
                  )}
                  {isReschedule && !isDeclined && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400 text-sky-300 font-bold animate-pulse">
                      ⚠️ Response Required (24h)
                    </span>
                  )}
                  {isPending && !isDeclined && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-bold">
                      ⏳ Awaiting Manager
                    </span>
                  )}
                  {b.deadline && b.status !== 'Delivered' && !isFailed && !isPending && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold">
                      ⚡ ETA Set
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {b.serviceType} • <span className="uppercase font-mono text-gray-300 font-semibold">{b.plateNumber || 'N/A'}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
              <div className="text-left md:text-right">
                <p className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1 md:justify-end">
                  <Clock size={12} /> {b.preferredDate}
                </p>
                <p className="text-xs font-mono font-bold text-gray-300">{b.bookingId}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#050505] group-hover:bg-accent transition-all shrink-0">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          {b.status !== 'Delivered' && !isFailed && !isPending && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-gray-400">Live Stage Progress</span>
                <span className="text-xs text-accent font-bold font-mono">{getStatusProgress(b.status)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700"
                  style={{ 
                    width: `${getStatusProgress(b.status)}%`,
                    background: 'linear-gradient(90deg, #d4af37, #b7791f)' 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-16 animate-fade-in text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Hero */}
        <div className="glass-panel border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold">
                <ShieldCheck size={14} /> Authenticated Customer Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-[#b7791f]">{currentUser?.name || 'Customer'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Securely track ongoing vehicle services, manager slot confirmations, and maintenance history.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleLogout}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 flex items-center gap-1.5 transition-all"
            >
              <LogOut size={14} /> Exit
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-white/10 hover:border-accent/40 transition-all">
            <div className="flex items-center gap-2 text-gray-400 mb-2"><Activity size={16} className="text-accent" /> <span className="text-xs font-semibold uppercase tracking-wider">Active In Bay</span></div>
            <p className="text-2xl sm:text-3xl font-extrabold text-accent">{activeBookings.length}</p>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-white/10 hover:border-accent/40 transition-all">
            <div className="flex items-center gap-2 text-gray-400 mb-2"><Clock size={16} className="text-amber-400" /> <span className="text-xs font-semibold uppercase tracking-wider">Pending Decision</span></div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-300">{pendingBookings.length}</p>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-white/10 hover:border-accent/40 transition-all">
            <div className="flex items-center gap-2 text-gray-400 mb-2"><History size={16} className="text-gray-400" /> <span className="text-xs font-semibold uppercase tracking-wider">Total Serviced</span></div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{completedBookings.length}</p>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-white/10 hover:border-accent/40 transition-all">
            <div className="flex items-center gap-2 text-gray-400 mb-2"><CalendarDays size={16} className="text-gray-400" /> <span className="text-xs font-semibold uppercase tracking-wider">Member Since</span></div>
            <p className="text-lg font-extrabold text-white">2026</p>
          </div>
        </div>

        {/* Pending Requests & Reschedule Proposals Section */}
        {pendingBookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-amber-400 animate-pulse" /> Pending Slot Confirmation & Reschedule Proposals
            </h2>
            <div className="space-y-3">
              {pendingBookings.map((b) => <BookingCard key={b.bookingId} b={b} />)}
            </div>
          </div>
        )}

        {/* Active Bookings Section */}
        {activeBookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wrench size={18} className="text-accent" /> Ongoing Services & Live Sprints
            </h2>
            <div className="space-y-3">
              {activeBookings.map((b) => <BookingCard key={b.bookingId} b={b} />)}
            </div>
          </div>
        )}

        {/* Completed Bookings Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-400" /> Delivered History & Sealed Reports
          </h2>
          <div className="space-y-3">
            {completedBookings.length === 0 ? (
              <div className="glass-panel border border-white/10 p-10 rounded-2xl text-center">
                <p className="text-gray-400 text-sm">No delivered bookings yet.</p>
              </div>
            ) : (
              completedBookings.map((b) => <BookingCard key={b.bookingId} b={b} />)
            )}
          </div>
        </div>

        {/* Failed / Expired Bookings Archive */}
        {failedBookings.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h2 className="text-base font-bold text-rose-300 flex items-center gap-2">
              <Lock size={16} className="text-rose-400" /> Failed & Expired Transactions Archive
            </h2>
            <p className="text-xs text-gray-400">
              Requests where the 24-hour response window expired or timing was declined. All data remains recorded.
            </p>
            <div className="space-y-3">
              {failedBookings.map((b) => <BookingCard key={b.bookingId} b={b} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
