import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Star, ChevronRight, Wrench, Clock, Shield,
  CheckCircle2, ArrowRight, Zap, Users, Building2, TrendingUp
} from 'lucide-react';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import CustomerAlertBanner from '../components/CustomerAlertBanner';

const STATS = [
  { label: 'Verified Garages', value: '100% Real', icon: <Building2 size={22} /> },
  { label: 'Happy Customers', value: 'Live', icon: <Users size={22} /> },
  { label: 'Google Authenticated', value: 'Verified', icon: <Shield size={22} /> },
  { label: 'Direct Booking', value: '24/7', icon: <TrendingUp size={22} /> },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Find a Garage', desc: 'Search by city, service type, or vehicle — browse verified garages with ratings and photos.', icon: <Search size={22} /> },
  { step: '02', title: 'Sign In & Book', desc: 'Login with Google in one tap and book your preferred slot at the garage of your choice.', icon: <Zap size={22} /> },
  { step: '03', title: 'Drop Your Vehicle', desc: 'Drop off your car at the scheduled time and let the certified technicians handle the rest.', icon: <Wrench size={22} /> },
  { step: '04', title: 'Track & Collect', desc: "Get live status updates from the garage and pick up your vehicle when it's ready.", icon: <CheckCircle2 size={22} /> },
];

export default function Home() {
  const [searchCity, setSearchCity] = useState('');
  const [featuredGarages, setFeaturedGarages] = useState([]);
  const [loadingGarages, setLoadingGarages] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, userProfile } = useAuth();

  useEffect(() => {
    fetchFeaturedGarages();
  }, []);

  const fetchFeaturedGarages = async () => {
    try {
      const q = query(
        collection(db, 'garages'),
        where('isActive', '==', true)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setFeaturedGarages([]);
      } else {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        setFeaturedGarages(list.slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching featured garages:', err);
      setFeaturedGarages([]);
    } finally {
      setLoadingGarages(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/discover${searchCity ? `?city=${encodeURIComponent(searchCity)}` : ''}`);
  };

  return (
    <div className="bg-[#050505] text-white overflow-x-hidden">

      {/* ─── HERO ───────────────────────────────────── */}
      <section className="relative w-full min-h-[88vh] sm:min-h-[92vh] flex flex-col justify-center -mt-16 pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
        {/* Responsive Background Layer (Mobile-safe, eliminates fixed attachment glitches) */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=1920&h=1080&fit=crop"
            alt="Automotive Service Background"
            className="w-full h-full object-cover object-center filter brightness-[0.38] contrast-[1.15]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/95 via-[#050505]/70 to-[#050505]" />
          <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-[#050505]/95" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-5 sm:mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <span className="text-[10px] sm:text-xs font-bold text-accent tracking-widest uppercase">India's #1 Garage Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-4 sm:mb-6">
            Find the Best<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f7d070] to-[#b7791f]">
              Garage Near You
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-gray-300 leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto px-2">
            Discover verified garages, compare services & prices, book instantly, and track your vehicle — all in one place.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6 sm:mb-8 w-full">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 glass-panel rounded-2xl p-2 sm:p-2.5 border border-white/10 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-2.5 flex-1 px-3 py-2.5 sm:py-0 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none">
                <MapPin size={18} className="text-accent shrink-0" />
                <input
                  type="text"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  placeholder="Enter your city (e.g. Mumbai, Pune, Delhi...)"
                  className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-500"
                  id="hero-city-search"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-[#050505] font-extrabold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 shrink-0 shadow-lg cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
              >
                <Search size={16} /> <span>Search Garages</span>
              </button>
            </div>
          </form>

          {/* Quick actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <Link
              to="/discover"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-full bg-white/5 border border-white/15 text-xs sm:text-sm font-semibold hover:bg-white/10 transition-all backdrop-blur-md"
            >
              Browse All Garages <ChevronRight size={15} />
            </Link>
            {!isAuthenticated && (
               <Link
                 to="/login"
                 className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-full text-[#050505] font-extrabold text-xs sm:text-sm transition-all hover:opacity-90 active:scale-95 shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
               >
                 Sign In with Google <ArrowRight size={15} />
               </Link>
             )}
            {isAuthenticated && userProfile?.role === 'user' && (
              <Link
                to="/discover"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-full text-[#050505] font-extrabold text-xs sm:text-sm transition-all hover:opacity-90 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
              >
                <Wrench size={15} /> Book a Service
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── LIVE CUSTOMER ALERTS & ACTION BANNER (COLOR PSYCHOLOGY) ─── */}
      <div className="pt-4 sm:pt-6">
        <CustomerAlertBanner onBookingUpdated={fetchFeaturedGarages} />
      </div>

      {/* ─── STATS ─────────────────────────────────── */}
      <section className="py-8 sm:py-12 bg-[#090909] border-b border-white/5 z-10 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-3.5 sm:p-5 text-center border border-white/8 hover:border-accent/30 transition-all flex flex-col items-center justify-center">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 sm:mb-3">
                  {s.icon}
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{s.value}</p>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── FEATURED GARAGES ──────────────────────── */}
      <section className="py-20 bg-[#050505] border-b border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider mb-2">
                Top Rated
              </div>
              <h2 className="text-3xl font-extrabold text-white">Featured Garages</h2>
              <p className="text-gray-400 text-sm mt-1">Verified, top-rated service centres loved by customers</p>
            </div>
            <Link
              to="/discover"
              className="hidden md:flex items-center gap-1.5 text-xs font-bold text-accent hover:text-accent-light transition-colors"
            >
              View All <ChevronRight size={16} />
            </Link>
          </div>

          {loadingGarages ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card rounded-3xl h-72 border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : featuredGarages.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-3xl border border-white/10 max-w-xl mx-auto p-8">
              <Building2 size={44} className="text-accent mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Live Garage Network</h3>
              <p className="text-gray-400 text-xs mb-6">Browse registered workshops across India or list your own service centre today.</p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Link to="/discover" className="px-5 py-2.5 rounded-xl bg-accent text-dark font-extrabold text-xs shadow-lg">
                  Explore Discover Directory
                </Link>
                <Link to="/login" state={{ defaultRole: 'garage_owner' }} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-xs hover:bg-white/10">
                  Register Your Garage
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredGarages.map((garage) => (
                <Link
                  key={garage.id}
                  to={`/garage/${garage.id}`}
                  className="group glass-card rounded-3xl overflow-hidden border border-white/10 hover:border-accent/40 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Photo */}
                  <div className="relative h-44 overflow-hidden bg-[#111]">
                    <img
                      src={garage.photo || garage.photos?.[0] || 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=600&h=400&fit=crop'}
                      alt={garage.garageName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=600&h=400&fit=crop'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Open/Closed badge */}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md border
                      ${garage.openNow ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${garage.openNow ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
                      {garage.openNow ? 'Open Now' : 'Closed'}
                    </div>

                    {/* Verified */}
                    {garage.isVerified && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-[10px] font-bold flex items-center gap-1">
                        <Shield size={10} /> Verified
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="font-extrabold text-white text-base mb-2 group-hover:text-accent transition-colors line-clamp-1">
                      {garage.garageName}
                    </h3>
                    
                    {/* Highlighted Location Tag */}
                    <div className="mb-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold max-w-full">
                        <MapPin size={12} className="text-accent shrink-0 animate-pulse" />
                        <span className="truncate">
                          {garage.area ? `${garage.area}, ` : ''}{garage.city || garage.address}
                        </span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/20">
                        <Star size={11} className="text-amber-400" fill="currentColor" />
                        <span className="text-xs font-bold text-amber-300">{garage.rating?.toFixed(1) || '4.5'}</span>
                      </div>
                      <span className="text-xs text-gray-500">({garage.totalRatings || 0} reviews)</span>
                    </div>

                    {/* Service tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {(garage.serviceCategories || []).slice(0, 2).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-300">
                          {s}
                        </span>
                      ))}
                      {(garage.serviceCategories || []).length > 2 && (
                        <span className="px-2 py-0.5 rounded-lg bg-accent/10 border border-accent/20 text-[10px] text-accent">
                          +{(garage.serviceCategories || []).length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline"
            >
              View All Garages <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────── */}
      <section className="py-24 bg-[#070707] border-b border-white/5 relative overflow-hidden" id="how-it-works">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[400px] bg-accent/4 blur-[160px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider mb-3">
              Simple & Fast
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">How VahanSangam Works</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xl mx-auto">
              Get your vehicle serviced in 4 easy steps — no phone calls, no hassle.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_IT_WORKS.map((item, idx) => (
              <div key={item.step} className="glass-card p-6 rounded-3xl border border-white/10 hover:border-accent/40 transition-all duration-300 group relative">
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 -right-3 text-gray-700 z-10">
                    <ArrowRight size={20} />
                  </div>
                )}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-all">
                    {item.icon}
                  </div>
                  <span className="text-2xl font-black text-white/10 group-hover:text-accent/20 font-mono transition-colors">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm mb-2 group-hover:text-accent transition-colors">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LIST YOUR GARAGE CTA ─────────────────── */}
      <section className="py-14 sm:py-20 bg-[#050505] relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-3xl p-6 sm:p-10 md:p-14 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 text-center md:text-left md:flex items-center justify-between gap-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
                  <Wrench size={12} /> For Garage Owners
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                  Grow Your Garage Business
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
                  Join 500+ workshops on VahanSangam. List your garage for free, receive verified online bookings, and build your digital reputation with genuine customer reviews.
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 sm:gap-4 mt-5 text-xs text-gray-300">
                  {['Free Listing', 'Online Bookings', 'Customer Reviews', 'Dashboard Analytics'].map(f => (
                    <span key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0 mt-8 md:mt-0 flex flex-col items-center md:items-start gap-3 w-full sm:w-auto">
                <Link
                  to="/login"
                  state={{ defaultRole: 'garage_owner' }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-[#050505] font-extrabold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:opacity-90 transition-all hover:scale-105 active:scale-95 text-sm shadow-[0_0_30px_rgba(212,175,55,0.3)] text-center cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
                >
                  <Building2 size={16} /> <span>Register Your Garage</span>
                </Link>
                <p className="text-[11px] text-gray-500 text-center w-full">
                  <Shield size={10} className="inline mr-1" /> Google Sign-In · Takes 5 minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
