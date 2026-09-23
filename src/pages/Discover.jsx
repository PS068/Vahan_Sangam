import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Star, Filter, X, Shield, Clock, Wrench, ChevronRight, SlidersHorizontal, Car } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const CITIES = ['All Cities', 'Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Noida', 'Gurgaon'];
const VEHICLE_TYPES = ['All Vehicles', '4-Wheeler', '2-Wheeler', 'EV', 'Commercial Vehicle'];
const SERVICE_TYPES = ['All Services', 'Full Service', 'Oil Change', 'Engine Repair', 'AC Service', 'Denting & Painting', 'Wheel Alignment', 'EV Servicing', 'Battery Replacement'];
const SORT_OPTIONS = ['Top Rated', 'Most Reviews', 'Open Now'];

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [garages, setGarages] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || 'All Cities');
  const [vehicleFilter, setVehicleFilter] = useState('All Vehicles');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [sortBy, setSortBy] = useState('Top Rated');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchGarages();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [garages, searchText, cityFilter, vehicleFilter, serviceFilter, sortBy, openNowOnly, verifiedOnly]);

  const fetchGarages = async () => {
    try {
      const q = query(collection(db, 'garages'), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (snap.empty) {
        setGarages([]);
      } else {
        setGarages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.error('Error fetching garages:', err);
      setGarages([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...garages];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(g =>
        g.garageName?.toLowerCase().includes(q) ||
        g.city?.toLowerCase().includes(q) ||
        g.address?.toLowerCase().includes(q) ||
        (g.serviceCategories || []).some(s => s.toLowerCase().includes(q))
      );
    }

    if (cityFilter !== 'All Cities') {
      result = result.filter(g => g.city?.toLowerCase().includes(cityFilter.toLowerCase()));
    }

    if (vehicleFilter !== 'All Vehicles') {
      result = result.filter(g => (g.vehicleTypes || []).includes(vehicleFilter));
    }

    if (serviceFilter !== 'All Services') {
      result = result.filter(g => (g.serviceCategories || []).some(s => s.includes(serviceFilter)));
    }

    if (openNowOnly) {
      result = result.filter(g => g.openNow);
    }

    if (verifiedOnly) {
      result = result.filter(g => g.isVerified);
    }

    // Sort
    if (sortBy === 'Top Rated') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'Most Reviews') result.sort((a, b) => (b.totalRatings || 0) - (a.totalRatings || 0));
    else if (sortBy === 'Open Now') result.sort((a, b) => (b.openNow ? 1 : 0) - (a.openNow ? 1 : 0));

    setFiltered(result);
  };

  const clearFilters = () => {
    setSearchText('');
    setCityFilter('All Cities');
    setVehicleFilter('All Vehicles');
    setServiceFilter('All Services');
    setOpenNowOnly(false);
    setVerifiedOnly(false);
    setSortBy('Top Rated');
  };

  const hasFilters = cityFilter !== 'All Cities' || vehicleFilter !== 'All Vehicles' || serviceFilter !== 'All Services' || openNowOnly || verifiedOnly || searchText;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-20">

      {/* ─── HEADER ─────────────────────────────── */}
      <div className="bg-[#080808] border-b border-white/8 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-accent/50 transition-colors">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search garages, services, cities..."
                className="bg-transparent text-white text-sm outline-none w-full placeholder-gray-500"
                id="discover-search"
              />
              {searchText && (
                <button onClick={() => setSearchText('')} className="text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all
                ${showFilters || hasFilters
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                }`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {hasFilters && <span className="w-2 h-2 rounded-full bg-accent" />}
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-accent/40 cursor-pointer"
            >
              {SORT_OPTIONS.map(s => <option key={s} value={s} className="bg-[#111]">{s}</option>)}
            </select>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-white/8 flex flex-wrap gap-3 items-center animate-fade-in">
              {/* City */}
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-accent/40 cursor-pointer">
                {CITIES.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
              </select>

              {/* Vehicle type */}
              <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}
                className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-accent/40 cursor-pointer">
                {VEHICLE_TYPES.map(v => <option key={v} value={v} className="bg-[#111]">{v}</option>)}
              </select>

              {/* Service type */}
              <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
                className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-accent/40 cursor-pointer">
                {SERVICE_TYPES.map(s => <option key={s} value={s} className="bg-[#111]">{s}</option>)}
              </select>

              {/* Toggle chips */}
              <button
                onClick={() => setOpenNowOnly(!openNowOnly)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${openNowOnly ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
              >
                <Clock size={12} /> Open Now
              </button>
              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${verifiedOnly ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
              >
                <Shield size={12} /> Verified Only
              </button>

              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors ml-auto">
                  <X size={12} /> Clear All
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── RESULTS ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">
            {loading ? 'Loading garages...' : (
              <><span className="text-white font-bold">{filtered.length}</span> garage{filtered.length !== 1 ? 's' : ''} found
                {cityFilter !== 'All Cities' && <span className="text-accent"> in {cityFilter}</span>}
              </>
            )}
          </p>
          {!isAuthenticated && (
            <Link to="/login" className="text-xs text-accent hover:underline flex items-center gap-1">
              Sign in to book <ChevronRight size={13} />
            </Link>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="glass-card rounded-3xl h-80 border border-white/10 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-24">
            <Car size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No garages found</h3>
            <p className="text-gray-400 text-sm mb-6">Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="px-5 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-all">
              Clear Filters
            </button>
          </div>
        )}

        {/* Garage grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((garage) => (
              <GarageCard key={garage.id} garage={garage} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GarageCard({ garage, isAuthenticated }) {
  return (
    <div className="group glass-card rounded-3xl overflow-hidden border border-white/10 hover:border-accent/40 transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Photo */}
      <div className="relative h-48 overflow-hidden bg-[#111] shrink-0">
        <img
          src={garage.photo || garage.photos?.[0] || 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=600&h=400&fit=crop'}
          alt={garage.garageName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=600&h=400&fit=crop'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md border
          ${garage.openNow ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${garage.openNow ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
          {garage.openNow ? 'Open Now' : 'Closed'}
        </div>

        {garage.isVerified && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
            <Shield size={9} /> Verified
          </div>
        )}

        {/* Rating badge on photo */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
          <Star size={11} className="text-amber-400" fill="currentColor" />
          <span className="text-xs font-bold text-white">{garage.rating?.toFixed(1) || '4.5'}</span>
          <span className="text-[10px] text-gray-300">({garage.totalRatings || 0})</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-extrabold text-white text-base mb-2 group-hover:text-accent transition-colors line-clamp-1">
          {garage.garageName}
        </h3>

        {/* Highlighted Location Badge */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-[0_0_12px_rgba(245,158,11,0.15)] max-w-full">
            <MapPin size={13} className="text-accent shrink-0 animate-pulse" />
            <span className="truncate">
              {garage.area ? `${garage.area}, ` : ''}{garage.city || garage.address || 'Workshop Bay'}
            </span>
          </div>
          {garage.address && (
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 px-1">
              {garage.address}
            </p>
          )}
        </div>

        {/* Vehicle type chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(garage.vehicleTypes || []).map(v => (
            <span key={v} className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 font-medium">
              {v}
            </span>
          ))}
        </div>

        {/* Services */}
        <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
          {(garage.serviceCategories || []).slice(0, 3).map(s => (
            <span key={s} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-400">
              {s}
            </span>
          ))}
          {(garage.serviceCategories || []).length > 3 && (
            <span className="px-2 py-0.5 rounded-lg bg-accent/10 border border-accent/20 text-[10px] text-accent">
              +{(garage.serviceCategories || []).length - 3}
            </span>
          )}
        </div>

        {/* Working hours */}
        {garage.workingHours && (
          <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-4">
            <Clock size={10} /> {typeof garage.workingHours === 'string' ? garage.workingHours : 'Mon–Sat: 9AM–7PM'}
          </p>
        )}

        {/* CTA */}
        <div className="flex gap-2 mt-auto">
          <Link
            to={`/garage/${garage.id}`}
            className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
          >
            View Details
          </Link>
          {isAuthenticated ? (
            <Link
              to={`/book-service?garageId=${garage.id}`}
              state={{ garageId: garage.id, garage }}
              className="flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold text-[#050505] transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
            >
              Book Now
            </Link>
          ) : (
            <Link
              to="/login"
              state={{ from: `/book-service?garageId=${garage.id}` }}
              className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold text-accent bg-accent/10 border border-accent/30 hover:bg-accent/20 transition-all cursor-pointer"
            >
              Login to Book
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
