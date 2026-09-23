import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Search, Building2, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastNotification';
import GearLogo from './GearLogo';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser, userProfile, isAuthenticated, isGarageOwner, logout } = useAuth();
  const { addToast } = useToast();

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const close = () => setUserMenuOpen(false);
    if (userMenuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    await logout();
    addToast('You have been signed out.', 'info');
    navigate('/');
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  const isTransparent = (isHome || location.pathname === '/login') && !scrolled && !mobileOpen;

  const navLinks = [
    { label: 'Discover Garages', href: '/discover' },
    { label: 'How It Works', href: '/#how-it-works' },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isTransparent ? 'bg-transparent border-transparent py-4' : 'border-b border-white/10 py-2.5'
      }`}
      style={!isTransparent ? { background: 'rgba(5,5,5,0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } : {}}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <GearLogo size={38} />
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Vahan<span className="text-accent font-light">Sangam</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              link.href.startsWith('/') && !link.href.startsWith('/#')
                ? <Link
                    key={link.label}
                    to={link.href}
                    className={`text-xs uppercase tracking-wider font-semibold px-4 py-2 rounded-full transition-all duration-200
                      ${location.pathname === link.href
                        ? 'text-accent bg-accent/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {link.label}
                  </Link>
                : <a
                    key={link.label}
                    href={link.href}
                    className="text-xs uppercase tracking-wider font-semibold px-4 py-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                  >
                    {link.label}
                  </a>
            ))}
          </div>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Garage owner quick link */}
                {isGarageOwner && (
                  <Link to="/garage-dashboard"
                    className="flex items-center gap-2 text-xs font-bold text-accent bg-accent/10 border border-accent/30 px-4 py-2 rounded-full hover:bg-accent/20 transition-all">
                    <Building2 size={13} /> My Garage
                  </Link>
                )}
                {!isGarageOwner && (
                  <Link to="/my-account"
                    className="relative flex items-center gap-2 text-xs font-bold text-gray-300 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-all">
                    <User size={13} /> My Account
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </Link>
                )}

                {/* User avatar dropdown */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:border-white/20 transition-all"
                  >
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center">
                        {(userProfile?.name || currentUser?.displayName || 'U').charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-200 max-w-[100px] truncate">
                      {userProfile?.name || currentUser?.displayName?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown size={12} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 glass-panel rounded-2xl border border-white/15 shadow-xl py-2 animate-fade-in">
                      <div className="px-4 py-2 border-b border-white/8">
                        <p className="text-xs font-bold text-white truncate">{userProfile?.name || currentUser?.displayName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{currentUser?.email}</p>
                      </div>
                      {isGarageOwner
                        ? <Link to="/garage-dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                            <Building2 size={13} /> Garage Dashboard
                          </Link>
                        : <Link to="/my-account" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                            <User size={13} /> My Account
                          </Link>
                      }
                      <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-all">
                        <LogOut size={13} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" state={{ defaultRole: 'garage_owner' }}
                  className="text-xs uppercase tracking-wider font-bold text-gray-300 px-4 py-2.5 rounded-full border border-white/20 hover:bg-white/5 transition-colors flex items-center gap-1.5">
                  <Building2 size={13} className="text-accent" /> List Your Garage
                </Link>
                <Link to="/login"
                  className="text-xs uppercase tracking-wider font-extrabold text-[#050505] px-5 py-2.5 rounded-full shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}>
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#090909]/98 backdrop-blur-xl border-b border-white/10 absolute w-full animate-fade-in shadow-2xl">
          <div className="px-5 py-5 space-y-2">
            {navLinks.map((link) => (
              link.href.startsWith('/') && !link.href.startsWith('/#')
                ? <Link key={link.label} to={link.href} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <Search size={15} className="text-accent" /> {link.label}
                  </Link>
                : <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    {link.label}
                  </a>
            ))}

            <div className="pt-4 border-t border-white/10 space-y-2.5">
              {isAuthenticated ? (
                <>
                  <div className="p-3.5 bg-white/4 rounded-2xl flex items-center gap-3 border border-white/8">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="Profile" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent font-bold text-base flex items-center justify-center">
                        {(userProfile?.name || currentUser?.displayName || 'U').charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{userProfile?.name || currentUser?.displayName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{currentUser?.email}</p>
                    </div>
                  </div>

                  {isGarageOwner ? (
                    <Link to="/garage-dashboard" onClick={() => setMobileOpen(false)}
                      className="w-full flex items-center justify-center gap-2 text-sm font-bold text-accent bg-accent/10 border border-accent/30 py-3 rounded-xl">
                      <Building2 size={15} /> Garage Dashboard
                    </Link>
                  ) : (
                    <Link to="/my-account" onClick={() => setMobileOpen(false)}
                      className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-white/8 border border-white/10 py-3 rounded-xl">
                      <User size={15} /> My Account
                    </Link>
                  )}

                  <button onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 py-3 rounded-xl transition-all">
                    <LogOut size={15} /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" state={{ defaultRole: 'garage_owner' }} onClick={() => setMobileOpen(false)}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 py-3 rounded-xl hover:bg-white/8 transition-colors">
                    <Building2 size={15} className="text-accent" /> List Your Garage
                  </Link>
                  <Link to="/login" onClick={() => setMobileOpen(false)}
                    className="w-full flex items-center justify-center text-sm font-extrabold text-[#050505] py-3.5 rounded-xl shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}>
                    Sign In with Google
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
