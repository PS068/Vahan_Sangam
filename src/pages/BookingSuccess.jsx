import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Calendar, Clock, MapPin, Car, Home, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function BookingSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const bookingData = location.state;

  useEffect(() => {
    // If no state is passed, redirect to home
    if (!bookingData) {
      navigate('/');
    } else {
      setTimeout(() => setShow(true), 100);
    }
  }, [bookingData, navigate]);

  if (!bookingData) return null;

  return (
    <div className="min-h-screen bg-[#050505] pt-28 pb-20 flex items-center justify-center text-white px-4">
      <div className="max-w-xl w-full">
        
        <div className={`transition-all duration-700 transform ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Header Card with Color Psychology (Amber & Emerald) */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-5 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 size={42} className="text-emerald-400 animate-bounce" />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs font-black shadow-md">
                ✓
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3">
              <Clock size={13} className="animate-spin" /> Request Sent to {bookingData.garageName || 'Garage'}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              Service Request Sent!
            </h1>
            <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">
              Your appointment request has been dispatched to <span className="text-white font-bold">{bookingData.garageName || 'the workshop'}</span>. You will receive an instant notification when the garage confirms your bay!
            </p>
          </div>

          {/* Ticket Summary */}
          <div className="glass-panel border border-white/10 rounded-3xl p-6 shadow-2xl mb-8 relative overflow-hidden bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-5">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-1">Booking Reference</p>
                <p className="text-lg font-mono text-accent font-black tracking-wider">#{bookingData.bookingId?.slice(-8) || 'VS-CONFIRMED'}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-1">Live Status</p>
                <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Awaiting Garage Review
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                <p className="text-gray-400 flex items-center gap-1.5 mb-1 font-medium"><Car size={13} className="text-accent" /> Vehicle</p>
                <p className="text-white font-bold text-sm">{bookingData.brand} {bookingData.model ? `• ${bookingData.model}` : ''}</p>
                <p className="text-accent font-mono font-bold mt-0.5">{bookingData.plateNumber}</p>
              </div>
              
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                <p className="text-gray-400 flex items-center gap-1.5 mb-1 font-medium"><Sparkles size={13} className="text-accent" /> Service Package</p>
                <p className="text-white font-bold text-sm truncate">{bookingData.service?.name || 'General Service'}</p>
                <p className="text-gray-400 mt-0.5">Est: {bookingData.service?.estimatedTime || '2 - 4 Hours'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                <p className="text-gray-400 flex items-center gap-1.5 mb-1 font-medium"><Calendar size={13} className="text-accent" /> Preferred Date</p>
                <p className="text-white font-bold text-sm">{bookingData.date}</p>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                <p className="text-gray-400 flex items-center gap-1.5 mb-1 font-medium"><Clock size={13} className="text-accent" /> Time Slot</p>
                <p className="text-white font-bold text-sm">{bookingData.time}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Return to Home & View Account */}
          <div className="flex flex-col sm:flex-row gap-3.5">
            <Link 
              to="/"
              className="flex-1 flex justify-center items-center gap-2 text-[#050505] font-extrabold text-sm py-4 px-6 rounded-2xl hover:opacity-95 transition-all shadow-[0_0_25px_rgba(212,175,55,0.3)] text-center cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
            >
              <Home size={18} /> Return to Home
            </Link>
            
            <Link 
              to="/my-account"
              className="flex-1 flex justify-center items-center gap-2 bg-white/5 border border-white/15 text-white font-bold text-sm py-4 px-6 rounded-2xl hover:bg-white/10 transition-all text-center cursor-pointer"
            >
              View in My Account <ArrowRight size={16} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
