import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, CheckCircle2, Clock, XCircle, AlertTriangle, ChevronRight, 
  Car, Sparkles, MapPin, Check, X, ShieldAlert, ArrowRight, Wrench, ShieldCheck
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastNotification';

export default function CustomerAlertBanner({ onBookingUpdated }) {
  const { currentUser, isAuthenticated, isGarageOwner } = useAuth();
  const { addToast } = useToast();

  const [activeBookings, setActiveBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    if (isAuthenticated && currentUser && !isGarageOwner) {
      fetchCustomerActiveBookings();
    } else {
      setActiveBookings([]);
      setLoading(false);
    }
  }, [isAuthenticated, currentUser, isGarageOwner]);

  const fetchCustomerActiveBookings = async () => {
    try {
      setLoading(true);
      const q1 = query(collection(db, 'bookings'), where('userId', '==', currentUser.uid));
      const snap1 = await getDocs(q1);
      let list = snap1.docs.map(d => ({ id: d.id, bookingId: d.id, ...d.data() }));

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

      // Filter to active/relevant statuses
      const relevant = list.filter(b => {
        const st = (b.status || '').toLowerCase();
        const reqSt = (b.requestStatus || '').toUpperCase();
        return !b.isDelivered && st !== 'delivered' && st !== 'completed' && st !== 'cancelled' && st !== 'declined' && reqSt !== 'DECLINED';
      });

      // Sort with highest priority first: proposals requiring OK/Decline first, then pending, then in-progress
      relevant.sort((a, b) => {
        const aHasProposal = Boolean(a.managerProposal || a.proposedChanges || a.status === 'Reschedule Proposed' || a.requestStatus === 'PROPOSAL_SENT');
        const bHasProposal = Boolean(b.managerProposal || b.proposedChanges || b.status === 'Reschedule Proposed' || b.requestStatus === 'PROPOSAL_SENT');
        if (aHasProposal && !bHasProposal) return -1;
        if (!aHasProposal && bHasProposal) return 1;
        return 0;
      });

      setActiveBookings(relevant);
    } catch (err) {
      console.error('Error fetching customer alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── 1-CLICK OK / ACCEPT PROPOSAL ───
  const handleAcceptProposal = async (booking) => {
    setActionLoadingId(booking.id);
    try {
      const prop = booking.managerProposal || booking.proposedChanges || {};
      const newDate = prop.proposedDate || prop.date || prop.newDate || booking.date;
      const newTime = prop.proposedTime || prop.timeSlot || prop.newTimeSlot || booking.timeSlot;

      const updatePayload = {
        status: 'inProgress',
        currentStage: 'In Bay',
        requestStatus: 'CONFIRMED',
        date: newDate,
        timeSlot: newTime,
        preferredDate: newDate,
        preferredTime: newTime,
        proposalAcceptedAt: new Date().toISOString(),
        customerConfirmedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'bookings', booking.id), updatePayload);

      try {
        await addDoc(collection(db, 'bookingStatusLogs'), {
          bookingId: booking.id,
          status: 'Confirmed',
          updatedBy: currentUser?.uid || 'customer',
          updaterName: currentUser?.displayName || 'Customer',
          note: `Customer accepted garage proposal for ${newDate} at ${newTime}. Slot locked!`,
          createdAt: serverTimestamp()
        });
      } catch (logErr) {
        console.warn('Log save warning:', logErr);
      }

      addToast('🎉 Slot confirmed! Your vehicle is booked with the garage.', 'success');
      fetchCustomerActiveBookings();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      console.error('Error accepting proposal:', err);
      addToast('Failed to accept proposal. Please try again.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── 1-CLICK DECLINE PROPOSAL / CANCEL ───
  const handleDeclineProposal = async (booking) => {
    if (!window.confirm('Are you sure you want to decline this garage reply/proposal? This will close the service request.')) {
      return;
    }

    setActionLoadingId(booking.id);
    try {
      const updatePayload = {
        status: 'declined',
        currentStage: 'Declined',
        requestStatus: 'DECLINED',
        isDeclined: true,
        declinedBy: currentUser?.displayName ? `${currentUser.displayName} (Customer)` : 'Customer',
        declinedByName: currentUser?.displayName || 'Customer',
        declinedByRole: 'customer',
        declinedAt: new Date().toISOString(),
        declineReason: 'Customer declined garage proposed schedule.',
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'bookings', booking.id), updatePayload);

      try {
        await addDoc(collection(db, 'bookingStatusLogs'), {
          bookingId: booking.id,
          status: 'Declined',
          updatedBy: currentUser?.uid || 'customer',
          updaterName: currentUser?.displayName || 'Customer',
          note: 'Customer declined the proposed timing/quote.',
          createdAt: serverTimestamp()
        });
      } catch (logErr) {
        console.warn('Log save warning:', logErr);
      }

      addToast('Request declined and closed.', 'info');
      fetchCustomerActiveBookings();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      console.error('Error declining proposal:', err);
      addToast('Failed to decline request. Please try again.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isAuthenticated || isGarageOwner || activeBookings.length === 0) {
    return null;
  }

  // Top urgent alert
  const topAlert = activeBookings[0];
  const hasProposal = Boolean(topAlert.managerProposal || topAlert.proposedChanges || topAlert.status === 'Reschedule Proposed' || topAlert.requestStatus === 'PROPOSAL_SENT');
  const isPendingApproval = topAlert.status === 'pending' && !hasProposal;
  const isInBay = topAlert.status === 'inProgress' || topAlert.status === 'confirmed' || topAlert.status === 'Booked';

  const proposal = topAlert.managerProposal || topAlert.proposedChanges || {};

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-8 animate-fade-in">
      {/* ─── SCENARIO 1: GARAGE REPLIED WITH PROPOSAL (COLOR: ELECTRIC AMBER / SKY PULSE) ─── */}
      {hasProposal && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/25 via-[#1a1405] to-[#0d0d0d] p-5 sm:p-6 shadow-[0_0_35px_rgba(245,158,11,0.25)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            
            {/* Left Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-wider shadow-md animate-pulse">
                  ⚡ Reply Received from Garage
                </span>
                <span className="text-xs text-amber-300 font-bold">
                  {topAlert.garageName}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Slot Proposal: {proposal.proposedDate || proposal.date || topAlert.date} at {proposal.proposedTime || proposal.timeSlot || topAlert.timeSlot}
              </h2>

              <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
                The garage manager has reviewed your vehicle (<span className="text-white font-bold">{topAlert.vehicle || topAlert.plateNumber}</span>) and proposed this confirmed bay slot. Please respond with <span className="text-emerald-400 font-bold">OK</span> to lock it or <span className="text-rose-400 font-bold">Decline</span>.
              </p>

              {proposal.note && (
                <div className="px-3.5 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-amber-200 inline-block font-medium">
                  💬 Manager Note: "{proposal.note}"
                </div>
              )}
            </div>

            {/* Right Action Buttons: OK vs DECLINE */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => handleAcceptProposal(topAlert)}
                disabled={actionLoadingId === topAlert.id}
                className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Check size={18} strokeWidth={3} />
                <span>{actionLoadingId === topAlert.id ? 'Confirming...' : 'OK / Accept Slot'}</span>
              </button>

              <button
                onClick={() => handleDeclineProposal(topAlert)}
                disabled={actionLoadingId === topAlert.id}
                className="flex-1 sm:flex-initial px-5 py-3.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <X size={17} strokeWidth={2.5} />
                <span>Decline</span>
              </button>

              <Link
                to={`/booking/${topAlert.id}`}
                className="px-3.5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-bold transition-all flex items-center justify-center"
                title="View Full Booking Details"
              >
                <ChevronRight size={16} />
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* ─── SCENARIO 2: REQUEST SENT & AWAITING GARAGE (COLOR: WARM GOLD / AMBER) ─── */}
      {isPendingApproval && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-white/[0.02] to-transparent p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Clock size={20} className="animate-spin" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                    ⏳ Request Sent — Awaiting Garage Review
                  </span>
                  <span className="text-[10px] text-gray-400">• {topAlert.garageName}</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {topAlert.service || 'Vehicle Service'} — {topAlert.vehicle || topAlert.plateNumber}
                </h3>
                <p className="text-xs text-gray-300">
                  Preferred Schedule: <span className="text-white font-medium">{topAlert.date}</span> at <span className="text-white font-medium">{topAlert.timeSlot || topAlert.time}</span>. You'll receive instant notification when the workshop confirms.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/my-account"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
              >
                View in Account <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── SCENARIO 3: IN BAY / CONFIRMED (COLOR: EMERALD GREEN) ─── */}
      {isInBay && !hasProposal && (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-white/[0.02] to-transparent p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck size={22} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    ✅ Confirmed & In Bay
                  </span>
                  <span className="text-[10px] text-gray-400">• {topAlert.garageName}</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {topAlert.vehicle || topAlert.plateNumber} — {topAlert.currentStage || 'Servicing in Progress'}
                </h3>
                <p className="text-xs text-gray-300">
                  Appointment: <span className="text-white font-medium">{topAlert.date}</span> ({topAlert.timeSlot || topAlert.time})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to={`/booking/${topAlert.id}`}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all hover:bg-emerald-400"
              >
                Track Live Bay <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
