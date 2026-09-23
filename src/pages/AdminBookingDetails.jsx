import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Save, User, Car, Settings, CheckCircle2, Circle, AlertCircle, AlertTriangle, Zap, Send, ShieldCheck, ShieldAlert, Tag, Plus, Trash2, Calculator, Clock, Calendar, CheckSquare, Layers, Lock, Flame, Printer, MessageCircle, Phone, FileText } from 'lucide-react';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { STATUS_FLOW, users, initialOffers } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import InvoicePrintAndDispatchModal from '../components/InvoicePrintAndDispatchModal';

export default function AdminBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, hasRole } = useAuth();
  const { addToast } = useToast();

  const [booking, setBooking] = useState(null);
  const [chats, setChats] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Invoice & Dispatch Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalTab, setInvoiceModalTab] = useState('print'); // 'print' | 'dispatch'

  // Editable fields
  const [status, setStatus] = useState('');
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Work Timing & Agile Deadlines
  const [estimatedDays, setEstimatedDays] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [deadline, setDeadline] = useState('');

  // Manager Slot Review & Negotiation State
  const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('10:00 AM');
  const [proposedDeadline, setProposedDeadline] = useState('');
  const [proposalNote, setProposalNote] = useState('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Agile Tasks
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Mike');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  // Manager Dynamic Cost Breakdown & Urgent Surcharge
  const [urgentSurcharge, setUrgentSurcharge] = useState(0);
  const [defaultUrgentCharge, setDefaultUrgentCharge] = useState(() => {
    try {
      const saved = localStorage.getItem('autoserve_default_urgent_surcharge');
      return saved ? Number(saved) : 500;
    } catch {
      return 500;
    }
  });

  const handleUpdateDefaultUrgentCharge = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setDefaultUrgentCharge(num);
    try {
      localStorage.setItem('autoserve_default_urgent_surcharge', num.toString());
      addToast(`Default urgent charge set to ₹${num}`, 'success', 2000);
    } catch (e) {}
  };

  const handleAddUrgentTranche = () => {
    if (isReadOnly) return;
    const current = parseFloat(urgentSurcharge) || 0;
    const nextVal = current + defaultUrgentCharge;
    setUrgentSurcharge(nextVal);
    addToast(`Added +₹${defaultUrgentCharge} Urgent Express Charge (Total: ₹${nextVal})`, 'success', 2000);
  };

  const handleClearUrgentCharge = () => {
    if (isReadOnly) return;
    setUrgentSurcharge(0);
    addToast('Urgent surcharge cleared', 'info', 1500);
  };

  const [lineItems, setLineItems] = useState([
    { id: 1, name: 'Diagnostic & Labor', amount: 0 },
    { id: 2, name: 'OEM Parts & Fluids', amount: 0 }
  ]);
  const [selectedOfferCode, setSelectedOfferCode] = useState('');
  const [customDiscount, setCustomDiscount] = useState(0);

  // Load manager offers
  const [offers, setOffers] = useState(() => {
    try {
      const saved = localStorage.getItem('autoserve_manager_offers');
      return saved ? JSON.parse(saved) : initialOffers;
    } catch {
      return initialOffers;
    }
  });

  useEffect(() => {
    async function loadBooking() {
      try {
        const bookingRef = doc(db, 'bookings', id);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) {
          setBooking(null);
          return;
        }
        const data = snap.data();
        setBooking({ bookingId: snap.id, ...data });
        setStatus(data.status || 'Booked');
        setMechanicNotes(data.mechanicNotes || '');
        setEstimatedDays(data.estimatedDays || 0);
        setEstimatedHours(data.estimatedHours || 2);
        setDeadline(data.deadline || '');
        setTasks(data.tasks || []);
        setUrgentSurcharge(data.urgentSurcharge || (data.isUrgent ? 500 : 0));
        
        if (data.lineItems && Array.isArray(data.lineItems) && data.lineItems.length > 0) {
          setLineItems(data.lineItems);
        } else if (data.finalBill > 0) {
          setLineItems([
            { id: 1, name: `${data.serviceType || 'Service'} Diagnostic & Labor`, amount: data.finalBill * 0.75 },
            { id: 2, name: 'Parts & Consumables', amount: data.finalBill * 0.25 }
          ]);
        }
        setSelectedOfferCode(data.appliedOffer?.code || '');
        setCustomDiscount(data.customDiscount || 0);

        const chatSnapshot = await getDocs(collection(db, 'bookingChats'));
        const chatItems = chatSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => item.bookingId === id)
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return aTime - bTime;
          });
        setChats(chatItems);
      } catch (error) {
        console.error('Failed to load admin booking details:', error);
        addToast(`Unable to load booking details: ${error.message}`, 'error');
        setBooking(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [id, addToast]);

  // IMMUTABLE LOCK CHECK: Delivered or Declined bookings cannot be altered!
  const isDeclined = booking?.status === 'Declined' || booking?.isDeclined === true || booking?.status === 'Failed / Expired' || booking?.requestStatus === 'DECLINED' || booking?.requestStatus === 'EXPIRED';
  const isDeliveredLocked = booking?.status === 'Delivered' || booking?.isDelivered === true;
  const isReadOnly = isDeliveredLocked || isDeclined;

  // Cost calculation (includes line items + manager urgent surcharge)
  const itemsSubtotal = lineItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const totalSubtotal = itemsSubtotal + (parseFloat(urgentSurcharge) || 0);
  const activeOffer = offers.find(o => o.code === selectedOfferCode && o.active !== false);
  
  let offerDiscountValue = 0;
  if (activeOffer) {
    if (activeOffer.discountType === 'percentage') {
      offerDiscountValue = (totalSubtotal * activeOffer.discountValue) / 100;
    } else {
      offerDiscountValue = Math.min(totalSubtotal, activeOffer.discountValue);
    }
  }

  const totalDiscount = offerDiscountValue + (parseFloat(customDiscount) || 0);
  const calculatedTotal = Math.max(0, totalSubtotal - totalDiscount);

  // Line item handlers
  const handleAddLineItem = () => {
    if (isReadOnly) return;
    setLineItems([...lineItems, { id: Date.now(), name: 'Additional Component / Labor', amount: 0 }]);
  };

  const handleUpdateLineItem = (index, field, value) => {
    if (isReadOnly) return;
    const updated = [...lineItems];
    updated[index][field] = field === 'amount' ? (parseFloat(value) || 0) : value;
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index) => {
    if (isReadOnly) return;
    if (lineItems.length === 1) {
      setLineItems([{ id: Date.now(), name: 'Diagnostic Labor', amount: 0 }]);
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Agile task handlers
  const handleAddTask = (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!newTaskTitle.trim()) return;

    const task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee,
      status: 'To Do',
      deadline: newTaskDeadline || 'End of Day'
    };

    setTasks([...tasks, task]);
    setNewTaskTitle('');
    setNewTaskDeadline('');
    addToast('Agile subtask added to sprint.', 'success', 2000);
  };

  const handleToggleTaskStatus = (taskId) => {
    if (isReadOnly) return;
    const nextStatusMap = {
      'To Do': 'In Progress',
      'In Progress': 'Done',
      'Done': 'To Do'
    };

    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: nextStatusMap[t.status] || 'To Do' };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId) => {
    if (isReadOnly) return;
    setTasks(tasks.filter(t => t.id !== taskId));
    addToast('Subtask removed from board.', 'info', 1500);
  };

  const verifyStaffAuthorization = () => {
    if (!isAuthenticated || !hasRole(['admin', 'mechanic'])) {
      addToast('Security Violation: Unauthorized edit attempt blocked.', 'security');
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleAdminDecline = async () => {
    if (!booking) return;
    if (!verifyStaffAuthorization()) return;

    const reason = window.prompt(
      'Enter reason for declining this booking request (e.g. Workshop at capacity, EV parts unavailable):',
      'Workshop at capacity / Schedule conflict'
    );

    if (reason === null) return; // User canceled prompt

    try {
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      const declinerLabel = currentUser?.name ? `${currentUser.name} (Garage Admin)` : 'Garage Manager (Admin)';

      const updatePayload = {
        status: 'Declined',
        requestStatus: 'DECLINED',
        isDeclined: true,
        declinedBy: declinerLabel,
        declinedByName: currentUser?.name || 'Garage Manager',
        declinedByRole: 'admin',
        declinedAt: new Date().toISOString(),
        declineReason: reason.trim() || 'Declined by Garage Manager',
        failReason: reason.trim() || 'Declined by Garage Manager',
        updatedAt: new Date().toISOString(),
        lastModifiedBy: currentUser?.email || currentUser?.uid,
        lastModifiedRole: currentUser?.role || 'admin'
      };

      await updateDoc(bookingRef, updatePayload);

      const logData = {
        bookingId: booking.bookingId,
        status: 'Declined',
        updatedBy: currentUser?.uid || 'admin-1',
        updaterName: currentUser?.name || 'Garage Admin',
        note: `Request DECLINED by Manager (${declinerLabel}). Reason: ${reason}. Record is permanently sealed.`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingStatusLogs'), logData);

      const declineChat = {
        bookingId: id,
        senderId: currentUser?.uid || 'admin-1',
        senderName: currentUser?.name || 'Garage Manager',
        senderRole: 'admin',
        message: `⛔ Booking Request Declined by Workshop Manager. Reason: ${reason}. This request is closed.`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingChats'), declineChat);

      setStatus('Declined');
      setBooking(prev => ({ ...prev, ...updatePayload }));
      setChats(prev => [...prev, { ...declineChat, id: `chat-${Date.now()}`, createdAt: new Date().toISOString() }]);
      addToast('Booking request DECLINED and permanently locked.', 'info');
    } catch (error) {
      console.error('Failed to decline booking:', error);
      addToast(`Error declining booking: ${error.message}`, 'error');
    }
  };

  const handleAcceptSlotAsIs = async () => {
    if (!booking) return;
    if (!verifyStaffAuthorization()) return;

    try {
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      const updatePayload = {
        status: 'Booked',
        requestStatus: 'CONFIRMED',
        slotConfirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModifiedBy: currentUser?.email || currentUser?.uid,
        lastModifiedRole: currentUser?.role || 'admin'
      };

      await updateDoc(bookingRef, updatePayload);

      const logData = {
        bookingId: booking.bookingId,
        status: 'Booked',
        updatedBy: currentUser?.uid || 'admin-1',
        updaterName: currentUser?.name || 'Garage Admin',
        note: `Manager confirmed requested slot (${booking.preferredDate} at ${booking.preferredTime}). Vehicle moved to active queue.`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingStatusLogs'), logData);

      const confirmChat = {
        bookingId: id,
        senderId: currentUser?.uid || 'admin-1',
        senderName: currentUser?.name || 'Garage Manager',
        senderRole: 'admin',
        message: `✅ Booking Confirmed: Your slot for ${booking.preferredDate} at ${booking.preferredTime} has been accepted by the workshop manager!`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingChats'), confirmChat);

      setStatus('Booked');
      setBooking(prev => ({ ...prev, ...updatePayload }));
      setChats(prev => [...prev, { ...confirmChat, id: `chat-${Date.now()}`, createdAt: new Date().toISOString() }]);
      addToast('Slot accepted as requested! Booking confirmed and added to queue.', 'success');
    } catch (error) {
      console.error('Failed to accept slot:', error);
      addToast(`Error approving slot: ${error.message}`, 'error');
    }
  };

  const handleSendRescheduleProposal = async (e) => {
    if (e) e.preventDefault();
    if (!booking) return;
    if (!verifyStaffAuthorization()) return;

    if (!proposedDate || !proposedTime) {
      addToast('Please select proposed date and time.', 'error');
      return;
    }

    try {
      setIsSubmittingProposal(true);
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours countdown

      const proposal = {
        proposedDate,
        proposedTime,
        proposedDeadline: proposedDeadline || '',
        note: proposalNote.trim() || 'Bay capacity adjustment from manager.',
        sentAt: new Date().toISOString(),
        expiresAt: expiresAt,
        status: 'PENDING_CUSTOMER'
      };

      const updatePayload = {
        status: 'Reschedule Proposed',
        requestStatus: 'PROPOSAL_SENT',
        managerProposal: proposal,
        proposalExpiresAt: expiresAt,
        updatedAt: new Date().toISOString(),
        lastModifiedBy: currentUser?.email || currentUser?.uid,
        lastModifiedRole: currentUser?.role || 'admin'
      };

      await updateDoc(bookingRef, updatePayload);

      const logData = {
        bookingId: booking.bookingId,
        status: 'Reschedule Proposed',
        updatedBy: currentUser?.uid || 'admin-1',
        updaterName: currentUser?.name || 'Garage Admin',
        note: `Manager proposed schedule negotiation: ${proposedDate} at ${proposedTime}. (Note: ${proposal.note}). Active for 24h.`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingStatusLogs'), logData);

      const proposalChat = {
        bookingId: id,
        senderId: currentUser?.uid || 'admin-1',
        senderName: currentUser?.name || 'Garage Manager',
        senderRole: 'admin',
        message: `🔄 Reschedule Proposal: Due to bay workload, we propose ${proposedDate} at ${proposedTime}. Note: ${proposal.note}. Please confirm within 24 hours.`,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'bookingChats'), proposalChat);

      setStatus('Reschedule Proposed');
      setBooking(prev => ({ ...prev, ...updatePayload }));
      setChats(prev => [...prev, { ...proposalChat, id: `chat-${Date.now()}`, createdAt: new Date().toISOString() }]);
      setIsNegotiateModalOpen(false);
      addToast('Negotiation proposal sent to customer with 24-hour expiration window.', 'success');
    } catch (error) {
      console.error('Failed to send proposal:', error);
      addToast(`Error proposing reschedule: ${error.message}`, 'error');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!verifyStaffAuthorization()) return;

    const newChat = {
      bookingId: id,
      senderId: currentUser?.uid || 'admin-1',
      senderName: currentUser?.name || 'Garage Admin',
      senderRole: currentUser?.role || 'admin',
      message: newMessage.trim(),
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'bookingChats'), newChat);
      try {
        await set(push(ref(rtdb, 'bookingChats')), {
          ...newChat,
          createdAt: new Date().toISOString()
        });
      } catch (rtdbError) {
        console.warn('Realtime Database admin chat mirror failed:', rtdbError);
      }
      setChats(prev => [...prev, { id: docRef.id, ...newChat, createdAt: new Date().toISOString() }]);
      setNewMessage('');
      addToast('Message dispatched.', 'success', 2000);
    } catch (error) {
      console.error('Admin chat save failed:', error);
      addToast(`Unable to send message: ${error.message}`, 'error');
    }
  };

  const handleSaveChanges = async () => {
    if (!booking) return;
    if (!verifyStaffAuthorization()) return;

    if (isReadOnly) {
      addToast('Action Rejected: This booking is sealed/declined and cannot be modified.', 'error');
      return;
    }

    setSaveStatus('saving');

    try {
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      const isMarkingDelivered = status === 'Delivered';

      const updatePayload = {
        status,
        mechanicNotes,
        estimatedDays: Number(estimatedDays),
        estimatedHours: Number(estimatedHours),
        deadline,
        tasks,
        finalBill: calculatedTotal,
        lineItems,
        urgentSurcharge: parseFloat(urgentSurcharge) || 0,
        appliedOffer: activeOffer ? { 
          code: activeOffer.code, 
          title: activeOffer.title, 
          discountValue: activeOffer.discountValue, 
          discountType: activeOffer.discountType,
          isSeasonal: Boolean(activeOffer.isSeasonal),
          seasonName: activeOffer.seasonName || null
        } : null,
        customDiscount: parseFloat(customDiscount) || 0,
        subtotal: totalSubtotal,
        isDelivered: isMarkingDelivered,
        deliveredAt: isMarkingDelivered ? new Date().toISOString() : (booking.deliveredAt || null),
        updatedAt: new Date().toISOString(),
        lastModifiedBy: currentUser?.email || currentUser?.uid,
        lastModifiedRole: currentUser?.role || 'admin'
      };

      await updateDoc(bookingRef, updatePayload);

      if (status !== booking.status) {
        const logData = {
          bookingId: booking.bookingId,
          status,
          updatedBy: currentUser?.uid || 'admin-1',
          updaterName: currentUser?.name || 'Garage Admin',
          note: isMarkingDelivered 
            ? `Vehicle successfully delivered to customer. Record permanently sealed.`
            : `Status changed to "${status}". Deadline: ${deadline || `${estimatedHours}h`}`,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'bookingStatusLogs'), logData);
        try {
          await set(push(ref(rtdb, 'bookingStatusLogs')), {
            ...logData,
            createdAt: new Date().toISOString()
          });
        } catch (rtdbError) {
          console.warn('Realtime Database status log mirror failed:', rtdbError);
        }
      }

      setBooking(prev => ({ ...prev, ...updatePayload }));
      setSaveStatus('saved');
      addToast(isMarkingDelivered ? 'Order marked Delivered and permanently sealed!' : 'Work timing, agile tasks & quote saved!', 'success');
      setTimeout(() => setSaveStatus(''), 2500);

      // Auto-open WhatsApp & SMS Dispatch Modal on Delivery
      if (isMarkingDelivered) {
        setInvoiceModalTab('dispatch');
        setIsInvoiceModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to save booking changes:', error);
      addToast(`Unable to save changes: ${error.message}`, 'error');
      setSaveStatus('');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Loading garage dispatch dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated || !hasRole(['admin', 'mechanic'])) {
    return (
      <div className="min-h-screen bg-[#050505] pt-32 flex items-center justify-center px-4">
        <div className="glass-panel p-8 rounded-3xl text-center max-w-md w-full border border-rose-500/30 bg-rose-950/20 shadow-2xl space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-white">403 Restricted Staff Access</h1>
          <p className="text-rose-200/80 text-xs leading-relaxed">
            Garage Staff Only: You must be logged in with Garage Administrator or Certified Technician credentials to access internal workshop dispatch controls.
          </p>
          <div className="pt-3 flex flex-col gap-2.5">
            <Link 
              to="/my-garage" 
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs shadow-md text-center"
            >
              Go to My Customer Garage
            </Link>
            <Link 
              to="/login" 
              className="text-gray-400 hover:text-white text-xs font-semibold text-center"
            >
              Sign In as Staff
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
          <p className="text-slate-400 text-sm mb-6">No matching booking record found for "{id}".</p>
          <Link to="/admin" className="text-sky-400 font-bold text-sm hover:underline">
            ← Return to Fleet Management
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusIdx = STATUS_FLOW.indexOf(booking.status);
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const progressPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const customer = users.find(u => u.uid === booking.customerId);
  const customerName = booking.customerName || booking.guestName || customer?.name || 'Customer';
  const customerPhone = booking.customerPhone || booking.guestPhone || customer?.phone || 'N/A';

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative selection:bg-sky-500/30">
      <div className="max-w-7xl mx-auto">

        {/* IMMUTABLE SEALED / READ-ONLY BANNER */}
        {isReadOnly && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 backdrop-blur-xl animate-fade-in">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-400 shrink-0" />
              <span>
                <strong className="text-white">Record Locked:</strong> {isDeliveredLocked ? 'This vehicle has been delivered to customer and invoiced.' : 'This request has been declined/closed.'} Editing is disabled.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setInvoiceModalTab('print');
                  setIsInvoiceModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Printer size={14} /> Print Bill (PDF)
              </button>
              <button
                onClick={() => {
                  setInvoiceModalTab('dispatch');
                  setIsInvoiceModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Send size={14} /> Resend WhatsApp & SMS
              </button>
            </div>
          </div>
        )}

        {/* 1. SLOT APPROVAL & NEGOTIATION BANNER: Pending Approval */}
        {(booking.status === 'Pending Approval' || booking.requestStatus === 'PENDING_APPROVAL') && (
          <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-[#0c1322] border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 backdrop-blur-xl animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/25 border border-amber-400 text-amber-300 flex items-center justify-center shrink-0">
                <Clock size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                    Awaiting Slot Decision
                  </span>
                  <span className="text-xs text-amber-300 font-mono font-bold">New Booking Intake</span>
                </div>
                <h2 className="text-lg font-black text-white">
                  Customer Requested Slot: <span className="text-amber-300">{booking.preferredDate}</span> at <span className="text-amber-300">{booking.preferredTime}</span>
                </h2>
                <p className="text-xs text-amber-200/80 mt-1 max-w-xl">
                  Accept the requested timing as it is to confirm the booking into the active queue, propose a negotiated schedule, or decline the request.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <button
                onClick={handleAcceptSlotAsIs}
                className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <CheckCircle2 size={16} /> Accept Slot
              </button>

              <button
                onClick={() => {
                  setProposedDate(booking.preferredDate || new Date().toISOString().split('T')[0]);
                  setProposedTime(booking.preferredTime || '10:00 AM');
                  setIsNegotiateModalOpen(true);
                }}
                className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
              >
                <Calendar size={16} /> Propose Reschedule
              </button>

              <button
                onClick={handleAdminDecline}
                className="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <AlertTriangle size={16} /> Decline Request
              </button>
            </div>
          </div>
        )}

        {/* 2. RESCHEDULE PROPOSED (Active 24h Window) */}
        {(booking.status === 'Reschedule Proposed' || booking.requestStatus === 'PROPOSAL_SENT') && (
          <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-sky-500/20 via-indigo-950/40 to-[#0c1322] border-2 border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 backdrop-blur-xl animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/25 border border-sky-400 text-sky-300 flex items-center justify-center shrink-0">
                <Calendar size={24} className="animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-sky-400 text-slate-950">
                    Negotiation Sent
                  </span>
                  <span className="text-xs text-sky-300 font-mono font-bold">24-Hour Expiration Window Active</span>
                </div>
                <h2 className="text-lg font-black text-white">
                  Proposed New Slot: <span className="text-sky-300">{booking.managerProposal?.proposedDate || booking.preferredDate}</span> at <span className="text-sky-300">{booking.managerProposal?.proposedTime || booking.preferredTime}</span>
                </h2>
                <p className="text-xs text-sky-200/80 mt-1 max-w-xl">
                  {booking.managerProposal?.note ? `Manager Note: "${booking.managerProposal.note}". ` : ''}
                  Customer has 24 hours to confirm. If expired, request will automatically archive to Failed Transactions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleAcceptSlotAsIs}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                Force Confirm Slot
              </button>
              <button
                onClick={() => setIsNegotiateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                Edit Proposal
              </button>
              <button
                onClick={handleAdminDecline}
                className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-rose-500/30"
              >
                Decline
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
                    Permanently Locked & Inactive
                  </span>
                </div>
                <h2 className="text-lg font-black text-white">
                  Booking Request Declined & Closed
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
                  <Lock size={12} className="text-rose-400" /> All modifications and status updates are locked for this booking.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Navigation & Save */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-sky-300 transition-colors mb-3 text-xs font-semibold uppercase tracking-wider">
              <ChevronLeft size={16} /> Back to Fleet Operations
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Sprint Control: <span className="font-mono text-sky-400">{booking.bookingId}</span>
              </h1>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold">
                <ShieldCheck size={14} className="text-sky-400" /> Manager Authority
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Vehicle: <span className="text-white font-semibold">{booking.vehicleModel}</span> • Scheduled: <span>{booking.preferredDate} at {booking.preferredTime}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Action Buttons for Print Bill and WhatsApp & SMS */}
            <button
              onClick={() => {
                setInvoiceModalTab('print');
                setIsInvoiceModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Printer size={15} className="text-sky-400" /> Print Bill (PDF)
            </button>

            <button
              onClick={() => {
                setInvoiceModalTab('dispatch');
                setIsInvoiceModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <MessageCircle size={15} className="text-emerald-400" /> Send WhatsApp & SMS
            </button>

            {!isDeliveredLocked ? (
              <button
                onClick={handleSaveChanges}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-2xl shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 text-xs"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Circle className="animate-spin" size={15} /> Saving...
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 size={15} /> Saved & Synced!
                  </>
                ) : (
                  <>
                    <Save size={15} /> Save Timing & Quotes
                  </>
                )}
              </button>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold backdrop-blur-xl">
                <Lock size={14} /> Read-Only Record
              </span>
            )}
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Controls: Agile Tasks, Timing & Line Items */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Customer & Vehicle Info Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1424]/85 via-[#0a0f1d]/90 to-[#070a12] backdrop-blur-xl shadow-lg">
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={16} /> Customer Details & Location
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-slate-500 font-medium">Name</p>
                    <p className="text-white font-bold text-sm">{customerName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Phone (Verified)</p>
                    <p className="text-sky-300 font-mono font-semibold">{customerPhone}</p>
                  </div>
                  {booking.location && (
                    <div className="pt-1.5 border-t border-white/5">
                      <p className="text-slate-500 font-medium">Service Mode & City</p>
                      <p className="text-slate-300 font-semibold">{booking.location.pickupType || 'Bay Drive-In'} • <span className="text-amber-300">{booking.location.city || 'Mumbai'}</span></p>
                      {booking.location.address && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{booking.location.address}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1424]/85 via-[#0a0f1d]/90 to-[#070a12] backdrop-blur-xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Car size={16} /> Vehicle Details
                  </h3>
                  {booking.isUrgent && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase font-mono px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      ⚡ Urgent Priority
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-slate-500 font-medium">Model & License Plate</p>
                    <p className="text-white font-bold text-sm">{booking.vehicleModel} ({booking.plateNumber || 'N/A'})</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Service Category</p>
                    <p className="text-amber-300 font-semibold">{booking.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Powertrain</p>
                    <p className="text-slate-300 font-mono">{booking.fuelType || 'Petrol'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. STAGE STATUS SELECTOR */}
            <div className="p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1424]/85 via-[#0a0f1d]/90 to-[#070a12] backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Update Service Stage Status
                </label>
                <span className="text-[11px] text-slate-500">
                  Selecting 'Delivered' seals the record permanently.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isDeliveredLocked}
                    onClick={() => setStatus(s)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                      status === s 
                        ? s === 'Delivered' 
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105' 
                          : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] scale-105' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    {s === 'Delivered' ? '🔒 Mark Delivered & Seal' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. MANAGER WORK TIMING & DEADLINE CONFIGURATOR */}
            <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1424]/85 via-[#0a0f1d]/90 to-[#070a12] backdrop-blur-xl shadow-xl space-y-5">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Clock className="text-amber-400" size={18} /> Set Specific Work Timing & Completion Deadline
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Estimated Work Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={isDeliveredLocked}
                    value={estimatedDays}
                    onChange={(e) => setEstimatedDays(e.target.value)}
                    className="w-full bg-[#070a12] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-xs outline-none focus:border-amber-400 disabled:opacity-50"
                    placeholder="e.g. 0 or 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Estimated Work Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={isDeliveredLocked}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full bg-[#070a12] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-xs outline-none focus:border-amber-400 disabled:opacity-50"
                    placeholder="e.g. 3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Delivery Deadline ETA
                  </label>
                  <input
                    type="datetime-local"
                    disabled={isDeliveredLocked}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#070a12] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-amber-400 disabled:opacity-50"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>

            {/* 3. AGILE TASKS & SPRINT MANAGER */}
            <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1424]/85 via-[#0a0f1d]/90 to-[#070a12] backdrop-blur-xl shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Layers className="text-amber-400" size={18} /> Agile Sprint Tasks & Task Deadlines
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Break down service jobs into trackable agile tasks with mechanic deadlines.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-300 font-mono">
                  {tasks.filter(t => t.status === 'Done').length}/{tasks.length} Done
                </span>
              </div>

              {/* Add New Agile Task */}
              {!isDeliveredLocked && (
                <form onSubmit={handleAddTask} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 uppercase font-semibold mb-1">Task Title / Inspection Area</label>
                      <input
                        type="text"
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="e.g. Brake Caliper Skimming & Pad Fitting"
                        className="w-full bg-[#070a12] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 uppercase font-semibold mb-1">Assignee</label>
                      <input
                        type="text"
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        placeholder="e.g. Mike / Alex"
                        className="w-full bg-[#070a12] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 uppercase font-semibold mb-1">Task Deadline</label>
                      <input
                        type="text"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                        placeholder="e.g. 03:00 PM"
                        className="w-full bg-[#070a12] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md hover:brightness-110"
                  >
                    <Plus size={14} /> Add Task to Sprint
                  </button>
                </form>
              )}

              {/* Tasks List */}
              <div className="space-y-2.5">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                      task.status === 'Done' ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-300' :
                      task.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/30 text-white' :
                      'bg-black/40 border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        disabled={isDeliveredLocked}
                        onClick={() => handleToggleTaskStatus(task.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          task.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-black' :
                          task.status === 'In Progress' ? 'bg-amber-500/20 border-amber-500 text-amber-300' :
                          'border-white/20 bg-transparent hover:border-white/40'
                        }`}
                      >
                        {task.status === 'Done' ? <CheckCircle2 size={16} /> : task.status === 'In Progress' ? <Flame size={14} /> : null}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-white'}`}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Assigned: <span className="text-slate-300">{task.assignee}</span> • Due: <span className="text-amber-300">{task.deadline}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        task.status === 'Done' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        task.status === 'In Progress' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse' :
                        'bg-slate-500/20 text-slate-300 border-slate-500/30'
                      }`}>
                        {task.status}
                      </span>
                      {!isDeliveredLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No agile tasks created yet for this booking.</p>
                )}
              </div>
            </div>

            {/* 4. DYNAMIC COST BREAKDOWN, URGENT SURCHARGE & MANAGER OFFERS */}
            <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1424]/85 via-[#0a0f1d]/90 to-[#070a12] backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Calculator className="text-amber-400" size={18} /> Manager Dynamic Cost Breakdown & Pricing
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize parts, labor, priority surcharges, and apply seasonal promo discounts.
                  </p>
                </div>
                {!isDeliveredLocked && (
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-bold flex items-center gap-1 transition-all self-start"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                )}
              </div>

              {/* Line Items List */}
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id || index} className="flex items-center gap-3 p-2.5 bg-black/40 rounded-2xl border border-white/5">
                    <input
                      type="text"
                      disabled={isDeliveredLocked}
                      value={item.name}
                      onChange={(e) => handleUpdateLineItem(index, 'name', e.target.value)}
                      placeholder="Item name / Labor description"
                      className="flex-1 bg-transparent border-none px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-amber-400 rounded-lg disabled:opacity-50"
                    />
                    <div className="flex items-center gap-1 px-3 py-1 bg-[#070a12] rounded-xl border border-white/10">
                      <span className="text-slate-400 text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        disabled={isDeliveredLocked}
                        value={item.amount}
                        onChange={(e) => handleUpdateLineItem(index, 'amount', e.target.value)}
                        className="w-24 bg-transparent text-white font-mono text-xs font-bold outline-none text-right disabled:opacity-50"
                      />
                    </div>
                    {!isDeliveredLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* URGENT PRIORITY SURCHARGE (Admin extra money control) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-950/30 to-[#0c1322] border-2 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <Flame size={16} className="text-amber-400 animate-pulse" /> Urgent Express Surcharge Engine
                    </label>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      Manager authority to charge priority bay fees, fast-track routing & technician overtime.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-black/70 rounded-xl border border-amber-400/50 shadow-inner">
                      <span className="text-amber-400 text-xs font-bold">Total Surcharge: ₹</span>
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        value={urgentSurcharge}
                        onChange={(e) => setUrgentSurcharge(e.target.value)}
                        className="w-24 bg-transparent text-amber-300 font-mono text-xs font-black outline-none text-right disabled:opacity-50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Manager Quick-Action Urgent Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/20 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={handleAddUrgentTranche}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Zap size={13} className="fill-slate-950" />
                      {parseFloat(urgentSurcharge) > 0 ? `+ ₹${defaultUrgentCharge} Extra Urgent Charge` : `⚡ Apply Urgent Charge (₹${defaultUrgentCharge})`}
                    </button>

                    {parseFloat(urgentSurcharge) > 0 && (
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={handleClearUrgentCharge}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold text-xs active:scale-95 transition-all disabled:opacity-50"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Manager Default Rate Setting */}
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-200/80 bg-black/40 px-2.5 py-1 rounded-xl border border-white/5">
                    <span>Default Rate: ₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      disabled={isReadOnly}
                      value={defaultUrgentCharge}
                      onChange={(e) => handleUpdateDefaultUrgentCharge(e.target.value)}
                      className="w-16 bg-transparent text-amber-300 font-mono font-bold outline-none text-center border-b border-amber-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Offers & Seasonal Discount Config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                    <Tag size={14} className="text-amber-400" /> Apply Seasonal / Promo Offer
                  </label>
                  <select
                    disabled={isDeliveredLocked}
                    value={selectedOfferCode}
                    onChange={(e) => setSelectedOfferCode(e.target.value)}
                    className="w-full bg-[#070a12] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-400 disabled:opacity-50"
                  >
                    <option value="">No Promotional Offer</option>
                    {offers.filter(o => o.active !== false).map(o => (
                      <option key={o.id} value={o.code}>
                        {o.isSeasonal ? `🌧️ [${o.seasonName || 'Seasonal'}]` : '🏷️'} {o.code} — {o.title} ({o.discountType === 'percentage' ? `${o.discountValue}% off` : `₹${o.discountValue} flat`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Manager Courtesy Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={isDeliveredLocked}
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#070a12] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 rounded-2xl bg-black/60 border border-amber-400/20 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Line Items Subtotal:</span>
                  <span className="font-mono text-white">₹{itemsSubtotal.toFixed(2)}</span>
                </div>
                {parseFloat(urgentSurcharge) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>⚡ Urgent Priority Surcharge:</span>
                    <span className="font-mono font-bold">+₹{parseFloat(urgentSurcharge).toFixed(2)}</span>
                  </div>
                )}
                {activeOffer && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Applied Offer ({activeOffer.code}{activeOffer.isSeasonal ? ` • ${activeOffer.seasonName}` : ''}):</span>
                    <span className="font-mono">-₹{offerDiscountValue.toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(customDiscount) > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Manager Courtesy Discount:</span>
                    <span className="font-mono">-₹{parseFloat(customDiscount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-bold">
                  <span className="text-white">Final Customer Payable:</span>
                  <span className="text-amber-400 font-black font-mono text-base">₹{calculatedTotal.toFixed(2)}</span>
                </div>

                {/* Print Invoice & WhatsApp Action Buttons in Quote Card */}
                <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceModalTab('print');
                      setIsInvoiceModalOpen(true);
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <Printer size={14} /> Print Bill (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceModalTab('dispatch');
                      setIsInvoiceModalOpen(true);
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <MessageCircle size={14} /> Send WhatsApp & SMS
                  </button>
                </div>
              </div>

              {/* Mechanic Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Mechanic Diagnostic & Service Log
                </label>
                <textarea
                  disabled={isDeliveredLocked}
                  value={mechanicNotes}
                  onChange={(e) => setMechanicNotes(e.target.value)}
                  placeholder="Record parts inspected, OEM components replaced, fluids changed..."
                  rows={3}
                  className="w-full bg-[#070a12] border border-white/10 rounded-xl p-4 text-white text-xs outline-none focus:border-amber-400 transition-all resize-none leading-relaxed disabled:opacity-50"
                />
              </div>
            </div>

          </div>

          {/* Sidebar Chat with Customer */}
          <div className="lg:col-span-1">
            <div className="glass-panel border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[580px] sticky top-24 shadow-2xl">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare size={16} className="text-accent" /> Customer Direct Chat
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">{customerName}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                  Active
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chats.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500 text-xs text-center">No messages exchanged yet.</p>
                  </div>
                ) : (
                  chats.map((c, i) => {
                    const isAdmin = c.senderRole === 'admin' || c.senderRole === 'mechanic';
                    return (
                      <div key={i} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-gray-400 mb-0.5 px-1 capitalize font-medium">
                          {c.senderName || c.senderRole}
                        </span>
                        <div 
                          className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed rounded-2xl ${
                            isAdmin 
                              ? 'bg-accent text-[#050505] font-medium rounded-tr-none' 
                              : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/10'
                          }`}
                        >
                          {c.message}
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1 px-1">{formatTime(c.createdAt)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-white/10 bg-white/5">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type official quote or ETA update..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-accent transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-9 h-9 rounded-xl text-[#050505] font-bold flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-all"
                    style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* INVOICE PRINT & WHATSAPP / SMS DISPATCH MODAL */}
      <InvoicePrintAndDispatchModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        booking={booking}
        calculatedTotal={calculatedTotal}
        lineItems={lineItems}
        urgentSurcharge={urgentSurcharge}
        activeOffer={activeOffer}
        customDiscount={customDiscount}
        defaultTab={invoiceModalTab}
      />

      {/* MANAGER SCHEDULE NEGOTIATION & DEADLINE PROPOSAL MODAL */}
      {isNegotiateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1120] border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Calendar className="text-amber-400" /> Propose Reschedule / Work Deadline
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Negotiate vehicle arrival slot and completion deadline with customer (24-hour expiration).
                </p>
              </div>
              <button 
                onClick={() => setIsNegotiateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendRescheduleProposal} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-slate-400">Current Requested Timing:</p>
                <p className="text-white font-bold font-mono">
                  {booking.preferredDate} at {booking.preferredTime}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Proposed New Date *</label>
                  <input
                    type="date"
                    required
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Proposed Time Slot *</label>
                  <select
                    value={proposedTime}
                    onChange={(e) => setProposedTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#070a12] border border-white/10 rounded-xl text-white outline-none focus:border-amber-400"
                  >
                    <option value="09:00 AM">09:00 AM - Morning Slot</option>
                    <option value="10:00 AM">10:00 AM - Regular Slot</option>
                    <option value="11:30 AM">11:30 AM - Late Morning</option>
                    <option value="02:00 PM">02:00 PM - Afternoon Slot</option>
                    <option value="03:30 PM">03:30 PM - Late Afternoon</option>
                    <option value="05:00 PM">05:00 PM - Evening Express</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Proposed Completion Deadline (ETA)</label>
                <input
                  type="datetime-local"
                  value={proposedDeadline}
                  onChange={(e) => setProposedDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Reason & Note to Customer *</label>
                <textarea
                  required
                  rows={3}
                  value={proposalNote}
                  onChange={(e) => setProposalNote(e.target.value)}
                  placeholder="e.g. Workshop Bay 3 is currently undergoing major engine overhaul. We can offer priority technician attention at 02:00 PM."
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400 resize-none leading-relaxed"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
                ⏱️ <strong>24-Hour Expiration Rule:</strong> The customer will receive this proposal immediately. They have 24 hours to confirm. If no response is received in 24h, the transaction will automatically expire and archive to Failed Transactions.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNegotiateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black shadow-lg shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmittingProposal ? 'Dispatching...' : 'Send Proposal (24h Window)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

