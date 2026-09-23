import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Car, Calendar, Clock, CheckCircle, Circle, MessageSquare, Send, FileText, Wrench, Shield, Sparkles, Tag, CheckSquare, Flame, AlertTriangle, Lock, Printer, MessageCircle, XCircle } from 'lucide-react';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { STATUS_FLOW, services } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import InvoicePrintAndDispatchModal from '../components/InvoicePrintAndDispatchModal';

export default function BookingDetails() {
  const { id } = useParams();
  const { currentUser, userProfile, isGarageOwner, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalTab, setInvoiceModalTab] = useState('print');

  // 24-Hour Reactive Expiration Timer
  useEffect(() => {
    if (!booking?.proposalExpiresAt || (booking.status !== 'Reschedule Proposed' && booking.requestStatus !== 'PROPOSAL_SENT')) {
      setTimeLeft(null);
      return;
    }

    const checkAndCalculateTime = () => {
      const expiry = new Date(booking.proposalExpiresAt).getTime();
      const now = Date.now();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        // Auto expire if not already marked
        if (booking.status !== 'Declined' && booking.status !== 'Failed / Expired') {
          handleExpireBooking();
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    checkAndCalculateTime();
    const interval = setInterval(checkAndCalculateTime, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  const handleExpireBooking = async () => {
    if (!booking || booking.status === 'Declined' || booking.status === 'Failed / Expired') return;
    try {
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      const updatePayload = {
        status: 'Declined',
        requestStatus: 'DECLINED',
        isDeclined: true,
        declinedBy: 'AutoServe System (Expired 24h)',
        declinedByName: 'AutoServe System',
        declinedByRole: 'system',
        declinedAt: new Date().toISOString(),
        declineReason: '24-hour proposal confirmation window elapsed without response.',
        failReason: '24-hour proposal confirmation window elapsed without response.',
        expiredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await updateDoc(bookingRef, updatePayload);
      setBooking(prev => ({ ...prev, ...updatePayload }));
    } catch (err) {
      console.error('Error auto-expiring booking:', err);
    }
  };

  const handleAcceptProposal = async () => {
    if (!booking || !booking.managerProposal) return;
    try {
      setIsProcessingAction(true);
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      const { proposedDate, proposedTime, proposedDeadline } = booking.managerProposal;

      const updatePayload = {
        status: 'Booked',
        requestStatus: 'CONFIRMED',
        preferredDate: proposedDate || booking.preferredDate,
        preferredTime: proposedTime || booking.preferredTime,
        deadline: proposedDeadline || booking.deadline || '',
        slotConfirmedAt: new Date().toISOString(),
        proposalAcceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(bookingRef, updatePayload);

      const logData = {
        bookingId: booking.bookingId,
        status: 'Booked',
        updatedBy: currentUser?.uid || 'customer',
        updaterName: currentUser?.name || 'Customer',
        note: `Customer accepted manager's proposed timing: ${proposedDate} at ${proposedTime}. Booking officially confirmed!`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingStatusLogs'), logData);

      const confirmChat = {
        bookingId: id,
        senderId: currentUser?.uid || 'customer',
        senderName: currentUser?.name || 'Customer',
        senderRole: 'customer',
        message: `✅ I have accepted the proposed schedule for ${proposedDate} at ${proposedTime}. Thank you!`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingChats'), confirmChat);

      setBooking(prev => ({ ...prev, ...updatePayload }));
      setMessages(prev => [...prev, { ...confirmChat, id: `chat-${Date.now()}`, createdAt: new Date().toISOString() }]);
      addToast('Proposed timing accepted! Your booking is now confirmed.', 'success');
    } catch (err) {
      console.error('Failed to accept proposal:', err);
      addToast(`Error accepting proposal: ${err.message}`, 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeclineProposal = async () => {
    if (!booking) return;
    if (!window.confirm('Are you sure you want to decline this request? Once declined, this request will be permanently locked and closed.')) {
      return;
    }

    try {
      setIsProcessingAction(true);
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      const declineReason = 'Customer declined manager reschedule proposal.';
      const declinerLabel = currentUser?.name ? `${currentUser.name} (Customer)` : 'Customer';

      const updatePayload = {
        status: 'Declined',
        requestStatus: 'DECLINED',
        isDeclined: true,
        declinedBy: declinerLabel,
        declinedByName: currentUser?.name || 'Customer',
        declinedByRole: 'customer',
        declinedAt: new Date().toISOString(),
        declineReason: declineReason,
        failReason: declineReason,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(bookingRef, updatePayload);

      const logData = {
        bookingId: booking.bookingId,
        status: 'Declined',
        updatedBy: currentUser?.uid || 'customer',
        updaterName: currentUser?.name || 'Customer',
        note: `Request DECLINED by Customer (${declinerLabel}). Reason: ${declineReason}. Record is closed.`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingStatusLogs'), logData);

      const declineChat = {
        bookingId: id,
        senderId: currentUser?.uid || 'customer',
        senderName: currentUser?.name || 'Customer',
        senderRole: 'customer',
        message: `⛔ I have declined this booking request. Reason: ${declineReason}`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingChats'), declineChat);

      setBooking(prev => ({ ...prev, ...updatePayload }));
      setMessages(prev => [...prev, { ...declineChat, id: `chat-${Date.now()}`, createdAt: new Date().toISOString() }]);
      addToast('Booking request declined and permanently closed.', 'info');
    } catch (err) {
      console.error('Failed to decline proposal:', err);
      addToast(`Error declining request: ${err.message}`, 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let unsubscribeFirestore = null;

    async function loadBooking() {
      if (!id) return;
      try {
        setIsLoading(true);
        setIsForbidden(false);

        let resolvedDocId = id;
        let data = null;

        // 1. Direct getDoc by Document ID
        try {
          const bookingRef = doc(db, 'bookings', id);
          const bookingSnap = await getDoc(bookingRef);
          if (bookingSnap.exists()) {
            data = { id: bookingSnap.id, bookingId: bookingSnap.id, ...bookingSnap.data() };
            resolvedDocId = bookingSnap.id;
          }
        } catch (err) {
          console.warn('Direct doc fetch warning:', err);
        }

        // 2. Query by bookingId field
        if (!data) {
          try {
            const q1 = query(collection(db, 'bookings'), where('bookingId', '==', id));
            const snap1 = await getDocs(q1);
            if (!snap1.empty) {
              const d = snap1.docs[0];
              data = { id: d.id, bookingId: d.id, ...d.data() };
              resolvedDocId = d.id;
            }
          } catch (err) {
            console.warn('bookingId query warning:', err);
          }
        }

        // 3. Query by id field
        if (!data) {
          try {
            const q2 = query(collection(db, 'bookings'), where('id', '==', id));
            const snap2 = await getDocs(q2);
            if (!snap2.empty) {
              const d = snap2.docs[0];
              data = { id: d.id, bookingId: d.id, ...d.data() };
              resolvedDocId = d.id;
            }
          } catch (err) {
            console.warn('id query warning:', err);
          }
        }

        if (!data) {
          setBooking(null);
          setIsLoading(false);
          return;
        }

        setBooking(data);
        setIsLoading(false);

        // Realtime live status listener on the booking document
        try {
          unsubscribeFirestore = onSnapshot(doc(db, 'bookings', resolvedDocId), (docSnap) => {
            if (docSnap.exists()) {
              setBooking(prev => ({ ...prev, id: docSnap.id, bookingId: docSnap.id, ...docSnap.data() }));
            }
          }, (err) => {
            console.warn('Realtime booking track listener warning:', err);
          });
        } catch (subErr) {
          console.warn('Subscription error:', subErr);
        }

        // Fetch Chats
        try {
          const chatSnap = await getDocs(collection(db, 'bookingChats'));
          const chatItems = chatSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(item => item.bookingId === id || item.bookingId === resolvedDocId)
            .sort((a, b) => {
              const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
              const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
              return aTime - bTime;
            });
          setMessages(chatItems);
        } catch (chatErr) {
          console.warn('Chat load warning:', chatErr);
        }

        // Fetch Status Logs
        try {
          const statusSnap = await getDocs(collection(db, 'bookingStatusLogs'));
          const statusItems = statusSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(item => item.bookingId === id || item.bookingId === resolvedDocId)
            .sort((a, b) => {
              const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
              const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
              return aTime - bTime;
            });
          setStatusLogs(statusItems);
        } catch (logErr) {
          console.warn('Status logs load warning:', logErr);
        }

      } catch (error) {
        console.error('Failed to load booking details:', error);
        addToast(`Unable to load booking details: ${error.message}`, 'error');
        setBooking(null);
        setIsLoading(false);
      }
    }

    loadBooking();

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [id, addToast]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const senderIdentifier = currentUser?.uid || (booking?.customerId || 'guest-user');
    const senderName = currentUser?.name || 'Customer';
    const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'mechanic';

    const newMsg = {
      bookingId: id,
      senderId: senderIdentifier,
      senderName: senderName,
      senderRole: isStaff ? currentUser.role : 'customer',
      message: chatInput.trim(),
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'bookingChats'), newMsg);
      try {
        await set(push(ref(rtdb, 'bookingChats')), {
          ...newMsg,
          createdAt: new Date().toISOString()
        });
      } catch (rtdbError) {
        console.warn('Realtime Database chat mirror failed:', rtdbError);
      }
      setMessages(prev => [...prev, { id: docRef.id, ...newMsg, createdAt: new Date().toISOString() }]);
      setChatInput('');
      addToast('Message sent to service team.', 'success', 2000);
    } catch (error) {
      console.error('Chat save failed:', error);
      addToast(`Unable to send message: ${error.message}`, 'error');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm font-medium">Connecting to live vehicle tracking feed...</p>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="min-h-screen bg-[#050505] pt-32 flex items-center justify-center px-4">
        <div className="glass-panel p-8 rounded-3xl text-center max-w-md w-full border border-rose-500/30 bg-rose-950/20 shadow-2xl space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-white">403 Access Denied</h1>
          <p className="text-rose-200/80 text-xs leading-relaxed">
            Security Restriction: This service record belongs to another registered customer. You are not authorized to view or alter other customers' vehicle records.
          </p>
          <div className="pt-3 flex flex-col gap-2.5">
            <Link 
              to="/my-garage" 
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent to-accent-light text-slate-950 font-black text-xs shadow-md hover:brightness-110 transition-all text-center"
            >
              Go to My Garage (My Vehicles)
            </Link>
            <Link 
              to="/" 
              className="text-gray-400 hover:text-white text-xs font-semibold transition-colors text-center"
            >
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#050505] pt-32 flex items-center justify-center px-4">
        <div className="glass-panel p-8 rounded-3xl text-center max-w-md w-full border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-2">Booking Not Found</h1>
          <p className="text-gray-400 text-sm mb-6">No matching booking record found for "{id}".</p>
          <Link to="/" className="text-accent font-bold text-sm hover:underline">
            ← Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusIdx = STATUS_FLOW.indexOf(booking.status);
  const tasks = booking.tasks || [];
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const progressPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Render Creative Deadline Box
  const renderCreativeDeadline = () => {
    if (booking.status === 'Delivered' || booking.isDelivered) {
      return (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
          <CheckCircle className="text-emerald-400" size={24} />
          <div>
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Service Delivered</p>
            <p className="text-sm font-semibold text-white">Vehicle delivered & quality checked.</p>
          </div>
        </div>
      );
    }

    if (booking.deadline) {
      const deadlineDate = new Date(booking.deadline);
      const now = new Date();
      const diffHours = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      return (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-accent/15 via-accent/5 to-transparent border border-accent/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-accent font-bold uppercase tracking-wider">Estimated Target Completion</p>
              <p className="text-sm font-bold text-white">
                {deadlineDate.toLocaleDateString()} at {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-accent bg-accent/20 px-3 py-1.5 rounded-xl border border-accent/30">
            {diffHours > 0 ? `⚡ ${diffHours}h remaining` : '⏰ Finishing Now'}
          </span>
        </div>
      );
    }

    if (booking.estimatedHours || booking.estimatedDays) {
      return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <Clock size={20} className="text-accent" />
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Manager Estimated Work Time</p>
            <p className="text-sm font-bold text-white">
              {booking.estimatedDays ? `${booking.estimatedDays} Days ` : ''}{booking.estimatedHours || 0} Hours
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-20 animate-fade-in text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation & Live Badge */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to={isAuthenticated ? "/my-garage" : "/"} 
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} /> {isAuthenticated ? 'Back to My Garage' : 'Back to Home'}
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" /> Live Garage Stage Feed
          </div>
        </div>

        {/* Booking Hero Banner */}
        <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{booking.vehicleModel}</h1>
                <span className={`text-xs px-3.5 py-1 rounded-full border font-bold uppercase tracking-wider ${
                  booking.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]' :
                  booking.status === 'Ready' ? 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : 
                  booking.status === 'Servicing' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]' :
                  'bg-accent/20 text-accent border-accent/40'
                }`}>
                  ● {booking.status}
                </span>
              </div>
              <p className="text-gray-400 text-xs font-mono">Reference: {booking.bookingId}</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-end">
              <div className="text-left md:text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Manager Quotation</p>
                {booking.finalBill > 0 ? (
                  <p className="text-2xl sm:text-3xl font-extrabold text-accent font-mono">
                    ₹{booking.finalBill.toFixed(2)}
                  </p>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold">
                    Inspection & Quote in Progress
                  </span>
                )}
              </div>

              {(booking.finalBill > 0 || booking.status === 'Ready' || booking.status === 'Delivered') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setInvoiceModalTab('print');
                      setIsInvoiceModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-white/10"
                  >
                    <Printer size={14} className="text-accent" /> Print Bill (PDF)
                  </button>
                  <button
                    onClick={() => {
                      setInvoiceModalTab('dispatch');
                      setIsInvoiceModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <MessageCircle size={14} /> WhatsApp Bill
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* 1. ON HOLD: PENDING MANAGER APPROVAL BANNER */}
        {(booking.status === 'Pending Approval' || booking.requestStatus === 'PENDING_APPROVAL') && (
          <div className="mb-6 p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-[#121212] border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)] flex items-start gap-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Request Sent & On Hold
                </span>
                <span className="text-xs text-amber-300 font-mono">Awaiting Manager Confirmation</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Reviewing Requested Slot: <span className="text-amber-300">{booking.preferredDate}</span> at <span className="text-amber-300">{booking.preferredTime}</span>
              </h2>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Our garage manager is actively checking technician bay availability. You will receive immediate slot confirmation or a workload reschedule proposal shortly.
              </p>
            </div>
          </div>
        )}

        {/* 2. ACTION REQUIRED: MANAGER RESCHEDULE PROPOSAL CARD (24h COUNTDOWN) */}
        {(booking.status === 'Reschedule Proposed' || booking.requestStatus === 'PROPOSAL_SENT') && booking.managerProposal && (
          <div className="mb-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-950/60 via-indigo-950/40 to-[#0c1322] border-2 border-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.25)] space-y-5 backdrop-blur-xl animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/25 border border-sky-400 text-sky-300 flex items-center justify-center shrink-0">
                  <Calendar size={24} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-sky-400 text-slate-950">
                    Action Required
                  </span>
                  <h2 className="text-lg font-black text-white mt-1">
                    Manager Proposed Reschedule Timing
                  </h2>
                </div>
              </div>

              {/* LIVE 24-HOUR COUNTDOWN TIMER */}
              <div className="flex items-center gap-2 bg-black/60 border border-sky-400/40 px-4 py-2 rounded-2xl shadow-inner">
                <Clock size={16} className="text-sky-400 animate-pulse" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-sky-300">Proposal Active For:</p>
                  <p className="text-sm font-black font-mono text-white tracking-widest">
                    {timeLeft || '24:00:00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timing Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs">
                <p className="text-gray-400 text-[11px] uppercase font-semibold">Your Original Requested Slot:</p>
                <p className="text-white line-through font-bold text-sm">
                  {booking.preferredDate} at {booking.preferredTime}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-500/15 border border-sky-400/40 space-y-1 text-xs">
                <p className="text-sky-300 text-[11px] uppercase font-bold">Manager Proposed Slot & Deadline:</p>
                <p className="text-white font-black text-sm">
                  {booking.managerProposal.proposedDate} at {booking.managerProposal.proposedTime}
                </p>
                {booking.managerProposal.proposedDeadline && (
                  <p className="text-[11px] text-sky-200/80">
                    Target Completion ETA: {new Date(booking.managerProposal.proposedDeadline).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Manager Note */}
            {booking.managerProposal.note && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs">
                <p className="text-slate-400 font-semibold mb-0.5">Manager Explanation / Bay Status:</p>
                <p className="text-slate-200 leading-relaxed italic">"{booking.managerProposal.note}"</p>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200/80">
              ℹ️ Please accept or decline within 24 hours. After 24 hours, this request will automatically expire and archive to Failed Transactions.
            </div>

            {/* Customer Response Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleAcceptProposal}
                disabled={isProcessingAction}
                className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                <CheckCircle size={16} /> Accept New Schedule
              </button>
              
              <button
                onClick={handleDeclineProposal}
                disabled={isProcessingAction}
                className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <AlertTriangle size={16} /> Decline & Cancel Request
              </button>
            </div>
          </div>
        )}

        {/* 3. DECLINED / EXPIRED REQUEST BANNER */}
        {(booking.status === 'Declined' || booking.isDeclined || booking.status === 'Failed / Expired' || booking.requestStatus === 'DECLINED' || booking.requestStatus === 'EXPIRED') && (
          <div className="mb-6 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-[#180a0d] border-2 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.3)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-fade-in backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border-2 border-rose-500 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={28} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[11px] uppercase font-black tracking-wider px-3 py-0.5 rounded-full bg-rose-500 text-white shadow">
                    ⛔ Request Declined
                  </span>
                  <span className="text-xs text-rose-300 font-mono font-bold bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                    Permanently Locked & Off
                  </span>
                </div>
                <h2 className="text-lg font-black text-white">
                  This Booking Request Was Declined
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-rose-200/90 pt-1">
                  <p>
                    <span className="font-bold text-rose-300">Declined By:</span> {booking.declinedBy || (booking.declinedByName ? `${booking.declinedByName} (${booking.declinedByRole || 'Participant'})` : 'Customer')}
                  </p>
                  {booking.declinedAt && (
                    <p>
                      <span className="font-bold text-rose-300">Declined On:</span> {new Date(booking.declinedAt).toLocaleString()}
                    </p>
                  )}
                  <p className="sm:col-span-2">
                    <span className="font-bold text-rose-300">Reason:</span> {booking.declineReason || booking.failReason || 'Request declined.'}
                  </p>
                </div>
                <p className="text-[11px] text-rose-300/70 pt-1 flex items-center gap-1">
                  <Lock size={12} className="text-rose-400" /> This booking is completely off and archived. No further changes or status updates can be made.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Creative Deadline Banner */}
        <div className="mb-6">
          {renderCreativeDeadline()}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column — Info + Agile Subtasks + Timeline */}
          <div className="lg:col-span-2 space-y-6">

            {/* Vehicle & Service Info */}
            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4 flex items-center gap-2">
                <Car size={18} className="text-accent" /> Booking Summary
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Vehicle</p>
                  <p className="text-white font-medium">{booking.vehicleModel}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">License Plate</p>
                  <p className="text-white font-mono">{booking.plateNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Service Scope</p>
                  <p className="text-accent font-semibold">{booking.serviceType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-white">{booking.vehicleType || 'Car'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-white flex items-center gap-1.5"><Calendar size={13} className="text-gray-400" /> {booking.preferredDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Slot Time</p>
                  <p className="text-white flex items-center gap-1.5"><Clock size={13} className="text-gray-400" /> {booking.preferredTime}</p>
                </div>
              </div>
            </div>

            {/* AGILE SUBTASKS PROGRESS (Checklist for Customer) */}
            {tasks.length > 0 && (
              <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <CheckSquare size={18} className="text-accent" /> Live Service Task Progression
                    </h2>
                    <p className="text-xs text-gray-400">Step-by-step diagnostic and maintenance checklist.</p>
                  </div>
                  <span className="text-xs font-bold text-accent font-mono">
                    {completedTasks}/{tasks.length} Completed ({progressPct}%)
                  </span>
                </div>

                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>

                <div className="space-y-2 pt-2">
                  {tasks.map((task) => (
                    <div 
                      key={task.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-2xl border text-xs ${
                        task.status === 'Done' ? 'bg-emerald-500/10 border-emerald-500/20 text-gray-300' :
                        task.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/30 text-white' :
                        'bg-white/5 border-white/5 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {task.status === 'Done' ? (
                          <CheckCircle className="text-emerald-400 shrink-0" size={16} />
                        ) : task.status === 'In Progress' ? (
                          <Flame className="text-amber-400 shrink-0 animate-pulse" size={16} />
                        ) : (
                          <Circle className="text-gray-600 shrink-0" size={14} />
                        )}
                        <span className={`font-medium ${task.status === 'Done' ? 'line-through text-gray-400' : ''}`}>
                          {task.title}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        task.status === 'Done' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        task.status === 'In Progress' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Timeline Stages */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
              <h2 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <Wrench size={18} className="text-accent" /> Live Stage Workflow
              </h2>
              <div className="relative">
                {STATUS_FLOW.map((status, idx) => {
                  const isCompleted = idx <= currentStatusIdx;
                  const isCurrent = idx === currentStatusIdx;
                  const log = statusLogs.find(l => l.status === status);
                  
                  return (
                    <div key={status} className="relative flex gap-4 pb-8 last:pb-0">
                      {idx < STATUS_FLOW.length - 1 && (
                        <div className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-16px)] transition-all duration-500 ${
                          isCompleted && idx < currentStatusIdx ? 'bg-accent' : 'bg-white/10'
                        }`} />
                      )}
                      
                      <div className="relative z-10 shrink-0">
                        {isCompleted ? (
                          <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all ${
                            isCurrent 
                              ? 'bg-accent text-[#050505] shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-110' 
                              : 'bg-accent/20 text-accent border border-accent/40'
                          }`}>
                            <CheckCircle size={16} strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div className="w-[30px] h-[30px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Circle size={10} className="text-gray-600" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${isCompleted ? 'text-white' : 'text-gray-500'} ${isCurrent ? 'text-accent' : ''}`}>
                            {status}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2 py-0.5 rounded-full border border-accent/30 animate-pulse">
                              Active Stage
                            </span>
                          )}
                        </div>
                        {log && (
                          <div className="mt-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-xs text-gray-300 leading-relaxed">{log.note}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{formatDate(log.createdAt)} at {formatTime(log.createdAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mechanic Notes */}
            {booking.mechanicNotes && (
              <div className="glass-card rounded-2xl p-6 border border-white/10 animate-fade-in">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-accent" /> Mechanic Diagnostics & Service Log
                </h2>
                <div className="bg-[#141414] border border-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-300 leading-relaxed">{booking.mechanicNotes}</p>
                </div>
              </div>
            )}

            {/* Itemized Quotation & Applied Manager Offers */}
            {booking.finalBill > 0 && (
              <div className="glass-card rounded-2xl p-6 border border-white/10 animate-fade-in space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                    <FileText size={16} className="text-accent" /> Itemized Service Quotation
                  </h2>
                  <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Manager Approved
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {booking.lineItems && Array.isArray(booking.lineItems) && booking.lineItems.length > 0 ? (
                    booking.lineItems.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-gray-300">{item.name}</span>
                        <span className="text-white font-mono">₹{parseFloat(item.amount || 0).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-300">{booking.serviceType} Diagnostic & Service</span>
                      <span className="text-white font-mono">₹{parseFloat(booking.finalBill).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Applied Manager Offer */}
                  {booking.appliedOffer && (
                    <div className="flex justify-between text-emerald-400 pt-2 border-t border-white/5 font-semibold">
                      <span className="flex items-center gap-1"><Tag size={13} /> Applied Offer ({booking.appliedOffer.code}):</span>
                      <span className="font-mono">
                        {booking.appliedOffer.discountType === 'percentage' 
                          ? `-${booking.appliedOffer.discountValue}% Applied` 
                          : `-₹${booking.appliedOffer.discountValue} Off`}
                      </span>
                    </div>
                  )}

                  {parseFloat(booking.customDiscount) > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Manager Courtesy Discount:</span>
                      <span className="font-mono">-₹{parseFloat(booking.customDiscount).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-3 flex justify-between items-center text-sm">
                    <span className="text-white font-bold">Total Approved Payable</span>
                    <span className="text-accent font-extrabold font-mono text-base">₹{booking.finalBill.toFixed(2)}</span>
                  </div>

                  {/* Print Invoice & WhatsApp Actions inside Quote Card */}
                  <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceModalTab('print');
                        setIsInvoiceModalOpen(true);
                      }}
                      className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 border border-white/10"
                    >
                      <Printer size={13} className="text-accent" /> Print Invoice (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceModalTab('dispatch');
                        setIsInvoiceModalOpen(true);
                      }}
                      className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <MessageCircle size={13} /> WhatsApp Bill
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column — Chat */}
          <div className="lg:col-span-1">
            <div className="glass-panel border border-white/10 rounded-3xl overflow-hidden sticky top-28 shadow-2xl flex flex-col h-[520px]">
              <div className="px-5 py-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Direct Garage Messaging</h3>
                  <p className="text-[10px] text-gray-400">Discuss custom repairs with manager</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-xs text-center">
                      Have questions regarding deadlines or tasks?<br />
                      Send a message to our service team.
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isCustomer = msg.senderRole === 'customer';
                  return (
                    <div key={i} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${isCustomer ? 'order-2' : 'order-1'}`}>
                        {!isCustomer && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[9px] text-accent font-bold uppercase">AutoServe Garage Staff</span>
                          </div>
                        )}
                        <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isCustomer 
                            ? 'bg-accent text-[#050505] font-medium rounded-br-none' 
                            : 'bg-white/10 text-gray-200 rounded-bl-none border border-white/10'
                        }`}>
                          {msg.message}
                        </div>
                        <p className={`text-[9px] text-gray-500 mt-1 ${isCustomer ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {booking.status === 'Declined' || booking.isDeclined || booking.status === 'Failed / Expired' ? (
                <div className="p-3 border-t border-white/10 bg-rose-500/10 text-rose-300 text-[11px] text-center font-medium flex items-center justify-center gap-1.5">
                  <Lock size={13} className="text-rose-400" /> Messaging closed — Request has been declined.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Message the service team..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#050505] font-bold disabled:opacity-40 transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* INVOICE PRINT & WHATSAPP / SMS DISPATCH MODAL */}
      <InvoicePrintAndDispatchModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        booking={booking}
        calculatedTotal={booking?.finalBill || 0}
        lineItems={booking?.lineItems || [
          { id: 1, name: `${booking?.serviceType || 'Service'} Diagnostic & Maintenance`, amount: booking?.finalBill || 0 }
        ]}
        urgentSurcharge={booking?.urgentSurcharge || 0}
        activeOffer={booking?.appliedOffer}
        customDiscount={booking?.customDiscount || 0}
        defaultTab={invoiceModalTab}
      />
    </div>
  );
}

