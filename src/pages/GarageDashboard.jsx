import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, Star, BarChart3, Calendar, CheckCircle2, Clock,
  Wrench, Edit3, Eye, TrendingUp, Users, Phone, MapPin,
  ChevronRight, ChevronLeft, LogOut, Bell, Settings, Shield, Camera, Upload, Trash2, Save, X, Loader2,
  Plus, Search, Sparkles, Activity, AlertTriangle, Zap, CheckSquare, DollarSign,
  Tag, Percent, Flame, MessageCircle, ArrowUpRight, XCircle, RotateCcw,
  ArrowLeft, Mail, PlusCircle, Printer, Receipt, FileText, Check
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import { services as defaultServicesCatalog } from '../data/dummyData';

const WORK_FLOW_STAGES = [
  { id: 'pending', label: '1. Received', stageName: 'Pending Approval', icon: '📥' },
  { id: 'inspecting', label: '2. Inspection', stageName: 'Inspecting', icon: '🔍' },
  { id: 'inProgress', label: '3. In Bay', stageName: 'In Bay', icon: '🔧' },
  { id: 'washing', label: '4. Detailing', stageName: 'Washing', icon: '✨' },
  { id: 'ready', label: '5. Ready in Bay', stageName: 'Ready', icon: '🏁' },
  { id: 'completed', label: '6. Delivered (Sealed)', stageName: 'Delivered', icon: '🔒' }
];

export default function GarageDashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [garage, setGarage] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'profile'

  // Filter & Search states
  const [filterStage, setFilterStage] = useState('ALL_ACTIVE'); // 'ALL_ACTIVE' | 'URGENT' | 'PENDING' | 'IN_BAY' | 'QUEUE' | 'READY' | 'DELIVERED' | 'DECLINED'
  const [searchTerm, setSearchTerm] = useState('');
  const [crmSearch, setCrmSearch] = useState('');
  const navScrollRef = useRef(null);

  const scrollNav = (direction) => {
    if (navScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      navScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Modals
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isOffersOpen, setIsOffersOpen] = useState(false);
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [isServiceRatesOpen, setIsServiceRatesOpen] = useState(false);

  // Service Catalog & Rates State
  const [serviceCatalog, setServiceCatalog] = useState(defaultServicesCatalog);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Periodic Maintenance');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Add Walk-in Vehicle Form
  const [walkinVehicle, setWalkinVehicle] = useState({
    vehicleModel: '',
    plateNumber: '',
    customerName: '',
    customerPhone: '',
    serviceType: 'Full Service',
    isUrgent: false,
    urgentSurcharge: 500,
    estimatedCost: 1500,
    notes: 'Direct workshop intake by manager.'
  });
  const [isSubmittingWalkin, setIsSubmittingWalkin] = useState(false);

  // Manage & Quote Work Order Form
  const [manageStatus, setManageStatus] = useState('pending');
  const [manageTasks, setManageTasks] = useState([]);
  const [manageQuote, setManageQuote] = useState(1500);
  const [manageNotes, setManageNotes] = useState('');
  const [manageIsUrgent, setManageIsUrgent] = useState(false);
  const [manageUrgentFee, setManageUrgentFee] = useState(500);
  const [manageBillAtDelivery, setManageBillAtDelivery] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSavingManage, setIsSavingManage] = useState(false);

  // Professional Invoice & Billing Studio State
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [invoiceIsUrgent, setInvoiceIsUrgent] = useState(false);
  const [invoiceUrgentFee, setInvoiceUrgentFee] = useState(500);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [invoiceDiscountCode, setInvoiceDiscountCode] = useState('');
  const [invoiceTaxRate, setInvoiceTaxRate] = useState(0); // 0% or 18% GST
  const [invoicePaymentStatus, setInvoicePaymentStatus] = useState('PAID'); // 'PAID' | 'PENDING' | 'CASH' | 'ONLINE_UPI'
  const [invoiceNotes, setInvoiceNotes] = useState('Thank you for trusting us with your vehicle! 🚗');
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState('Labour & Service');

  // Reschedule & 24h Proposal State
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [propDate, setPropDate] = useState('');
  const [propTimeSlot, setPropTimeSlot] = useState('10:00 AM - 12:00 PM');
  const [propDuration, setPropDuration] = useState('Same Day (2 - 4 Hours)');
  const [propQuote, setPropQuote] = useState(1500);
  const [propNote, setPropNote] = useState('');
  const [isSendingProposal, setIsSendingProposal] = useState(false);

  // Decline / Cancellation Modal State
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineBookingItem, setDeclineBookingItem] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Remaining time helper for 24h confirmation proposals
  const getRemainingTime = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired (24h window closed)';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left for customer to confirm`;
  };

  // Direct Accept into Live Bay
  const handleDirectAccept = async (bk) => {
    try {
      const updatedFields = {
        status: 'inProgress',
        currentStage: 'In Bay',
        scheduledDate: bk.date,
        scheduledTimeSlot: bk.timeSlot || bk.preferredTime || '10:00 AM - 12:00 PM',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'bookings', bk.id), updatedFields);
      setBookings(prev => prev.map(b => b.id === bk.id ? { ...b, ...updatedFields } : b));
      addToast(`Booking for ${bk.vehicle || bk.vehicleModel} accepted and moved to Live Bay! 🚗`, 'success');
    } catch (err) {
      console.error('Accept error:', err);
      addToast('Failed to accept booking.', 'error');
    }
  };

  // Open Reschedule Proposal Modal
  const openRescheduleModal = (bk) => {
    setRescheduleBooking(bk);
    setPropDate(bk.date || new Date().toISOString().split('T')[0]);
    setPropTimeSlot(bk.timeSlot || bk.preferredTime || '10:00 AM - 12:00 PM');
    setPropDuration(bk.expectedDuration || bk.expectedTurnaround || 'Same Day (2 - 4 Hours)');
    setPropQuote(bk.billing?.total || 1500);
    setPropNote('We adjusted the schedule slot to ensure our certified technician is fully available for your vehicle.');
    setIsRescheduleOpen(true);
  };

  // Send 24h Confirmation Proposal
  const handleSendProposalSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleBooking) return;
    setIsSendingProposal(true);
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const updatedFields = {
        status: 'proposed_changes',
        currentStage: 'Pending Customer Confirmation',
        proposedChanges: {
          date: propDate,
          timeSlot: propTimeSlot,
          expectedDuration: propDuration,
          quote: Number(propQuote) || 1500,
          note: propNote.trim(),
          sentAt: new Date().toISOString()
        },
        confirmationExpiresAt: expiresAt,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'bookings', rescheduleBooking.id), updatedFields);
      setBookings(prev => prev.map(b => b.id === rescheduleBooking.id ? { ...b, ...updatedFields } : b));
      setIsRescheduleOpen(false);
      addToast(`Reschedule proposal sent to customer! Valid for 24 hours. ⏳`, 'success');
    } catch (err) {
      console.error('Proposal send error:', err);
      addToast('Failed to send proposal.', 'error');
    } finally {
      setIsSendingProposal(false);
    }
  };

  // Open Decline / Cancel Modal
  const openDeclineModal = (bk) => {
    setDeclineBookingItem(bk);
    setDeclineReason('Slot is fully booked and does not fit workshop technician schedule.');
    setIsDeclineModalOpen(true);
  };

  // Confirm Decline / Cancel
  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!declineBookingItem) return;
    setIsSubmittingDecline(true);
    try {
      const reason = declineReason.trim() || 'Declined by workshop manager.';
      const updatedFields = {
        status: 'declined',
        currentStage: 'Declined',
        requestStatus: 'DECLINED',
        isDeclined: true,
        isCancelled: true,
        isDelivered: false,
        cancelledBy: 'garage_owner',
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        statusHistory: [
          ...(declineBookingItem.statusHistory || []),
          {
            stage: 'Declined',
            timestamp: new Date().toISOString(),
            notes: `Declined by workshop: ${reason}`
          }
        ]
      };

      await updateDoc(doc(db, 'bookings', declineBookingItem.id), updatedFields);
      setBookings(prev => prev.map(b => b.id === declineBookingItem.id ? { ...b, ...updatedFields } : b));
      setIsDeclineModalOpen(false);
      if (isManageModalOpen) setIsManageModalOpen(false);
      addToast(`Booking moved to Declined / Cancelled section.`, 'info');
    } catch (err) {
      console.error('Decline error:', err);
      addToast('Failed to decline booking.', 'error');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Restore Booking back to Pending
  const handleRestoreBooking = async (bk) => {
    try {
      const updatedFields = {
        status: 'pending',
        currentStage: 'Pending Approval',
        requestStatus: 'PENDING_APPROVAL',
        isDeclined: false,
        isCancelled: false,
        cancelledBy: null,
        cancellationReason: null,
        updatedAt: serverTimestamp(),
        statusHistory: [
          ...(bk.statusHistory || []),
          {
            stage: 'Pending Approval (Restored)',
            timestamp: new Date().toISOString(),
            notes: 'Restored from Declined section by workshop manager.'
          }
        ]
      };

      await updateDoc(doc(db, 'bookings', bk.id), updatedFields);
      setBookings(prev => prev.map(b => b.id === bk.id ? { ...b, ...updatedFields } : b));
      addToast(`Booking #${bk.id.slice(0, 8)} restored to Pending Approvals!`, 'success');
    } catch (err) {
      console.error('Restore error:', err);
      addToast('Failed to restore booking.', 'error');
    }
  };

  // Garage Profile Edit Form
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhoto, setEditPhoto] = useState('');

  // Offers & Discounts State
  const [offers, setOffers] = useState([
    { code: 'VAHAN20', title: 'Monsoon Special Discount', value: '20% OFF', desc: 'Applicable on Full Service & Brake check' },
    { code: 'EXPRESS10', title: 'Priority Bay Surcharge Waiver', value: '₹500 OFF', desc: 'Valid for express same-day servicing' },
    { code: 'BATTERY15', title: 'EV & Battery Diagnostics Promo', value: '15% OFF', desc: 'Comprehensive health check for EV/Hybrids' },
    { code: 'FIRSTWASH', title: 'Complimentary Detailing Foam Wash', value: 'FREE', desc: 'Included with periodic service package' }
  ]);

  // Add / Remove Offer State
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferValue, setNewOfferValue] = useState('');
  const [newOfferDesc, setNewOfferDesc] = useState('');
  const [isSavingOffer, setIsSavingOffer] = useState(false);

  // Handle Add New Offer with Firestore persistence
  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!newOfferCode.trim() || !newOfferTitle.trim()) {
      addToast('Please enter an Offer Code and Title.', 'error');
      return;
    }
    setIsSavingOffer(true);
    try {
      const newOffer = {
        code: newOfferCode.trim().toUpperCase(),
        title: newOfferTitle.trim(),
        value: newOfferValue.trim() || '20% OFF',
        desc: newOfferDesc.trim() || 'Seasonal special discount on workshop repairs & servicing.',
        createdAt: new Date().toISOString()
      };
      const updatedOffers = [newOffer, ...offers.filter(o => o.code !== newOffer.code)];
      setOffers(updatedOffers);

      if (currentUser?.uid) {
        await updateDoc(doc(db, 'garages', currentUser.uid), {
          offers: updatedOffers,
          updatedAt: serverTimestamp()
        });
      }

      setNewOfferCode('');
      setNewOfferTitle('');
      setNewOfferValue('');
      setNewOfferDesc('');
      setIsAddingOffer(false);
      addToast(`Offer '${newOffer.code}' added to your catalog! 🎉`, 'success');
    } catch (err) {
      console.error('Error creating offer:', err);
      addToast('Failed to save offer.', 'error');
    } finally {
      setIsSavingOffer(false);
    }
  };

  // Handle Delete Offer with Firestore persistence
  const handleDeleteOffer = async (codeToDelete) => {
    try {
      const updatedOffers = offers.filter(o => o.code !== codeToDelete);
      setOffers(updatedOffers);

      if (currentUser?.uid) {
        await updateDoc(doc(db, 'garages', currentUser.uid), {
          offers: updatedOffers,
          updatedAt: serverTimestamp()
        });
      }
      addToast(`Offer '${codeToDelete}' removed.`, 'info');
    } catch (err) {
      console.error('Error deleting offer:', err);
      addToast('Failed to delete offer.', 'error');
    }
  };

  // Handle Update Individual Service Price
  const handleUpdateServicePrice = (id, newPrice) => {
    setServiceCatalog(prev => prev.map(s => s.id === id ? { ...s, defaultPrice: Number(newPrice) || 0 } : s));
  };

  // Handle Add Custom Service / Spare Part
  const handleCreateCustomService = (e) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServicePrice) {
      addToast('Please enter Service Name and Price.', 'error');
      return;
    }
    const newService = {
      id: `custom-srv-${Date.now()}`,
      name: newServiceName.trim(),
      description: newServiceDesc.trim() || 'Custom specialized repair / spare parts replacement.',
      defaultPrice: Number(newServicePrice) || 0,
      category: newServiceCategory || 'General Repairs',
      badge: 'Workshop Custom',
      estimatedTime: '1 - 2 Hours',
      image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80'
    };
    setServiceCatalog(prev => [...prev, newService]);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDesc('');
    addToast(`Added '${newService.name}' (₹${newService.defaultPrice}) to service catalog! 🚗`, 'success');
  };

  // Handle Save All Service Rates to Firestore
  const handleSaveServiceRates = async () => {
    setIsSavingRates(true);
    try {
      if (currentUser?.uid) {
        await updateDoc(doc(db, 'garages', currentUser.uid), {
          serviceCatalog,
          updatedAt: serverTimestamp()
        });
      }
      localStorage.setItem('autoserve_custom_services', JSON.stringify(serviceCatalog));
      addToast('All workshop service costs and catalog saved successfully! 💰', 'success');
      setIsServiceRatesOpen(false);
    } catch (err) {
      console.error('Error saving rates:', err);
      addToast('Failed to save service rates.', 'error');
    } finally {
      setIsSavingRates(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    
    // 1. Fetch garage profile
    const loadGarage = async () => {
      try {
        const garageSnap = await getDoc(doc(db, 'garages', currentUser.uid));
        if (garageSnap.exists()) {
          const data = { id: garageSnap.id, ...garageSnap.data() };
          setGarage(data);
          setEditName(data.garageName || '');
          setEditPhone(data.phone || '');
          setEditWhatsapp(data.whatsapp || '');
          setEditAddress(data.address || '');
          setEditCity(data.city || '');
          setEditDescription(data.description || '');
          setEditPhoto(data.photo || data.photos?.[0] || '');
          if (data.offers && Array.isArray(data.offers) && data.offers.length > 0) {
            setOffers(data.offers);
          }
          if (data.serviceCatalog && Array.isArray(data.serviceCatalog) && data.serviceCatalog.length > 0) {
            setServiceCatalog(data.serviceCatalog);
          }
        }
      } catch (err) {
        console.error('Error fetching garage profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGarage();

    // 2. Real-time Live Bookings listener
    const bkQuery = query(
      collection(db, 'bookings'),
      where('garageId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(bkQuery, (bkSnap) => {
      if (bkSnap.empty) {
        setBookings([]);
      } else {
        const list = bkSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
          return timeB - timeA;
        });
        setBookings(list);
      }
    }, (error) => {
      console.error('Realtime bookings listener error:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Extract unique customers & essential intelligence from bookings
  const customerDirectory = (() => {
    const map = new Map();
    bookings.forEach(b => {
      const key = (b.customerPhone || b.customerEmail || b.customerName || b.userId || 'client').trim().toLowerCase();
      const existing = map.get(key) || {
        id: b.userId || b.id || key,
        name: b.customerName || b.userName || 'Verified Client',
        phone: b.customerPhone || '',
        email: b.customerEmail || '',
        address: b.customerAddress || b.address || '',
        vehicles: new Set(),
        totalBookings: 0,
        totalSpend: 0,
        lastDate: b.date || '',
        recentStatus: b.status || 'inProgress',
        recentService: b.service || b.serviceType || 'Standard Service',
        bookingHistory: []
      };

      if (b.vehicle || b.vehicleModel) {
        existing.vehicles.add(`${b.vehicle || b.vehicleModel}${b.plateNumber ? ` (${b.plateNumber})` : ''}`);
      }
      existing.totalBookings += 1;
      const amount = Number(b.billing?.total || b.estimatedCost || 1500);
      existing.totalSpend += isNaN(amount) ? 1500 : amount;
      if (!existing.lastDate || new Date(b.date || 0) > new Date(existing.lastDate || 0)) {
        existing.lastDate = b.date || existing.lastDate;
        existing.recentStatus = b.status || existing.recentStatus;
        existing.recentService = b.service || b.serviceType || existing.recentService;
      }
      existing.bookingHistory.push(b);
      map.set(key, existing);
    });

    return Array.from(map.values()).map(c => ({
      ...c,
      vehiclesList: Array.from(c.vehicles)
    }));
  })();

  const filteredCustomers = customerDirectory.filter(c => {
    if (!crmSearch.trim()) return true;
    const q = crmSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.vehiclesList.some(v => v.toLowerCase().includes(q)) ||
      c.recentService.toLowerCase().includes(q)
    );
  });

  const totalLifetimeRevenue = customerDirectory.reduce((sum, c) => sum + c.totalSpend, 0);
  const repeatCustomersCount = customerDirectory.filter(c => c.totalBookings > 1).length;
  const repeatRate = customerDirectory.length > 0 ? Math.round((repeatCustomersCount / customerDirectory.length) * 100) : 0;

  // Add Walk-in Vehicle Handler
  const handleAddWalkinSubmit = async (e) => {
    e.preventDefault();
    if (!walkinVehicle.vehicleModel || !walkinVehicle.customerName) {
      addToast('Please enter Vehicle Model and Customer Name.', 'error');
      return;
    }

    setIsSubmittingWalkin(true);
    try {
      const generatedId = `VS-BAY-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();

      const newBookingDoc = {
        bookingId: generatedId,
        garageId: currentUser.uid,
        garageName: garage?.garageName || 'Workshop',
        userId: 'walkin-client',
        customerName: walkinVehicle.customerName,
        customerPhone: walkinVehicle.customerPhone || '9876543210',
        customerEmail: 'walkin@customer.com',
        customerAddress: garage?.address || 'Direct Garage Bay',
        service: walkinVehicle.serviceType,
        serviceType: walkinVehicle.serviceType,
        vehicle: walkinVehicle.vehicleModel,
        vehicleModel: walkinVehicle.vehicleModel,
        plateNumber: (walkinVehicle.plateNumber || 'DIRECT').toUpperCase(),
        date: now.toISOString().split('T')[0],
        note: walkinVehicle.notes,
        status: 'inProgress',
        currentStage: 'In Bay',
        isDelivered: false,
        isUrgent: Boolean(walkinVehicle.isUrgent),
        intakeType: 'Direct Garage Intake',
        tasks: [
          { id: 1, title: 'In-Bay Intake Check & Visual Diagnostic', status: 'In Progress' },
          { id: 2, title: 'High Voltage / Engine Scan & Mechanical Tuning', status: 'Pending' },
          { id: 3, title: 'Brake, Suspension & Fluid Check', status: 'Pending' },
          { id: 4, title: 'Road Test & Quality Certification', status: 'Pending' }
        ],
        billing: {
          items: [
            { name: walkinVehicle.serviceType, price: Number(walkinVehicle.estimatedCost) || 1500, category: 'Labour & Service' }
          ],
          discount: 0,
          urgentSurcharge: walkinVehicle.isUrgent ? Number(walkinVehicle.urgentSurcharge) || 500 : 0,
          total: (Number(walkinVehicle.estimatedCost) || 1500) + (walkinVehicle.isUrgent ? Number(walkinVehicle.urgentSurcharge) || 500 : 0)
        },
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'bookings'), newBookingDoc);
      const createdItem = { id: docRef.id, ...newBookingDoc, createdAt: { toDate: () => new Date() } };

      setBookings(prev => [createdItem, ...prev]);
      setIsAddVehicleOpen(false);
      setWalkinVehicle({
        vehicleModel: '',
        plateNumber: '',
        customerName: '',
        customerPhone: '',
        serviceType: 'Full Service',
        isUrgent: false,
        urgentSurcharge: 500,
        estimatedCost: 1500,
        notes: 'Direct workshop intake by manager.'
      });
      addToast(`Vehicle ${newBookingDoc.vehicleModel} registered into Live Bay! 🚗`, 'success');
    } catch (err) {
      console.error('Error adding vehicle:', err);
      addToast(err.message || 'Failed to add vehicle.', 'error');
    } finally {
      setIsSubmittingWalkin(false);
    }
  };

  // Open Manage & Quote Modal
  const openManageModal = (booking) => {
    setSelectedBooking(booking);
    setManageStatus(booking.status || 'pending');
    setManageTasks(booking.tasks || [
      { id: 1, title: 'In-Bay Intake Check & Visual Diagnostic', status: 'Pending' },
      { id: 2, title: 'Service Execution & Component Tuning', status: 'Pending' },
      { id: 3, title: 'QC Inspection & Road Test', status: 'Pending' },
      { id: 4, title: 'Final Wash & Client Delivery Dispatch', status: 'Pending' }
    ]);
    const baseAmount = Number(booking.billing?.subtotal || booking.billing?.total || booking.estimatedCost || 1500);
    setManageQuote(baseAmount);
    setManageNotes(booking.note || booking.mechanicNotes || '');
    const isUrg = Boolean(booking.isUrgent);
    setManageIsUrgent(isUrg);
    setManageUrgentFee(Number(booking.urgentSurcharge !== undefined ? booking.urgentSurcharge : (booking.billing?.urgentSurcharge || (isUrg ? 500 : 0))));
    setManageBillAtDelivery(booking.billAtDelivery !== undefined ? Boolean(booking.billAtDelivery) : true);
    setIsManageModalOpen(true);
  };

  // Save Manage & Quote Updates
  const handleSaveManageBooking = async () => {
    if (!selectedBooking) return;
    setIsSavingManage(true);
    try {
      const isDelivered = manageStatus === 'completed' || manageStatus === 'delivered';
      const urgentFeeVal = manageIsUrgent ? Number(manageUrgentFee || 0) : 0;
      const totalAmount = Number(manageQuote) + urgentFeeVal;
      const stageInfo = WORK_FLOW_STAGES.find(s => s.id === manageStatus);

      const updatedBilling = {
        ...(selectedBooking.billing || {}),
        items: selectedBooking.billing?.items?.length
          ? selectedBooking.billing.items
          : [{ name: selectedBooking.service || selectedBooking.serviceType || 'Vehicle Service', price: Number(manageQuote), category: 'Labour & Parts' }],
        subtotal: Number(manageQuote),
        discount: selectedBooking.billing?.discount || 0,
        isUrgent: manageIsUrgent,
        urgentSurcharge: urgentFeeVal,
        total: totalAmount
      };

      const updatedFields = {
        status: manageStatus,
        currentStage: stageInfo?.stageName || (isDelivered ? 'Delivered' : manageStatus === 'inProgress' ? 'In Bay' : manageStatus === 'ready' ? 'Ready' : 'Pending Approval'),
        isDelivered,
        tasks: manageTasks,
        isUrgent: manageIsUrgent,
        urgentSurcharge: urgentFeeVal,
        note: manageNotes,
        billAtDelivery: Boolean(manageBillAtDelivery),
        billing: updatedBilling,
        estimatedCost: totalAmount,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'bookings', selectedBooking.id), updatedFields);

      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, ...updatedFields } : b));
      setIsManageModalOpen(false);
      addToast(`Work Order #${selectedBooking.id.slice(0, 8)} updated to ${stageInfo?.stageName || manageStatus}! 🎉`, 'success');
    } catch (err) {
      console.error('Error updating booking:', err);
      addToast(err.message || 'Failed to update work order.', 'error');
    } finally {
      setIsSavingManage(false);
    }
  };

  // ─── PROFESSIONAL INVOICE & BILLING STUDIO HANDLERS ───
  const openInvoiceModal = (bk) => {
    setInvoiceBooking(bk);
    const idCode = bk.bookingId || (bk.id ? bk.id.slice(0, 6).toUpperCase() : Math.floor(1000 + Math.random() * 9000));
    setInvoiceNumber(`VS-INV-${idCode}`);

    // Populate line items
    const defaultItems = bk.billing?.items && Array.isArray(bk.billing.items) && bk.billing.items.length > 0
      ? bk.billing.items.map((it, idx) => ({ ...it, id: it.id || idx + 1, qty: it.qty || 1 }))
      : [
          { id: 1, name: bk.service || bk.serviceType || 'Comprehensive Periodic Service & Labour', qty: 1, price: Number(bk.billing?.total || bk.estimatedCost || 1500), category: 'Labour & Service' },
          { id: 2, name: 'Engine Oil Filter & Diagnostics Assessment', qty: 1, price: 350, category: 'Spare Parts' }
        ];
    setInvoiceItems(defaultItems);

    const isUrg = Boolean(bk.isUrgent);
    setInvoiceIsUrgent(isUrg);
    setInvoiceUrgentFee(Number(bk.urgentSurcharge !== undefined ? bk.urgentSurcharge : (bk.billing?.urgentSurcharge || (isUrg ? 500 : 0))));
    setInvoiceDiscount(Number(bk.billing?.discount || 0));
    setInvoiceDiscountCode(bk.billing?.discountCode || '');
    setInvoiceTaxRate(Number(bk.billing?.taxRate || 0));
    setInvoicePaymentStatus(bk.billing?.paymentStatus || (bk.status === 'completed' || bk.status === 'delivered' ? 'PAID' : 'PENDING'));
    setInvoiceNotes(bk.billing?.invoiceNotes || 'Thank you for choosing our workshop! Certified VahanSangam service guarantee.');
    setIsInvoiceOpen(true);
  };

  const addInvoiceItem = () => {
    if (!newItemName.trim()) {
      addToast('Please enter item / part description.', 'error');
      return;
    }
    const newItem = {
      id: Date.now(),
      name: newItemName.trim(),
      qty: Number(newItemQty) || 1,
      price: Number(newItemPrice) || 0,
      category: newItemCategory || 'Spare Parts'
    };
    setInvoiceItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty(1);
    addToast(`Added '${newItem.name}' to bill!`, 'info');
  };

  const removeInvoiceItem = (itemId) => {
    setInvoiceItems(prev => prev.filter(it => it.id !== itemId));
  };

  const updateInvoiceItemPrice = (itemId, newPrice) => {
    setInvoiceItems(prev => prev.map(it => it.id === itemId ? { ...it, price: Number(newPrice) } : it));
  };

  const updateInvoiceItemQty = (itemId, newQty) => {
    setInvoiceItems(prev => prev.map(it => it.id === itemId ? { ...it, qty: Number(newQty) } : it));
  };

  const applyPromoToInvoice = (code) => {
    const found = offers.find(o => o.code === code);
    if (found) {
      setInvoiceDiscountCode(found.code);
      const subtotalNow = invoiceItems.reduce((sum, it) => sum + (Number(it.price) * (Number(it.qty) || 1)), 0);
      if (found.value.includes('%')) {
        const pct = parseInt(found.value.replace(/\D/g, '')) || 10;
        const disc = Math.round((subtotalNow * pct) / 100);
        setInvoiceDiscount(disc);
      } else if (found.value.includes('₹') || found.value.includes('OFF')) {
        const amt = parseInt(found.value.replace(/\D/g, '')) || 500;
        setInvoiceDiscount(amt);
      } else if (found.value.toUpperCase() === 'FREE') {
        setInvoiceDiscount(500);
      }
      addToast(`Promotional voucher '${found.code}' applied to invoice! 🎉`, 'success');
    }
  };

  // Live Computed Totals for Invoice
  const invoiceSubtotal = invoiceItems.reduce((sum, it) => sum + (Number(it.price) * (Number(it.qty) || 1)), 0);
  const invoiceUrgentAmount = invoiceIsUrgent ? Number(invoiceUrgentFee || 0) : 0;
  const invoiceDiscountAmount = Math.min(invoiceSubtotal + invoiceUrgentAmount, Number(invoiceDiscount || 0));
  const invoiceTaxAmount = invoiceTaxRate > 0 ? Math.round(((invoiceSubtotal + invoiceUrgentAmount - invoiceDiscountAmount) * invoiceTaxRate) / 100) : 0;
  const invoiceGrandTotal = Math.max(0, invoiceSubtotal + invoiceUrgentAmount - invoiceDiscountAmount + invoiceTaxAmount);

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleSendInvoiceWhatsApp = () => {
    if (!invoiceBooking) return;
    const phone = (invoiceBooking.customerPhone || '').replace(/\D/g, '');
    const clientName = invoiceBooking.customerName || invoiceBooking.userName || 'Valued Customer';
    const vehicleName = invoiceBooking.vehicle || invoiceBooking.vehicleModel || 'Vehicle';
    const plate = invoiceBooking.plateNumber || 'N/A';

    let msg = `🧾 *OFFICIAL WORKSHOP BILL & INVOICE*\n`;
    msg += `🏢 *${garage?.garageName || 'VahanSangam Workshop'}*\n`;
    if (garage?.phone) msg += `📞 Contact: +91 ${garage.phone}\n`;
    if (garage?.address) msg += `📍 ${garage.address}, ${garage.city || ''}\n`;
    msg += `─────────────────────────\n`;
    msg += `🆔 *Invoice No:* ${invoiceNumber}\n`;
    msg += `📅 *Date:* ${new Date().toLocaleDateString('en-IN')}\n`;
    msg += `👤 *Client:* ${clientName}\n`;
    msg += `🚗 *Vehicle:* ${vehicleName} (${plate})\n`;
    msg += `─────────────────────────\n`;
    msg += `📋 *ITEMIZED PARTICULARS:*\n`;
    invoiceItems.forEach(it => {
      msg += `• ${it.name} (x${it.qty || 1}) — ₹${(it.price * (it.qty || 1)).toLocaleString('en-IN')}\n`;
    });
    if (invoiceUrgentAmount > 0) {
      msg += `⚡ *Express Bay Priority Surcharge:* ₹${invoiceUrgentAmount.toLocaleString('en-IN')}\n`;
    }
    if (invoiceDiscountAmount > 0) {
      msg += `🎁 *Special Discount Applied${invoiceDiscountCode ? ` (${invoiceDiscountCode})` : ''}:* -₹${invoiceDiscountAmount.toLocaleString('en-IN')}\n`;
    }
    if (invoiceTaxAmount > 0) {
      msg += `🏛️ *GST (${invoiceTaxRate}%):* +₹${invoiceTaxAmount.toLocaleString('en-IN')}\n`;
    }
    msg += `─────────────────────────\n`;
    msg += `💰 *NET PAYABLE TOTAL:* ₹${invoiceGrandTotal.toLocaleString('en-IN')}\n`;
    msg += `📌 *Payment Status:* ${invoicePaymentStatus}\n\n`;
    msg += `Thank you for trusting ${garage?.garageName || 'us'}! 🌟 Certified VahanSangam Partner`;

    const waUrl = phone.length >= 10
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    addToast('Opening WhatsApp with itemized invoice... 💬', 'info');
  };

  const handleSaveAndDeliverInvoice = async (shouldDeliver = false) => {
    if (!invoiceBooking) return;
    setIsSavingInvoice(true);
    try {
      const updatedBilling = {
        invoiceNumber,
        items: invoiceItems,
        subtotal: invoiceSubtotal,
        isUrgent: invoiceIsUrgent,
        urgentSurcharge: invoiceUrgentAmount,
        discount: invoiceDiscountAmount,
        discountCode: invoiceDiscountCode,
        taxRate: invoiceTaxRate,
        taxAmount: invoiceTaxAmount,
        total: invoiceGrandTotal,
        paymentStatus: invoicePaymentStatus,
        invoiceNotes,
        generatedAt: new Date().toISOString()
      };

      const updatedFields = {
        billing: updatedBilling,
        isUrgent: invoiceIsUrgent,
        urgentSurcharge: invoiceUrgentAmount,
        estimatedCost: invoiceGrandTotal,
        updatedAt: serverTimestamp()
      };

      if (shouldDeliver) {
        updatedFields.status = 'completed';
        updatedFields.currentStage = 'Delivered';
        updatedFields.isDelivered = true;
        updatedFields.deliveredAt = new Date().toISOString();
        updatedFields.statusHistory = [
          ...(invoiceBooking.statusHistory || []),
          {
            stage: 'Delivered (Bill Finalized)',
            timestamp: new Date().toISOString(),
            notes: `Vehicle serviced and delivered. Final bill: ₹${invoiceGrandTotal} (${invoicePaymentStatus})`
          }
        ];
      }

      await updateDoc(doc(db, 'bookings', invoiceBooking.id), updatedFields);
      setBookings(prev => prev.map(b => b.id === invoiceBooking.id ? { ...b, ...updatedFields } : b));
      setIsInvoiceOpen(false);
      if (isManageModalOpen) setIsManageModalOpen(false);
      addToast(shouldDeliver ? `🚗 Vehicle #${invoiceBooking.id.slice(0, 8)} marked Delivered & Bill generated!` : 'Invoice updated successfully! 💾', 'success');
    } catch (err) {
      console.error('Invoice save error:', err);
      addToast('Failed to save invoice.', 'error');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  // Toggle Task Status in Checklist
  const toggleTaskStatus = (taskId) => {
    setManageTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'Done' ? 'Pending' : t.status === 'In Progress' ? 'Done' : 'In Progress';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  // Add Task to Checklist
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      status: 'Pending'
    };
    setManageTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
  };

  // Garage Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size should be less than 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditPhoto(reader.result);
      addToast('New garage photo attached.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Save Garage Profile Details
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editPhone.trim() || editPhone.trim().length < 10) {
      addToast('Valid 10-digit phone number is required.', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      const updateData = {
        garageName: editName.trim(),
        phone: editPhone.trim(),
        whatsapp: editWhatsapp.trim() || editPhone.trim(),
        address: editAddress.trim(),
        city: editCity.trim(),
        description: editDescription.trim(),
        photo: editPhoto,
        photos: [editPhoto],
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'garages', currentUser.uid), updateData);
      setGarage(prev => ({ ...prev, ...updateData }));
      setIsEditingProfile(false);
      addToast('Garage profile & photos updated! 🎉', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save changes.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast('Signed out from Workshop HQ.', 'info');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!garage) {
    return (
      <div className="min-h-screen bg-[#050505] pt-24 flex flex-col items-center justify-center text-white px-4">
        <Building2 size={48} className="text-gray-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Workshop Profile Not Set Up</h2>
      </div>
    );
  }

  // Calculate Metrics & KPI Counts (Case-insensitive & exhaustive)
  const isDeclinedOrCancelled = (b) => {
    if (!b) return false;
    const s = String(b.status || '').toLowerCase().trim();
    const cs = String(b.currentStage || '').toLowerCase().trim();
    const req = String(b.requestStatus || '').toLowerCase().trim();
    return (
      s === 'declined' ||
      s === 'cancelled' ||
      s === 'canceled' ||
      s === 'failed / expired' ||
      s === 'expired' ||
      s === 'failed' ||
      cs === 'declined' ||
      cs === 'cancelled' ||
      cs === 'canceled' ||
      req === 'declined' ||
      req === 'cancelled' ||
      req === 'canceled' ||
      req === 'expired' ||
      Boolean(b.isDeclined) ||
      Boolean(b.isCancelled)
    );
  };

  const pendingApprovalsCount = bookings.filter(b => (b.status === 'pending' || b.currentStage === 'Pending Approval') && !isDeclinedOrCancelled(b)).length;
  const pendingClientCount = bookings.filter(b => (b.status === 'proposed_changes' || b.currentStage === 'Pending Customer Confirmation') && !isDeclinedOrCancelled(b)).length;
  const inBayCount = bookings.filter(b => (b.status === 'inProgress' || b.currentStage === 'In Bay' || b.status === 'confirmed') && !isDeclinedOrCancelled(b)).length;
  const urgentCount = bookings.filter(b => Boolean(b.isUrgent) && !b.isDelivered && b.status !== 'completed' && !isDeclinedOrCancelled(b)).length;
  const readyCount = bookings.filter(b => (b.status === 'ready' || b.currentStage === 'Ready in Bay' || b.currentStage === 'Ready') && !isDeclinedOrCancelled(b)).length;
  const deliveredCount = bookings.filter(b => (b.status === 'completed' || b.status === 'delivered' || Boolean(b.isDelivered)) && !isDeclinedOrCancelled(b)).length;
  const declinedCount = bookings.filter(b => isDeclinedOrCancelled(b)).length;
  const totalActiveCount = bookings.filter(b => !b.isDelivered && b.status !== 'completed' && b.status !== 'delivered' && !isDeclinedOrCancelled(b)).length;

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    const isDeclined = isDeclinedOrCancelled(b);

    // Search term matching
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        (b.vehicle || b.vehicleModel || '').toLowerCase().includes(q) ||
        (b.plateNumber || '').toLowerCase().includes(q) ||
        (b.customerName || b.userName || '').toLowerCase().includes(q) ||
        (b.service || b.serviceType || '').toLowerCase().includes(q) ||
        (b.id || b.bookingId || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 1. If in DECLINED filter stage: ONLY return declined / cancelled items
    if (filterStage === 'DECLINED') return isDeclined;

    // 2. In ALL other filter stages: NEVER return declined or cancelled items
    if (isDeclined) return false;

    // 3. Stage-specific logic for active non-declined items
    if (filterStage === 'URGENT') return Boolean(b.isUrgent) && !b.isDelivered && b.status !== 'completed';
    if (filterStage === 'PENDING') return b.status === 'pending' || b.currentStage === 'Pending Approval';
    if (filterStage === 'PENDING_CLIENT') return b.status === 'proposed_changes' || b.currentStage === 'Pending Customer Confirmation';
    if (filterStage === 'IN_BAY') return b.status === 'inProgress' || b.currentStage === 'In Bay' || b.status === 'confirmed';
    if (filterStage === 'QUEUE') return b.status === 'confirmed' || b.status === 'pending' || b.status === 'proposed_changes';
    if (filterStage === 'READY') return b.status === 'ready' || b.currentStage === 'Ready in Bay' || b.currentStage === 'Ready';
    if (filterStage === 'DELIVERED') return b.status === 'completed' || b.status === 'delivered' || Boolean(b.isDelivered);
    if (filterStage === 'ALL_ACTIVE') return !b.isDelivered && b.status !== 'completed' && b.status !== 'delivered';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#05070B] text-slate-100 font-sans pb-16">

      {/* ─── TOP HEADER (WORKSHOP OPERATIONS HQ) ─── */}
      <header className="border-b border-slate-800/80 bg-[#070A10]/95 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & HQ Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-cyan-500/20 shrink-0">
              VS
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Workshop Operations HQ
                </h1>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE BAY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manager: <strong className="text-cyan-400 font-semibold">{garage.garageName || 'Garage Administrator'}</strong> • Direct Work Stream & Dispatch Desk
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsAddVehicleOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={15} strokeWidth={3} />
              <span>Add Vehicle / Walk-in</span>
            </button>

            <button
              onClick={() => setIsServiceRatesOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <DollarSign size={13} />
              <span>Service Rates & Catalog ({serviceCatalog.length})</span>
            </button>

            <button
              onClick={() => setIsOffersOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Tag size={13} />
              <span>Seasonal Discounts ({offers.length})</span>
            </button>

            <button
              onClick={() => setIsIntelligenceOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <BarChart3 size={13} />
              <span>Intelligence Panel</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'board' ? 'profile' : 'board')}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera size={13} />
              <span>{activeTab === 'board' ? 'Profile & Photos' : 'Back to Dispatch'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 text-slate-400 text-xs transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">

        {activeTab === 'board' ? (
          <div className="space-y-6 animate-fade-in">

            {/* ─── 6 KPI STATUS CARDS (INCLUDING DECLINED/CANCELLED) ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              {/* 1. Pending Approval */}
              <button
                onClick={() => setFilterStage('PENDING')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
                  filterStage === 'PENDING'
                    ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.02]'
                    : 'bg-[#0B0F17] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    <Clock size={12} />
                    <span>PENDING</span>
                  </div>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ACTION
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">{pendingApprovalsCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Pending review</p>
              </button>

              {/* 2. Active in Bay */}
              <button
                onClick={() => setFilterStage('IN_BAY')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
                  filterStage === 'IN_BAY'
                    ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/10 scale-[1.02]'
                    : 'bg-[#0B0F17] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    <Activity size={12} />
                    <span>IN BAY</span>
                  </div>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    LIVE
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">{inBayCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Under repair</p>
              </button>

              {/* 3. Urgent Express */}
              <button
                onClick={() => setFilterStage('URGENT')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
                  filterStage === 'URGENT'
                    ? 'bg-rose-500/15 border-rose-400 shadow-lg shadow-rose-500/10 scale-[1.02]'
                    : 'bg-[#0B0F17] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                    <Zap size={12} />
                    <span>URGENT</span>
                  </div>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    PRIORITY
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">{urgentCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Priority vehicles</p>
              </button>

              {/* 4. Ready in Bay */}
              <button
                onClick={() => setFilterStage('READY')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
                  filterStage === 'READY'
                    ? 'bg-yellow-500/15 border-yellow-400 shadow-lg shadow-yellow-500/10 scale-[1.02]'
                    : 'bg-[#0B0F17] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                    <Clock size={12} />
                    <span>READY</span>
                  </div>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                    QC PASS
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">{readyCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Ready for pickup</p>
              </button>

              {/* 5. Delivered History */}
              <button
                onClick={() => setFilterStage('DELIVERED')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
                  filterStage === 'DELIVERED'
                    ? 'bg-emerald-500/15 border-emerald-400 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                    : 'bg-[#0B0F17] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    <CheckCircle2 size={12} />
                    <span>DELIVERED</span>
                  </div>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CLOSED
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">{deliveredCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Completed orders</p>
              </button>

              {/* 6. Declined / Cancelled Logs */}
              <button
                onClick={() => setFilterStage('DECLINED')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
                  filterStage === 'DECLINED'
                    ? 'bg-rose-500/20 border-rose-400 shadow-lg shadow-rose-500/20 scale-[1.02]'
                    : 'bg-[#0B0F17] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                    <XCircle size={12} />
                    <span>DECLINED</span>
                  </div>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    CANCELLED
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-rose-300">{declinedCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Declined logs</p>
              </button>
            </div>

            {/* ─── SCROLLABLE FILTER NAVIGATION & SEARCH BAR ─── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
              
              {/* Scrollable Filter Pills with Arrow Buttons */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => scrollNav('left')}
                  className="p-2 rounded-xl bg-[#0B0F17] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 transition-all cursor-pointer shrink-0"
                  title="Scroll Left"
                >
                  <ChevronLeft size={15} />
                </button>

                <div
                  ref={navScrollRef}
                  className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth no-scrollbar scrollbar-none flex-1 min-w-0"
                >
                  {[
                    { id: 'ALL_ACTIVE', label: `Active Works (${totalActiveCount})` },
                    { id: 'URGENT', label: `⚡ Urgent (${urgentCount})` },
                    { id: 'PENDING', label: `Pending Approvals (${pendingApprovalsCount})` },
                    { id: 'PENDING_CLIENT', label: `⏳ Pending Client (${pendingClientCount})` },
                    { id: 'IN_BAY', label: `In Bay (${inBayCount})` },
                    { id: 'QUEUE', label: `Queue (${pendingApprovalsCount + pendingClientCount})` },
                    { id: 'READY', label: `Ready (${readyCount})` },
                    { id: 'DELIVERED', label: `Delivered (${deliveredCount})` },
                    { id: 'DECLINED', label: `❌ Declined / Cancelled (${declinedCount})`, isAlert: true },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setFilterStage(item.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        filterStage === item.id
                          ? item.isAlert
                            ? 'bg-rose-500 text-white shadow-md font-black'
                            : 'bg-cyan-400 text-slate-950 shadow-md font-black'
                          : item.isAlert
                          ? 'bg-rose-500/10 text-rose-400 hover:text-rose-300 border border-rose-500/30'
                          : 'bg-[#0B0F17] text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => scrollNav('right')}
                  className="p-2 rounded-xl bg-[#0B0F17] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 transition-all cursor-pointer shrink-0"
                  title="Scroll Right"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[280px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search vehicle, plate, client, location..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ─── WORK ORDERS GRID (MATCHING SCREENSHOT) ─── */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-20 rounded-3xl bg-[#0B0F17] border border-slate-800/80 p-8">
                <Wrench size={42} className="text-slate-700 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">
                  {filterStage === 'DECLINED' ? 'No Declined or Cancelled Bookings' : 'No Work Orders In This Stage'}
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  {filterStage === 'DECLINED' ? 'Declined and cancelled booking logs will appear here.' : 'Click "+ Add Vehicle / Walk-in" to log an intake or wait for customer online bookings.'}
                </p>
                {filterStage !== 'DECLINED' && (
                  <button
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs hover:bg-cyan-300 shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    + Add First Intake Vehicle
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBookings.map((bk) => {
                  const tasksList = bk.tasks || [];
                  const doneTasks = tasksList.filter(t => t.status === 'Done').length;
                  const totalTasks = tasksList.length;
                  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                  const isReady = bk.status === 'ready' || bk.currentStage === 'Ready in Bay';
                  const isInBay = bk.status === 'inProgress' || bk.currentStage === 'In Bay';
                  const isDelivered = bk.isDelivered || bk.status === 'completed';
                  const isPending = bk.status === 'pending' || bk.currentStage === 'Pending Approval';
                  const isProposal = bk.status === 'proposed_changes' || bk.currentStage === 'Pending Customer Confirmation';
                  const isDeclined = isDeclinedOrCancelled(bk);

                  return (
                    <div
                      key={bk.id}
                      className={`rounded-3xl bg-[#0B0F17] border transition-all duration-300 p-5 flex flex-col justify-between relative shadow-xl group ${
                        isDeclined
                          ? 'border-rose-900/40 bg-rose-950/[0.07] opacity-85'
                          : isProposal
                          ? 'border-amber-500/40 bg-amber-950/[0.05]'
                          : isPending
                          ? 'border-amber-500/30'
                          : 'border-slate-800/90 hover:border-cyan-500/40'
                      }`}
                    >
                      {/* Card Header: Ticket Pill & Urgent Flag */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 truncate max-w-[170px]">
                            {bk.bookingId || bk.id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {bk.isUrgent && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                                <Zap size={10} /> PRIORITY
                              </span>
                            )}
                            {isDeclined && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono">
                                DECLINED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Vehicle Title & Plate */}
                        <h3 className="text-xl font-black text-white tracking-tight mb-2 group-hover:text-cyan-300 transition-colors">
                          {bk.vehicle || bk.vehicleModel || 'Standard Intake'}
                        </h3>

                        {/* License Plate Pill */}
                        <div className="mb-3">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-black/60 border border-slate-700 text-slate-200 font-mono text-[11px] font-bold tracking-wider">
                            {bk.plateNumber || 'DIRECT-IN'}
                          </span>
                        </div>

                        {/* Intake Type */}
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 flex items-center gap-2 mb-3">
                          <MapPin size={13} className="text-cyan-400 shrink-0" />
                          <span className="truncate">{bk.intakeType || 'Direct Garage Intake'}</span>
                        </div>

                        {/* Requested Schedule Info: Date, Time Slot & Turnaround */}
                        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1 mb-3">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-500 text-[10px] font-bold uppercase">Requested Slot:</span>
                            <span className="font-bold text-white flex items-center gap-1 text-[11px]">
                              <Calendar size={11} className="text-cyan-400" /> {bk.date || 'Today'} • {bk.timeSlot || bk.preferredTime || 'Morning'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-500 text-[10px] font-bold uppercase">Turnaround:</span>
                            <span className="font-semibold text-amber-300 text-[11px] flex items-center gap-1">
                              <Clock size={11} /> {bk.expectedDuration || bk.expectedTurnaround || 'Same Day'}
                            </span>
                          </div>
                        </div>

                        {/* Status Pill & Service Title */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              isDeclined ? 'bg-rose-500' : isDelivered ? 'bg-emerald-400' : isReady ? 'bg-yellow-400' : isInBay ? 'bg-cyan-400' : isProposal ? 'bg-amber-400 animate-pulse' : 'bg-amber-400'
                            }`} />
                            <span className="text-xs font-extrabold text-white">
                              {isDeclined ? 'Declined / Cancelled' : isDelivered ? 'Delivered' : isReady ? 'Ready' : isInBay ? 'Servicing' : isProposal ? 'Awaiting 24h Customer Confirmation' : 'Pending Approval'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-300 truncate max-w-[140px]">
                            {bk.service || bk.serviceType || 'Full Service'}
                          </span>
                        </div>

                        {/* ─── SCHEDULE DECISION BOX (FOR PENDING WORK ORDERS) ─── */}
                        {isPending && (
                          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                <Clock size={12} /> Schedule Decision Required
                              </span>
                              <span className="text-[10px] text-slate-400">Fits your schedule?</span>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5">
                              <button
                                onClick={() => handleDirectAccept(bk)}
                                className="w-full py-2 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                              >
                                <CheckCircle2 size={13} />
                                <span>Fits Schedule • Accept & Move to Bay</span>
                              </button>

                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  onClick={() => openRescheduleModal(bk)}
                                  className="py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                                >
                                  <span>🔄 Reschedule (24h)</span>
                                </button>
                                <button
                                  onClick={() => openDeclineModal(bk)}
                                  className="py-1.5 px-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                                >
                                  <span>✕ Decline</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ─── PROPOSAL SENT & 24H TIMER BANNER ─── */}
                        {isProposal && (
                          <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-1.5 animate-fade-in">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-extrabold text-amber-300 flex items-center gap-1">
                                ⏳ 24h Confirmation Window
                              </span>
                              <span className="font-mono text-amber-200 font-bold text-[10px]">
                                {getRemainingTime(bk.confirmationExpiresAt)}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-0.5 pt-1 border-t border-amber-500/20">
                              <p>Proposed: <strong className="text-white">{bk.proposedChanges?.date} • {bk.proposedChanges?.timeSlot}</strong></p>
                              <p>Expected Turnaround: <strong className="text-amber-300">{bk.proposedChanges?.expectedDuration}</strong></p>
                              {bk.proposedChanges?.quote && <p>Quote: <strong className="text-white font-mono">₹{bk.proposedChanges.quote}</strong></p>}
                            </div>
                            <button
                              onClick={() => openDeclineModal(bk)}
                              className="text-[10px] text-rose-400 hover:text-rose-300 underline pt-1 block"
                            >
                              Cancel Proposal
                            </button>
                          </div>
                        )}

                        {/* ─── DECLINED / CANCELLED TAG BANNER ─── */}
                        {isDeclined && (
                          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs space-y-1 animate-fade-in">
                            <div className="flex items-center justify-between text-rose-300 font-bold text-[11px]">
                              <span>❌ Request Cancelled / Declined</span>
                              <span className="text-[10px] text-slate-400">
                                By {bk.cancelledBy === 'customer' ? 'Customer' : 'Workshop'}
                              </span>
                            </div>
                            {bk.cancellationReason && (
                              <p className="text-[11px] text-slate-300 italic">
                                "{bk.cancellationReason}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Agile Checklist Bar */}
                        {!isDeclined && (
                          <div className="mb-5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                            <div className="flex items-center justify-between text-[11px] mb-1.5">
                              <span className="text-slate-400 flex items-center gap-1 font-semibold">
                                <CheckSquare size={12} className="text-cyan-400" /> Agile Checklist
                              </span>
                              <span className="text-amber-400 font-mono font-bold">
                                {doneTasks}/{totalTasks} Done ({progressPct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Customer & Manage Button */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Customer</p>
                          <p className="text-xs font-bold text-white truncate">{bk.customerName || bk.userName || 'Direct Walk-in'}</p>
                          {bk.customerPhone && (
                            <p className="text-[10px] text-slate-400 font-mono">{bk.customerPhone}</p>
                          )}
                        </div>

                        {isDeclined ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreBooking(bk)}
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-cyan-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                              title="Restore back to Pending Approvals"
                            >
                              <RotateCcw size={13} />
                              <span>Restore to Pending</span>
                            </button>
                            <button
                              onClick={() => openManageModal(bk)}
                              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Details</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openDeclineModal(bk)}
                              title="Cancel or Decline Request"
                              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs transition-all cursor-pointer"
                            >
                              ✕
                            </button>

                            <button
                              onClick={() => openInvoiceModal(bk)}
                              title="Professional Invoice & Bill"
                              className="px-3 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow"
                            >
                              <Receipt size={13} />
                              <span className="hidden sm:inline">Bill</span>
                            </button>

                            <button
                              onClick={() => openManageModal(bk)}
                              className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
                            >
                              <span>Manage</span>
                              <ArrowUpRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ─── GARAGE PROFILE & PHOTO SETTINGS TAB ─── */
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setIsEditingProfile(false);
                  setActiveTab('board');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-all border border-slate-800 hover:border-cyan-500/30 active:scale-95 shadow-md group cursor-pointer"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>← Back to Dispatch & Work Orders</span>
              </button>

              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 active:scale-95 transition-all"
                >
                  <Edit3 size={13} /> Edit Workshop Details
                </button>
              )}
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-white">Workshop Profile & Photo Management</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage your workshop cover photo, address, and live marketplace listing</p>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="rounded-3xl bg-[#0B0F17] p-6 sm:p-7 border border-slate-800 space-y-5">
                {/* Photo Uploader */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Camera size={14} className="text-cyan-400" /> Workshop Cover Photo <span className="text-rose-400">*</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black/50 h-44">
                      {editPhoto ? (
                        <img src={editPhoto} alt="Garage" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                          <Camera size={24} className="mb-1" /> No Photo Selected
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="w-full py-3.5 px-4 rounded-xl border border-dashed border-slate-700 hover:border-cyan-400 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-bold text-white">
                        <Upload size={16} className="text-cyan-400" /> Upload New Photo
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                      <input
                        type="url"
                        value={editPhoto}
                        onChange={e => setEditPhoto(e.target.value)}
                        placeholder="Or paste direct image URL"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Workshop Name</label>
                    <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="input-style" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
                    <input type="tel" required value={editPhone} onChange={e => setEditPhone(e.target.value)} className="input-style" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Number</label>
                    <input type="tel" value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} className="input-style" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                    <input type="text" required value={editCity} onChange={e => setEditCity(e.target.value)} className="input-style" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Street Address</label>
                  <input type="text" required value={editAddress} onChange={e => setEditAddress(e.target.value)} className="input-style" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">About / Description</label>
                  <textarea rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} className="input-style resize-none" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSavingProfile} className="flex-1 py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5">
                    {isSavingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Read Only View */
              <div className="space-y-5 rounded-3xl bg-[#0B0F17] p-6 border border-slate-800">
                <div className="relative h-56 rounded-2xl overflow-hidden border border-slate-800">
                  <img src={garage.photo || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?w=1200&q=80'} alt="Garage" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-6 justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-white">{garage.garageName}</h3>
                      <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                        <MapPin size={12} className="text-cyan-400" /> {garage.address}, {garage.city}
                      </p>
                    </div>
                    <button onClick={() => setIsEditingProfile(true)} className="px-3.5 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 hover:bg-white/30 cursor-pointer">
                      <Camera size={13} /> Change Photo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Contact Phone</p>
                    <p className="text-sm font-bold text-white mt-0.5">{garage.phone || '—'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">WhatsApp</p>
                    <p className="text-sm font-bold text-white mt-0.5">{garage.whatsapp || garage.phone || '—'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">City & Region</p>
                    <p className="text-sm font-bold text-white mt-0.5">{garage.city || '—'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => setActiveTab('board')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    <ArrowLeft size={15} />
                    <span>Back to Work Orders Board</span>
                  </button>

                  <Link to={`/garage/${currentUser.uid}`} target="_blank" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all">
                    <Eye size={14} className="text-cyan-400" /> View Live Marketplace Page
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── MODAL 1: ADD VEHICLE / WALK-IN ─── */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-slate-800 w-full max-w-lg shadow-2xl p-6 relative">
            <button onClick={() => setIsAddVehicleOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">✕</button>

            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <Plus size={18} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Add Vehicle / Walk-in Intake</h3>
                <p className="text-xs text-slate-400">Intake on-spot customer vehicle directly into bay</p>
              </div>
            </div>

            <form onSubmit={handleAddWalkinSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle Model *</label>
                  <input
                    type="text"
                    required
                    value={walkinVehicle.vehicleModel}
                    onChange={e => setWalkinVehicle(prev => ({ ...prev, vehicleModel: e.target.value }))}
                    placeholder="e.g. Mercedes GLS 200"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">License Plate Number</label>
                  <input
                    type="text"
                    value={walkinVehicle.plateNumber}
                    onChange={e => setWalkinVehicle(prev => ({ ...prev, plateNumber: e.target.value }))}
                    placeholder="e.g. MH10PS10"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={walkinVehicle.customerName}
                    onChange={e => setWalkinVehicle(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="e.g. Amit Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    value={walkinVehicle.customerPhone}
                    onChange={e => setWalkinVehicle(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Service Package</label>
                  <select
                    value={walkinVehicle.serviceType}
                    onChange={e => setWalkinVehicle(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  >
                    <option value="Full Service">Full Service</option>
                    <option value="Wheel Alignment">Wheel Alignment</option>
                    <option value="AC Service">AC Service</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Engine Repair">Engine Repair</option>
                    <option value="EV Servicing">EV Servicing</option>
                    <option value="Denting & Painting">Denting & Painting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    value={walkinVehicle.estimatedCost}
                    onChange={e => setWalkinVehicle(prev => ({ ...prev, estimatedCost: e.target.value }))}
                    placeholder="1500"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Priority Express Toggle */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-rose-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Priority Urgent Express</p>
                    <p className="text-[10px] text-slate-400">Fast-track bay slot allocation (+₹500)</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={walkinVehicle.isUrgent}
                  onChange={e => setWalkinVehicle(prev => ({ ...prev, isUrgent: e.target.checked }))}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingWalkin}
                className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmittingWalkin ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>Confirm & Intake into Live Bay</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: MANAGE & QUOTE WORK ORDER ─── */}
      {isManageModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-slate-800 w-full max-w-2xl shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setIsManageModalOpen(false)} className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white">✕</button>

            {/* Modal Header */}
            <div className="mb-5 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {selectedBooking.bookingId || selectedBooking.id}
                </span>
                <span className="text-xs font-bold text-slate-400">Work Order & Dispatch Desk</span>
              </div>
              <h2 className="text-2xl font-black text-white">
                {selectedBooking.vehicle || selectedBooking.vehicleModel || 'Intake Vehicle'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Client: <strong className="text-white">{selectedBooking.customerName || selectedBooking.userName}</strong> ({selectedBooking.customerPhone || 'Phone unlisted'})
              </p>
            </div>

            {/* ─── 6-STAGE PROGRESSIVE STEPPER WITH COMPLETION TICKS ─── */}
            <div className="space-y-3 mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Update Work Stage ({WORK_FLOW_STAGES.findIndex(s => s.id === manageStatus) + 1}/6)
                </label>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  Stage: {WORK_FLOW_STAGES.find(s => s.id === manageStatus)?.stageName || manageStatus}
                </span>
              </div>

              {/* Interactive Stage Pipeline Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {WORK_FLOW_STAGES.map((st, idx) => {
                  const currentIdx = WORK_FLOW_STAGES.findIndex(s => s.id === manageStatus);
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setManageStatus(st.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer flex flex-col justify-between min-h-[72px] ${
                        isCurrent
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50 scale-[1.02]'
                          : isCompleted
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span>{st.icon}</span>
                        {isCompleted ? (
                          <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        ) : (
                          <span className="text-[10px] text-slate-600">○</span>
                        )}
                      </div>
                      <div>
                        <p className={`text-[11px] font-bold ${isCurrent ? 'text-white' : isCompleted ? 'text-emerald-300' : 'text-slate-400'}`}>
                          {st.label}
                        </p>
                        <span className={`text-[9px] block ${isCurrent ? 'text-cyan-300 font-bold' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isCurrent ? 'Active Now' : isCompleted ? 'Completed' : 'Upcoming'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 1-Click Advance Button */}
              {WORK_FLOW_STAGES.findIndex(s => s.id === manageStatus) < WORK_FLOW_STAGES.length - 1 && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = WORK_FLOW_STAGES.findIndex(s => s.id === manageStatus);
                      if (cur < WORK_FLOW_STAGES.length - 1) {
                        setManageStatus(WORK_FLOW_STAGES[cur + 1].id);
                        addToast(`Advanced vehicle to stage: ${WORK_FLOW_STAGES[cur + 1].stageName} 🚗`, 'info');
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>✓ Complete & Advance to Next Stage</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Agile Checklist Interactive Editor */}
            <div className="space-y-3 mb-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-cyan-400" /> Live Agile Task Checklist
                </span>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  {manageTasks.filter(t => t.status === 'Done').length}/{manageTasks.length} Completed
                </span>
              </div>

              <div className="space-y-2">
                {manageTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskStatus(task.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      task.status === 'Done'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : task.status === 'In Progress'
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-xs font-medium">
                      <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        task.status === 'Done' ? 'bg-emerald-400 text-slate-950 font-black' : 'border border-slate-600'
                      }`}>
                        {task.status === 'Done' && '✓'}
                      </div>
                      <span className={task.status === 'Done' ? 'line-through text-slate-400' : ''}>{task.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'Done' ? 'bg-emerald-500/20 text-emerald-400' : task.status === 'In Progress' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add Custom Task Input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Add custom task (e.g. Flush Radiator Coolant)..."
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Expected Estimate & Delivery Billing Notice */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-400" /> Expected Estimate & Delivery Billing
                </span>
                <span className="text-[11px] text-slate-400">
                  {manageStatus === 'ready' || manageStatus === 'completed' ? '🏁 Ready for Official Bill' : '⏳ In Progress'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">Expected Cost Estimate (₹)</label>
                  <input
                    type="number"
                    value={manageQuote}
                    onChange={e => setManageQuote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">Dispatch Notes for Customer</label>
                  <input
                    type="text"
                    value={manageNotes}
                    onChange={e => setManageNotes(e.target.value)}
                    placeholder="e.g. Brake pads inspected. Spare parts being fitted."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/30 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manageBillAtDelivery}
                    onChange={e => setManageBillAtDelivery(e.target.checked)}
                    className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
                  />
                  <span>Generate official itemized bill at delivery (inclusive of genuine spare parts)</span>
                </label>
              </div>
            </div>

            {/* Open Professional Invoice & Deliver Button */}
            <button
              type="button"
              onClick={() => {
                setIsManageModalOpen(false);
                openInvoiceModal(selectedBooking);
              }}
              className="w-full mb-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all active:scale-98"
            >
              <Receipt size={16} className="text-emerald-400" />
              <span>🧾 Generate Professional Bill, Adjust Costs & Deliver</span>
            </button>

            {/* Direct Contact Actions */}
            {selectedBooking.customerPhone && (
              <div className="mb-6 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Customer: {selectedBooking.customerName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedBooking.customerPhone}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${selectedBooking.customerPhone}`}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1"
                  >
                    <Phone size={12} /> Call
                  </a>
                  <a
                    href={`https://wa.me/${selectedBooking.customerPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                </div>
              </div>
            )}

            {/* Save & Decline Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsManageModalOpen(false);
                  openDeclineModal(selectedBooking);
                }}
                className="px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✕ Decline / Cancel Order</span>
              </button>

              <div className="flex-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveManageBooking}
                  disabled={isSavingManage}
                  className="flex-1 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingManage ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  <span>Save Work Order Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: SEASONAL DISCOUNTS & OFFERS MANAGEMENT (ADD & REMOVE) ─── */}
      {isOffersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-amber-500/40 w-full max-w-xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsOffersOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">✕</button>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Workshop Seasonal Offers & Discounts</h3>
                  <p className="text-xs text-slate-400">Add, manage and publish promo codes visible to your customers</p>
                </div>
              </div>

              {!isAddingOffer && (
                <button
                  onClick={() => setIsAddingOffer(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <PlusCircle size={14} /> Add Offer
                </button>
              )}
            </div>

            {/* Expandable Add Offer Form */}
            {isAddingOffer && (
              <form onSubmit={handleCreateOffer} className="mb-5 p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={13} /> Create New Promotional Discount
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingOffer(false)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Coupon / Promo Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MONSOON25"
                      value={newOfferCode}
                      onChange={e => setNewOfferCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white text-xs font-mono font-bold placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Discount Tag / Value *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 25% OFF or ₹500 OFF"
                      value={newOfferValue}
                      onChange={e => setNewOfferValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-amber-300 text-xs font-bold placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Offer Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monsoon Brake & Tyre Inspection Special"
                    value={newOfferTitle}
                    onChange={e => setNewOfferTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white text-xs placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Description / Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. Applicable on all periodic service & brake overhaul bookings."
                    value={newOfferDesc}
                    onChange={e => setNewOfferDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white text-xs placeholder:text-slate-600"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingOffer(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingOffer}
                    className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isSavingOffer ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save & Publish Offer</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of active offers */}
            <div className="space-y-3">
              {offers.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center">
                  <Tag size={28} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-bold text-white">No active seasonal offers</p>
                  <p className="text-xs text-slate-500 mt-1">Click "+ Add Offer" above to create promotional vouchers for your garage.</p>
                </div>
              ) : (
                offers.map(o => (
                  <div key={o.code} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 group hover:border-amber-500/30 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {o.code}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{o.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{o.desc}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs sm:text-sm font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                        {o.value}
                      </span>
                      <button
                        type="button"
                        title="Remove Offer"
                        onClick={() => handleDeleteOffer(o.code)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsOffersOpen(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-all cursor-pointer"
            >
              Done / Close Offers
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: INTELLIGENCE METRICS & CUSTOMER CRM PANEL ─── */}
      {isIntelligenceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-purple-500/40 w-full max-w-3xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsIntelligenceOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">✕</button>

            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Workshop Intelligence & Customer CRM</h3>
                <p className="text-xs text-slate-400">Complete customer directory, lifetime metrics & vehicle service history</p>
              </div>
            </div>

            {/* Top KPI Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Clients</p>
                <p className="text-xl font-black text-white mt-1">{customerDirectory.length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Registered clients</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Revenue</p>
                <p className="text-xl font-black text-emerald-400 mt-1">₹{totalLifetimeRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Lifetime gross</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Repeat Clients</p>
                <p className="text-xl font-black text-cyan-400 mt-1">{repeatRate}%</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{repeatCustomersCount} loyal customers</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Live Bay Load</p>
                <p className="text-xl font-black text-purple-400 mt-1">{inBayCount} active</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Vehicles in bay</p>
              </div>
            </div>

            {/* Customer Directory Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-purple-400" />
                  Customer Directory & Essential Info ({filteredCustomers.length})
                </h4>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name, phone, plate..."
                    value={crmSearch}
                    onChange={e => setCrmSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500"
                  />
                </div>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center">
                  <Users size={28} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-bold text-white">No customers found</p>
                  <p className="text-xs text-slate-500 mt-1">Bookings and walk-in clients will automatically populate here with their complete service profiles.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {filteredCustomers.map((cust, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/30 transition-all space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                            {cust.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-white">{cust.name}</h5>
                            <p className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>{cust.phone}</span>
                              {cust.email && cust.email !== 'walkin@customer.com' && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500">{cust.email}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Direct Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {cust.phone && cust.phone !== '9876543210' && (
                            <>
                              <a
                                href={`tel:${cust.phone}`}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                              >
                                <Phone size={12} /> Call
                              </a>
                              <a
                                href={`https://wa.me/91${cust.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                              >
                                <MessageCircle size={12} /> WhatsApp
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Details row: Vehicles, Lifetime Spend, Visits */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Vehicles Serviced</span>
                          <span className="text-slate-200 font-medium truncate block">
                            {cust.vehiclesList.length > 0 ? cust.vehiclesList.join(', ') : 'Direct Client'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Visits & Spend</span>
                          <span className="text-emerald-400 font-bold">
                            {cust.totalBookings} visits • ₹{cust.totalSpend.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Latest Service / Date</span>
                          <span className="text-slate-300 font-medium">
                            {cust.recentService || 'General Service'} {cust.lastDate ? `(${cust.lastDate})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsIntelligenceOpen(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/30 transition-all cursor-pointer"
            >
              Close Intelligence Panel
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: RESCHEDULE PROPOSAL & 24H CONFIRMATION WINDOW ─── */}
      {isRescheduleOpen && rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-amber-500/40 w-full max-w-lg shadow-2xl p-6 sm:p-7 relative">
            <button onClick={() => setIsRescheduleOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">✕</button>

            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Propose Schedule Changes</h3>
                <p className="text-xs text-slate-400">Customer will receive a 24-hour window to review and confirm</p>
              </div>
            </div>

            <form onSubmit={handleSendProposalSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <p className="text-slate-400">Vehicle: <strong className="text-white">{rescheduleBooking.vehicle || rescheduleBooking.vehicleModel}</strong></p>
                <p className="text-slate-400">Client: <strong className="text-white">{rescheduleBooking.customerName || rescheduleBooking.userName}</strong> ({rescheduleBooking.customerPhone || 'N/A'})</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">New Proposed Date *</label>
                  <input
                    type="date"
                    required
                    value={propDate}
                    onChange={e => setPropDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">New Time Slot *</label>
                  <select
                    value={propTimeSlot}
                    onChange={e => setPropTimeSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  >
                    <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                    <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                    <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                    <option value="06:00 PM - 08:00 PM">06:00 PM - 08:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Adjusted Turnaround</label>
                  <select
                    value={propDuration}
                    onChange={e => setPropDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  >
                    <option value="Same Day (2 - 4 Hours)">Same Day (2 - 4 Hours)</option>
                    <option value="Same Day (6 - 8 Hours)">Same Day (6 - 8 Hours)</option>
                    <option value="1 Day (Next Day Pickup)">1 Day (Next Day Pickup)</option>
                    <option value="2 - 3 Days">2 - 3 Days</option>
                    <option value="Flexible / As evaluated">Flexible / As Evaluated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Proposed Quote (₹)</label>
                  <input
                    type="number"
                    value={propQuote}
                    onChange={e => setPropQuote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Note for Customer</label>
                <textarea
                  rows={3}
                  required
                  value={propNote}
                  onChange={e => setPropNote(e.target.value)}
                  placeholder="Explain why the date or time slot was adjusted..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                <Clock size={15} className="shrink-0 text-amber-400" />
                <span>Customer must confirm this proposal within <strong>24 hours</strong>. If expired, both parties can cancel or re-book.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingProposal}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingProposal ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                  <span>Send 24-Hour Confirmation Proposal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 7: PROFESSIONAL INVOICE & BILLING STUDIO ─── */}
      {isInvoiceOpen && invoiceBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:static">
          <div className="rounded-3xl bg-[#0B0F17] border border-emerald-500/40 w-full max-w-4xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto relative print:border-none print:shadow-none print:max-h-full print:p-8 print:bg-white print:text-black">
            
            {/* Modal Top Actions (Hidden in Print) */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Professional Workshop Invoice Studio</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {invoiceNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Adjust bill costs, add parts, apply discounts, print PDF or send to WhatsApp</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  <Printer size={14} className="text-cyan-400" />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendInvoiceWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/30"
                >
                  <MessageCircle size={14} />
                  <span>Send WhatsApp</span>
                </button>
                <button onClick={() => setIsInvoiceOpen(false)} className="p-2 text-slate-400 hover:text-white cursor-pointer ml-1">✕</button>
              </div>
            </div>

            {/* ─── OFFICIAL PRINTABLE INVOICE DOCUMENT ─── */}
            <div id="official-invoice-sheet" className="space-y-6 print:space-y-4">
              
              {/* Workshop & Invoice Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-white print:border-b-2 print:border-black print:p-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white print:text-black">
                      {garage?.garageName || 'VahanSangam Workshop'}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 print:border-black print:text-black">
                      Verified Workshop
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 print:text-gray-700 mt-1 flex items-center gap-1">
                    <MapPin size={12} className="text-cyan-400 print:hidden" /> {garage?.address || 'Workshop Service Bay'}, {garage?.city || ''}
                  </p>
                  <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
                    Phone: {garage?.phone || '+91 98765 43210'} • WhatsApp: {garage?.whatsapp || garage?.phone || '+91 98765 43210'}
                  </p>
                </div>

                <div className="sm:text-right">
                  <div className="inline-block bg-black/40 print:bg-white px-3 py-1 rounded-xl border border-slate-800 print:border-none">
                    <p className="text-[10px] text-slate-400 print:text-gray-500 uppercase font-bold">Tax Invoice</p>
                    <p className="text-sm font-mono font-black text-emerald-400 print:text-black">{invoiceNumber}</p>
                  </div>
                  <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                    Date: <strong>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </p>
                  <div className="mt-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      invoicePaymentStatus === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    } print:border-black print:text-black`}>
                      Payment: {invoicePaymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer & Vehicle Billed To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs print:bg-white print:border print:border-gray-300">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-500 mb-1">Billed To (Client)</p>
                  <p className="text-sm font-black text-white print:text-black">
                    {invoiceBooking.customerName || invoiceBooking.userName || 'Walk-in Client'}
                  </p>
                  <p className="text-slate-300 print:text-gray-700 mt-0.5">Phone: {invoiceBooking.customerPhone || 'N/A'}</p>
                  {invoiceBooking.customerEmail && (
                    <p className="text-slate-400 print:text-gray-600">{invoiceBooking.customerEmail}</p>
                  )}
                  {invoiceBooking.customerAddress && (
                    <p className="text-slate-400 print:text-gray-600 mt-0.5">{invoiceBooking.customerAddress}</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-500 mb-1">Vehicle Serviced</p>
                  <p className="text-sm font-black text-cyan-300 print:text-black">
                    {invoiceBooking.vehicle || invoiceBooking.vehicleModel || 'Vehicle'}
                  </p>
                  <p className="text-slate-300 print:text-gray-700 mt-0.5 font-mono">
                    Plate No: <strong className="text-white print:text-black">{invoiceBooking.plateNumber || 'N/A'}</strong>
                  </p>
                  <p className="text-slate-400 print:text-gray-600 mt-0.5">
                    Service Job: {invoiceBooking.service || invoiceBooking.serviceType || 'General Periodic Service'}
                  </p>
                </div>
              </div>

              {/* Itemized Particulars Table (Editable in Web Mode) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider print:text-black">
                    Itemized Particulars, Spare Parts & Labour
                  </h4>
                  <span className="text-[11px] text-slate-400 print:hidden">
                    {invoiceItems.length} line items
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/40 print:border print:border-gray-300 print:bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-[11px] text-slate-400 uppercase font-bold border-b border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">
                        <th className="py-3 px-4">Item / Service Particulars</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 w-16 text-center">Qty</th>
                        <th className="py-3 px-3 w-28 text-right">Price (₹)</th>
                        <th className="py-3 px-4 w-28 text-right">Amount (₹)</th>
                        <th className="py-3 px-2 w-10 text-center print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                      {invoiceItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-900/60 print:hover:bg-transparent">
                          <td className="py-3 px-4 font-semibold text-white print:text-black">
                            {item.name}
                          </td>
                          <td className="py-3 px-3 text-slate-400 print:text-gray-600">
                            <span className="px-2 py-0.5 rounded bg-slate-800 print:bg-gray-100 text-[10px]">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.qty || 1}
                              onChange={e => updateInvoiceItemQty(item.id, e.target.value)}
                              className="w-12 text-center py-1 bg-black/40 border border-slate-700 rounded-lg text-white text-xs print:border-none print:bg-transparent print:text-black font-bold"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={item.price}
                              onChange={e => updateInvoiceItemPrice(item.id, e.target.value)}
                              className="w-20 text-right py-1 px-1.5 bg-black/40 border border-slate-700 rounded-lg text-white text-xs print:border-none print:bg-transparent print:text-black font-mono font-bold"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white print:text-black">
                            ₹{((Number(item.price) || 0) * (Number(item.qty) || 1)).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-2 text-center print:hidden">
                            {invoiceItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeInvoiceItem(item.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Custom Bill Item Row (Hidden in Print) */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 print:hidden">
                  <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                    <Plus size={12} /> Add Item / Spare Part / Fluid to Bill
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <input
                      type="text"
                      placeholder="Item name (e.g. 5W-40 Synthetic Oil 3.5L)"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      className="sm:col-span-2 px-3 py-1.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs placeholder:text-slate-600"
                    />
                    <select
                      value={newItemCategory}
                      onChange={e => setNewItemCategory(e.target.value)}
                      className="px-2 py-1.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                    >
                      <option value="Labour & Service">Labour & Service</option>
                      <option value="Spare Parts">Spare Parts</option>
                      <option value="Oils & Fluids">Oils & Fluids</option>
                      <option value="Electrical & Battery">Electrical & Battery</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={newItemQty}
                        onChange={e => setNewItemQty(e.target.value)}
                        className="w-14 px-2 py-1.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs font-bold text-center"
                      />
                      <input
                        type="number"
                        placeholder="Price ₹"
                        value={newItemPrice}
                        onChange={e => setNewItemPrice(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addInvoiceItem}
                      className="py-1.5 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs cursor-pointer shadow transition-all active:scale-95"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Adjustments & Surcharges Panel (Urgent Fee + Discounts + Tax) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left: Discounts & Urgent Fee Controls (Interactive) */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 print:hidden">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Bill Adjustments & Discounts
                  </h4>

                  {/* Urgent Surcharge Option */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invoiceIsUrgent}
                        onChange={e => setInvoiceIsUrgent(e.target.checked)}
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                          <Flame size={12} className="text-amber-400" /> Urgent Express Surcharge
                        </span>
                        <span className="text-[10px] text-amber-200/60 block">Fast-track bay turnaround</span>
                      </div>
                    </label>

                    {invoiceIsUrgent && (
                      <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        <span className="text-xs text-amber-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={invoiceUrgentFee}
                          onChange={e => setInvoiceUrgentFee(Number(e.target.value) || 0)}
                          className="w-16 bg-transparent text-amber-300 font-bold text-xs outline-none text-right"
                        />
                      </div>
                    )}
                  </div>

                  {/* Discount Facility */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase">
                      Special Discount Facility (₹)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={invoiceDiscount}
                        onChange={e => {
                          setInvoiceDiscount(Number(e.target.value) || 0);
                          setInvoiceDiscountCode('');
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-slate-700 text-emerald-400 font-bold text-xs"
                      />
                      {invoiceDiscount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceDiscount(0);
                            setInvoiceDiscountCode('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold hover:bg-rose-500/30"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Quick Pick from Workshop Offers */}
                    {offers.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-500 block mb-1">Apply Workshop Promo Voucher:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {offers.map(o => (
                            <button
                              key={o.code}
                              type="button"
                              onClick={() => applyPromoToInvoice(o.code)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                invoiceDiscountCode === o.code
                                  ? 'bg-amber-400 text-slate-950 font-black'
                                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                              }`}
                            >
                              {o.code} ({o.value})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Method & Tax Select */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Status</label>
                      <select
                        value={invoicePaymentStatus}
                        onChange={e => setInvoicePaymentStatus(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs font-bold"
                      >
                        <option value="PAID">PAID (Settled)</option>
                        <option value="PENDING">PENDING</option>
                        <option value="UPI / Online">UPI / Online</option>
                        <option value="Cash on Delivery">Cash on Delivery</option>
                        <option value="Card Swipe">Card Swipe</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">GST Tax Rate</label>
                      <select
                        value={invoiceTaxRate}
                        onChange={e => setInvoiceTaxRate(Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-xl bg-black/40 border border-slate-700 text-white text-xs font-bold"
                      >
                        <option value="0">0% (Nil / Exempted)</option>
                        <option value="18">18% GST (Standard)</option>
                        <option value="5">5% GST</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right: Grand Total Summary Box (Formatted for Print) */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between print:bg-white print:border print:border-gray-300">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400 print:text-gray-600">
                      <span>Subtotal (Labour & Parts):</span>
                      <span className="font-mono text-white print:text-black">₹{invoiceSubtotal.toLocaleString('en-IN')}</span>
                    </div>

                    {invoiceUrgentAmount > 0 && (
                      <div className="flex justify-between text-amber-400 print:text-black">
                        <span className="flex items-center gap-1"><Flame size={12} /> Urgent Express Bay Fee:</span>
                        <span className="font-mono font-bold">+₹{invoiceUrgentAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {invoiceDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 print:text-black">
                        <span>Discount Applied {invoiceDiscountCode ? `(${invoiceDiscountCode})` : ''}:</span>
                        <span className="font-mono font-bold">-₹{invoiceDiscountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {invoiceTaxAmount > 0 && (
                      <div className="flex justify-between text-slate-400 print:text-gray-600">
                        <span>GST ({invoiceTaxRate}%):</span>
                        <span className="font-mono text-white print:text-black">+₹{invoiceTaxAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800 print:border-black flex justify-between items-baseline">
                      <span className="text-sm font-black text-white print:text-black uppercase">Net Total Payable:</span>
                      <span className="text-2xl font-black text-emerald-400 print:text-black font-mono">
                        ₹{invoiceGrandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Stamp & Authorized Signature Footer (Printable) */}
                  <div className="mt-6 pt-4 border-t border-dashed border-slate-800 print:border-gray-400 flex items-end justify-between text-[11px] text-slate-400 print:text-gray-600">
                    <div>
                      <p className="font-bold text-white print:text-black">{garage?.garageName || 'Workshop'}</p>
                      <p className="text-[10px]">Authorized Signature & Stamp</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] text-slate-500">VahanSangam Cloud Invoice</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Bottom Action Controls (Hidden in Print) */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3 print:hidden">
              <button
                type="button"
                onClick={() => setIsInvoiceOpen(false)}
                className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handlePrintInvoice}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              >
                <Printer size={14} className="text-cyan-400" />
                <span>Print PDF Bill</span>
              </button>

              <button
                type="button"
                onClick={handleSendInvoiceWhatsApp}
                className="px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-emerald-500/30"
              >
                <MessageCircle size={14} />
                <span>Send WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveAndDeliverInvoice(false)}
                disabled={isSavingInvoice}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>Save Bill</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveAndDeliverInvoice(true)}
                disabled={isSavingInvoice}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSavingInvoice ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Finalize Bill & Mark Delivered</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL 8: WORKSHOP SERVICE RATES & PRICING CATALOG ─── */}
      {isServiceRatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="rounded-3xl bg-[#0B0F17] border border-emerald-500/40 w-full max-w-3xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsServiceRatesOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">✕</button>

            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Workshop Service Catalog & Price Management</h3>
                  <p className="text-xs text-slate-400">Manage standard pricing for tyre, oil, minor repairs, spare parts & custom jobs</p>
                </div>
              </div>
            </div>

            {/* Quick Add Custom Service or Spare Part Form */}
            <form onSubmit={handleCreateCustomService} className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <PlusCircle size={14} /> Add New Workshop Service / Spare Part Offering
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Service / Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Radiator Coolant Flush, Hybrid Inverter Scan..."
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white text-xs placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Default Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 799"
                    value={newServicePrice}
                    onChange={e => setNewServicePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-emerald-400 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Service Category</label>
                  <select
                    value={newServiceCategory}
                    onChange={e => setNewServiceCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white text-xs"
                  >
                    <option value="Periodic Maintenance">Periodic Maintenance</option>
                    <option value="Fluids & Engine">Fluids & Engine</option>
                    <option value="Wheels & Tyres">Wheels & Tyres (Tyre Care)</option>
                    <option value="Electrical & Diagnostics">Electrical & Diagnostics (Minor Work)</option>
                    <option value="Mechanical Overhaul">Mechanical Overhaul & Spare Parts</option>
                    <option value="Climate & AC">Climate & AC Care</option>
                    <option value="Braking & Safety">Braking & Safety</option>
                    <option value="Body & Paint">Body & Paint</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Short Description / Scope</label>
                  <input
                    type="text"
                    placeholder="e.g. Full system inspection with certified warranty."
                    value={newServiceDesc}
                    onChange={e => setNewServiceDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white text-xs placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Plus size={14} /> Add to Workshop Rates
                </button>
              </div>
            </form>

            {/* List of All Services with Editable Prices */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Workshop Services & Default Labor Rates ({serviceCatalog.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Update any price & click Save below
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {serviceCatalog.map(srv => (
                  <div
                    key={srv.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs font-black text-white">{srv.name}</h5>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {srv.category || 'Service'}
                        </span>
                        {srv.billNotice && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Spare Parts Billed at Delivery
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{srv.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-400">Rate: ₹</span>
                      <input
                        type="number"
                        value={srv.defaultPrice || 0}
                        onChange={e => handleUpdateServicePrice(srv.id, e.target.value)}
                        className="w-24 px-2.5 py-1.5 rounded-xl bg-black/50 border border-slate-700 text-emerald-400 font-mono font-bold text-xs text-right outline-none focus:border-emerald-400 transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Bottom Save Action */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setServiceCatalog(defaultServicesCatalog)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Reset to Standard Rates
              </button>

              <div className="flex-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsServiceRatesOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveServiceRates}
                  disabled={isSavingRates}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingRates ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Workshop Service Rates</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
