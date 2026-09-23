import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Clock, Phone, Shield, Wrench, ChevronLeft, CheckCircle2,
  Calendar, Car, MessageCircle, Share2, Heart, ArrowRight, ThumbsUp,
  Edit3, Send, User, AlertCircle, Loader2, Zap, Flame, Tag
} from 'lucide-react';
import {
  doc, getDoc, collection, addDoc, getDocs, query, where,
  orderBy, serverTimestamp, updateDoc, runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

// Star rating input component
function StarInput({ value, onChange, size = 28 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95"
          aria-label={`Rate ${s} star${s !== 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={`transition-colors ${
              s <= (hovered || value)
                ? 'text-amber-400'
                : 'text-gray-600'
            }`}
            fill={s <= (hovered || value) ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}

// Individual review card
function ReviewCard({ review, currentUserId, onHelpful }) {
  const [helped, setHelped] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const handleHelpful = () => {
    if (helped) return;
    setHelped(true);
    onHelpful?.(review.id);
  };

  const formatDate = (dateObj) => {
    try {
      const d = dateObj?.toDate ? dateObj.toDate() : new Date(dateObj);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const initials = (review.userName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 hover:border-white/15 transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {review.userPhoto ? (
          <img src={review.userPhoto} alt={review.userName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/20 flex items-center justify-center text-accent font-extrabold text-sm shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{review.userName}</p>
            <span className="text-[11px] text-gray-500 shrink-0">{formatDate(review.createdAt)}</span>
          </div>
          {/* Stars */}
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                size={12}
                className={s <= review.rating ? 'text-amber-400' : 'text-gray-700'}
                fill={s <= review.rating ? 'currentColor' : 'none'}
              />
            ))}
            <span className="text-[11px] text-gray-500 ml-1">{review.rating}/5</span>
          </div>
        </div>
      </div>

      {/* Review text */}
      <p className="text-sm text-gray-300 leading-relaxed mb-3">{review.comment}</p>

      {/* Optional Customer Photo */}
      {review.photo && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className="group relative rounded-xl overflow-hidden border border-white/15 hover:border-accent/50 transition-all text-left block"
          >
            <img
              src={review.photo}
              alt="Service feedback"
              className="w-32 h-24 object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-md font-semibold backdrop-blur-sm">
                🔍 View Photo
              </span>
            </div>
          </button>

          {/* Lightbox Modal */}
          {showPhotoModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
              onClick={() => setShowPhotoModal(false)}
            >
              <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-all"
                >
                  ✕
                </button>
                <img src={review.photo} alt="Feedback full view" className="max-w-full max-h-[80vh] object-contain" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Helpful button */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/6">
        <button
          onClick={handleHelpful}
          disabled={helped}
          className={`flex items-center gap-1.5 text-xs font-medium transition-all px-2.5 py-1.5 rounded-lg
            ${helped
              ? 'text-accent bg-accent/10 border border-accent/20'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
        >
          <ThumbsUp size={12} fill={helped ? 'currentColor' : 'none'} />
          Helpful {(review.helpfulCount || 0) + (helped ? 1 : 0) > 0 && `(${(review.helpfulCount || 0) + (helped ? 1 : 0)})`}
        </button>
        {review.userId === currentUserId && (
          <span className="text-[10px] text-accent bg-accent/10 px-2 py-1 rounded-lg border border-accent/20">
            Your review
          </span>
        )}
      </div>
    </div>
  );
}

// Rating distribution bar
function RatingBar({ star, count, total }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-3 text-right">{star}</span>
      <Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-gray-500 w-5 text-right">{count}</span>
    </div>
  );
}

export default function GarageDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, userProfile } = useAuth();
  const { addToast } = useToast();

  const [garage, setGarage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(location.state?.openBooking || false);
  const [saved, setSaved] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [userExistingReview, setUserExistingReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhoto, setReviewPhoto] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [ratingDistribution, setRatingDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  // Booking form state
  const [bookingService, setBookingService] = useState('');
  const [bookingVehicle, setBookingVehicle] = useState('');
  const [bookingPlate, setBookingPlate] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTimeSlot, setBookingTimeSlot] = useState('10:00 AM - 12:00 PM');
  const [bookingExpectedDuration, setBookingExpectedDuration] = useState('Same Day (2 - 4 Hours)');
  const [bookingIsUrgent, setBookingIsUrgent] = useState(false);
  const [bookingNote, setBookingNote] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchGarage();
    fetchReviews();
    if (location.state?.openBooking) {
      navigate(`/book-service?garageId=${id}`, { state: { garageId: id } });
    }
  }, [id, location.state]);

  const fetchGarage = async () => {
    try {
      const snap = await getDoc(doc(db, 'garages', id));
      if (snap.exists()) {
        setGarage({ id: snap.id, ...snap.data() });
      } else {
        setGarage(null);
      }
    } catch (err) {
      console.error('Error fetching garage:', err);
      setGarage(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('garageId', '==', id)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setReviews([]);
        computeDistribution([]);
      } else {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
          return timeB - timeA;
        });
        setReviews(list);
        computeDistribution(list);
        if (currentUser) {
          const mine = list.find(r => r.userId === currentUser.uid);
          setUserExistingReview(mine || null);
        }
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviews([]);
      computeDistribution([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const computeDistribution = (list) => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    list.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++; });
    setRatingDistribution(dist);
  };

  const handleReviewPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size should be less than 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReviewPhoto(reader.result);
      addToast('Photo attached to review!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/garage/${id}` } });
      return;
    }
    if (reviewRating === 0) {
      addToast('Please select a star rating.', 'error');
      return;
    }
    if (reviewComment.trim().length < 10) {
      addToast('Please write at least 10 characters in your review.', 'error');
      return;
    }

    setReviewSubmitting(true);
    try {
      const reviewData = {
        garageId: id,
        garageName: garage?.garageName || 'Garage',
        garageAddress: garage?.address || garage?.city || '',
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.displayName || 'Anonymous',
        userPhoto: currentUser.photoURL || null,
        rating: reviewRating,
        comment: reviewComment.trim(),
        photo: reviewPhoto || null,
        helpfulCount: 0,
        createdAt: serverTimestamp()
      };

      // Save review to Firestore
      const reviewRef = await addDoc(collection(db, 'reviews'), reviewData);

      // Update garage's avg rating using a Firestore transaction
      try {
        await runTransaction(db, async (transaction) => {
          const garageRef = doc(db, 'garages', id);
          const garageSnap = await transaction.get(garageRef);
          if (garageSnap.exists()) {
            const data = garageSnap.data();
            const currentTotal = data.totalRatings || 0;
            const currentRating = data.rating || 0;
            const newTotal = currentTotal + 1;
            const newRating = ((currentRating * currentTotal) + reviewRating) / newTotal;
            transaction.update(garageRef, {
              rating: Math.round(newRating * 10) / 10,
              totalRatings: newTotal
            });
          }
        });
      } catch (txErr) {
        console.warn('Rating update skipped:', txErr);
      }

      const newReview = {
        id: reviewRef?.id || `local-${Date.now()}`,
        ...reviewData,
        createdAt: { toDate: () => new Date() }
      };

      setReviews(prev => [newReview, ...prev]);
      computeDistribution([newReview, ...reviews]);
      setUserExistingReview(newReview);
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewComment('');
      addToast('Your review has been posted! 🌟', 'success');
    } catch (err) {
      console.error('Review submission error:', err);
      addToast('Failed to post review. Please try again.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    // In a real app, update Firestore helpfulCount
    setReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r
    ));
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/book-service?garageId=${id}` } });
      return;
    }
    navigate(`/book-service?garageId=${id}`, { state: { garageId: id, garage } });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingService || !bookingDate) {
      addToast('Please select a service and preferred date.', 'error');
      return;
    }

    const rawPhone = (bookingPhone || userProfile?.phone || currentUser?.phone || '').toString().replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 12 && rawPhone.startsWith('91')
      ? rawPhone.slice(2)
      : rawPhone.length === 11 && rawPhone.startsWith('0')
      ? rawPhone.slice(1)
      : rawPhone;

    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      addToast('Please enter a valid 10-digit mobile number (e.g. 9876543210).', 'error');
      return;
    }

    const formattedCustomerPhone = `+91 ${cleanPhone}`;

    if (updateUserProfileData) {
      try {
        await updateUserProfileData({ phone: formattedCustomerPhone, phoneVerified: true });
      } catch (e) {
        console.warn('Profile sync warning:', e);
      }
    }

    setBookingLoading(true);
    try {
      const bookingDoc = {
        garageId: id,
        garageName: garage?.garageName || 'Workshop',
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.displayName || 'Customer',
        customerName: userProfile?.name || currentUser.displayName || 'Customer',
        customerEmail: currentUser.email,
        customerPhone: formattedCustomerPhone,
        customerAddress: userProfile?.address || '',
        service: bookingService,
        serviceType: bookingService,
        vehicle: bookingVehicle || 'Vehicle',
        vehicleModel: bookingVehicle || 'Vehicle',
        plateNumber: bookingPlate ? bookingPlate.toUpperCase() : 'LIVE-IN',
        date: bookingDate,
        timeSlot: bookingTimeSlot,
        preferredTime: bookingTimeSlot,
        expectedDuration: bookingExpectedDuration,
        expectedTurnaround: bookingExpectedDuration,
        note: bookingNote || '',
        status: 'pending',
        currentStage: 'Pending Approval',
        confirmationExpiresAt: null,
        proposedChanges: null,
        isDelivered: false,
        isUrgent: bookingIsUrgent,
        urgentSurcharge: bookingIsUrgent ? 500 : 0,
        intakeType: 'Online Customer Booking',
        tasks: [
          { id: 1, title: 'In-Bay Intake Check & Visual Diagnostic', status: 'Pending' },
          { id: 2, title: 'Service Execution & Component Testing', status: 'Pending' },
          { id: 3, title: 'QC Inspection & Road Test', status: 'Pending' },
          { id: 4, title: 'Final Wash & Client Delivery Dispatch', status: 'Pending' }
        ],
        billing: {
          items: [
            { name: bookingService, price: 1500, category: 'Labour & Service' }
          ],
          discount: 0,
          urgentSurcharge: bookingIsUrgent ? 500 : 0,
          total: bookingIsUrgent ? 2000 : 1500
        },
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'bookings'), bookingDoc);
      addToast(`Booking request sent to ${garage.garageName}! 🎉`, 'success');
      setShowBookingModal(false);
      setBookingService(''); setBookingVehicle(''); setBookingPlate(''); setBookingDate(''); setBookingNote(''); setBookingIsUrgent(false);
    } catch (err) {
      console.error('Booking submission error:', err);
      addToast(err.message || 'Failed to submit booking. Please check your connection.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] pt-24 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!garage) {
    return (
      <div className="min-h-screen bg-[#050505] pt-24 flex flex-col items-center justify-center text-white">
        <h2 className="text-xl font-bold mb-4">Garage not found</h2>
        <Link to="/discover" className="text-accent hover:underline">← Back to Discover</Link>
      </div>
    );
  }

  const photos = garage.photos?.length ? garage.photos : ['https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800&h=500&fit=crop'];
  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : garage.rating?.toFixed(1) || '0.0';

  const RATING_LABELS = { 5: 'Excellent', 4: 'Very Good', 3: 'Average', 2: 'Poor', 1: 'Terrible' };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-20">

      {/* ─── PHOTO GALLERY ──────────────────────── */}
      <div className="relative">
        <div className="w-full h-64 sm:h-80 md:h-96 overflow-hidden">
          <img
            src={photos[activePhoto]}
            alt={garage.garageName}
            className="w-full h-full object-cover transition-all duration-500"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800&h=500&fit=crop'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        </div>

        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setActivePhoto(i)}
                className={`h-2 rounded-full transition-all ${i === activePhoto ? 'bg-accent w-6' : 'bg-white/40 w-2'}`}
              />
            ))}
          </div>
        )}

        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-sm text-white hover:bg-black/70 transition-all">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => setSaved(!saved)}
            className={`p-2.5 rounded-xl backdrop-blur-md border transition-all
              ${saved ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-black/50 border-white/10 text-white hover:bg-black/70'}`}>
            <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button className="p-2.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-black/70 transition-all">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT ───────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: Main Info ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {garage.isVerified && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-[11px] font-bold">
                    <Shield size={10} /> Verified
                  </span>
                )}
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border
                  ${garage.openNow ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${garage.openNow ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
                  {garage.openNow ? 'Open Now' : 'Currently Closed'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">{garage.garageName}</h1>

              {/* Highlighted Location Tag */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <MapPin size={14} className="text-accent animate-pulse" />
                  <span>{garage.area ? `${garage.area}, ` : ''}{garage.city || garage.address}</span>
                  {garage.pincode && <span className="opacity-80 font-mono">({garage.pincode})</span>}
                </div>

                {garage.mapLink && (
                  <a 
                    href={garage.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-gray-200 transition-all font-semibold"
                  >
                    📍 View on Google Maps
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5 text-xs text-gray-300">
                  <span className="text-gray-500">Address:</span> {garage.address}
                </span>
                <span className="flex items-center gap-1.5">
                  <Star size={14} className="text-amber-400" fill="currentColor" />
                  <span className="text-white font-bold">{avgRating}</span>
                  <span>({reviews.length} reviews)</span>
                </span>
              </div>

              {garage.establishedYear && (
                <p className="text-xs text-gray-500 mt-2">Est. {garage.establishedYear} · Owned by {garage.ownerName}</p>
              )}
            </div>

            {/* Description */}
            {garage.description && (
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-2">About This Garage</h2>
                <p className="text-xs text-gray-400 leading-relaxed">{garage.description}</p>
              </div>
            )}

            {/* Services */}
            <div className="glass-card rounded-2xl p-5 border border-white/10">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Wrench size={15} className="text-accent" /> Services Offered
              </h2>
              <div className="flex flex-wrap gap-2">
                {(garage.serviceCategories || []).map(s => (
                  <span key={s} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:border-accent/30 transition-all">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Vehicle types & brands */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Car size={15} className="text-accent" /> Vehicle Types
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(garage.vehicleTypes || []).map(v => (
                    <span key={v} className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {(garage.brandsServiced || []).length > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-white/10">
                  <h2 className="text-sm font-bold text-white mb-3">Brands Serviced</h2>
                  <div className="flex flex-wrap gap-2">
                    {(garage.brandsServiced || []).map(b => (
                      <span key={b} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Working hours */}
            {garage.workingHours && typeof garage.workingHours === 'object' && (
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Clock size={15} className="text-accent" /> Working Hours
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DAYS.map(day => (
                    <div key={day}
                      className={`p-2.5 rounded-xl border text-center text-xs
                        ${day === today ? 'border-accent/40 bg-accent/10' : 'border-white/8 bg-white/3'}`}>
                      <span className={`font-bold block mb-1 ${day === today ? 'text-accent' : 'text-gray-300'}`}>
                        {DAY_LABELS[day]}
                        {day === today && <span className="text-[9px] ml-1">(Today)</span>}
                      </span>
                      <span className="text-gray-400 text-[10px]">{garage.workingHours[day] || 'Closed'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {(garage.certifications || []).length > 0 && (
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" /> Certifications
                </h2>
                <div className="flex flex-wrap gap-2">
                  {garage.certifications.map(c => (
                    <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                      <Shield size={10} /> {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────── */}
            {/* ── FEEDBACK / REVIEWS SECTION ─────── */}
            {/* ─────────────────────────────────────── */}
            <div id="reviews" className="space-y-5">

              {/* Section header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Star size={18} className="text-amber-400" fill="currentColor" />
                    Customer Reviews
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {reviews.length} review{reviews.length !== 1 ? 's' : ''} from verified customers
                  </p>
                </div>

                {/* Write a review button */}
                {isAuthenticated && !userExistingReview && !showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    id="write-review-btn"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/20 transition-all"
                  >
                    <Edit3 size={13} /> Write a Review
                  </button>
                )}

                {!isAuthenticated && (
                  <Link to="/login" state={{ from: `/garage/${id}` }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-semibold text-gray-300 hover:border-white/30 hover:text-white transition-all">
                    <User size={13} /> Login to Review
                  </Link>
                )}

                {userExistingReview && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                    <CheckCircle2 size={12} /> You've reviewed this garage
                  </span>
                )}
              </div>

              {/* Rating overview panel */}
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Big rating number */}
                  <div className="text-center shrink-0">
                    <p className="text-5xl font-extrabold text-white leading-none">{avgRating}</p>
                    <div className="flex justify-center gap-0.5 mt-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14}
                          className={s <= Math.round(parseFloat(avgRating)) ? 'text-amber-400' : 'text-gray-700'}
                          fill={s <= Math.round(parseFloat(avgRating)) ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{reviews.length} ratings</p>
                  </div>

                  {/* Distribution bars */}
                  <div className="flex-1 min-w-0 w-full space-y-1.5">
                    {[5,4,3,2,1].map(star => (
                      <RatingBar key={star} star={star} count={ratingDistribution[star] || 0} total={reviews.length} />
                    ))}
                  </div>

                  {/* Sentiment */}
                  <div className="shrink-0 text-center hidden sm:block">
                    <div className={`text-2xl font-extrabold mb-1 ${parseFloat(avgRating) >= 4 ? 'text-emerald-400' : parseFloat(avgRating) >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                      {RATING_LABELS[Math.round(parseFloat(avgRating))] || 'N/A'}
                    </div>
                    <p className="text-[11px] text-gray-500">Overall experience</p>
                  </div>
                </div>
              </div>

              {/* ── WRITE A REVIEW FORM ── */}
              {showReviewForm && (
                <div className="glass-panel rounded-3xl border border-accent/20 p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Edit3 size={16} className="text-accent" /> Write Your Review
                    </h3>
                    <button onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewComment(''); }}
                      className="text-gray-500 hover:text-white text-xs hover:bg-white/10 px-2 py-1 rounded-lg transition-all">
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleSubmitReview} className="space-y-5">
                    {/* Star rating input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Your Rating *
                      </label>
                      <div className="flex items-center gap-3">
                        <StarInput value={reviewRating} onChange={setReviewRating} size={32} />
                        {reviewRating > 0 && (
                          <span className={`text-sm font-bold transition-all ${
                            reviewRating === 5 ? 'text-emerald-400' :
                            reviewRating === 4 ? 'text-green-400' :
                            reviewRating === 3 ? 'text-amber-400' :
                            reviewRating === 2 ? 'text-orange-400' : 'text-red-400'
                          }`}>
                            {RATING_LABELS[reviewRating]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Review text */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Your Experience *
                        </label>
                        <span className={`text-[11px] ${reviewComment.length < 10 ? 'text-gray-600' : 'text-emerald-400'}`}>
                          {reviewComment.length}/500
                        </span>
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value.slice(0, 500))}
                        placeholder="Share details about the quality of service, staff behaviour, pricing transparency, wait time, cleanliness..."
                        rows={4}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent/50 placeholder-gray-500 resize-none transition-colors"
                      />
                      {reviewComment.length > 0 && reviewComment.length < 10 && (
                        <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                          <AlertCircle size={10} /> Please write at least 10 characters
                        </p>
                      )}
                    </div>

                    {/* Optional Photo Attachment */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Camera size={13} className="text-accent" /> Attach Photo of Service / Invoice (Optional)
                      </label>
                      {!reviewPhoto ? (
                        <label className="border border-dashed border-white/20 hover:border-accent/60 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] transition-all group text-xs text-gray-400 hover:text-white">
                          <Upload size={15} className="text-accent" />
                          <span>Click to add photo (repair work, bill, car condition)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReviewPhotoUpload}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="relative inline-block rounded-xl overflow-hidden border border-white/20">
                          <img src={reviewPhoto} alt="Review attachment" className="w-28 h-20 object-cover" />
                          <button
                            type="button"
                            onClick={() => setReviewPhoto('')}
                            className="absolute top-1 right-1 p-1 rounded-lg bg-black/80 text-rose-400 hover:text-rose-300 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={reviewSubmitting || reviewRating === 0 || reviewComment.length < 10}
                      id="submit-review-btn"
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[#050505] font-extrabold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
                    >
                      {reviewSubmitting
                        ? <><Loader2 size={16} className="animate-spin" /> Posting...</>
                        : <><Send size={16} /> Post Your Review</>
                      }
                    </button>
                  </form>
                </div>
              )}

              {/* ── REVIEWS LIST ── */}
              {reviewsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-2xl border border-white/10">
                  <Star size={36} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 font-semibold">No reviews yet</p>
                  <p className="text-gray-600 text-xs mt-1">Be the first to share your experience!</p>
                  {isAuthenticated && (
                    <button onClick={() => setShowReviewForm(true)}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/20 transition-all">
                      Write First Review
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      currentUserId={currentUser?.uid}
                      onHelpful={handleHelpful}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* ── END REVIEWS ── */}

          </div>

          {/* ── RIGHT: Booking Panel ── */}
          <div className="space-y-4">
            <div className="glass-panel rounded-3xl p-6 border border-white/10 sticky top-24">
              {/* Rating summary */}
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/10">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-white leading-none">{avgRating}</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={7}
                        className={s <= Math.round(parseFloat(avgRating)) ? 'text-amber-400' : 'text-gray-600'}
                        fill={s <= Math.round(parseFloat(avgRating)) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{reviews.length} Reviews</p>
                  <p className="text-xs text-gray-400">From verified customers</p>
                  <a href="#reviews" className="text-xs text-accent hover:underline">Read all →</a>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2 mb-5">
                {garage.phone && (
                  <a href={`tel:${garage.phone}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <Phone size={15} className="text-accent" />
                    <span className="text-xs text-gray-300">{garage.phone}</span>
                  </a>
                )}
                {garage.whatsapp && (
                  <a href={`https://wa.me/${garage.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all">
                    <MessageCircle size={15} className="text-emerald-400" />
                    <span className="text-xs text-emerald-300">Chat on WhatsApp</span>
                  </a>
                )}
                {garage.mapLink && (
                  <a href={garage.mapLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <MapPin size={15} className="text-accent" />
                    <span className="text-xs text-gray-300">Get Directions</span>
                  </a>
                )}
              </div>

              {/* Book Now */}
              <button
                onClick={handleBookNow}
                className="w-full py-3.5 rounded-2xl text-[#050505] font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl hover:opacity-90 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
              >
                <Calendar size={16} />
                {isAuthenticated ? 'Book a Service' : 'Login to Book'}
                <ArrowRight size={15} />
              </button>

              {/* Write review shortcut */}
              {isAuthenticated && !userExistingReview && (
                <button
                  onClick={() => { setShowReviewForm(true); document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Star size={12} className="text-amber-400" /> Write a Review
                </button>
              )}

              {!isAuthenticated && (
                <p className="text-[10px] text-gray-500 text-center mt-2">
                  Sign in with Google to book or review
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
