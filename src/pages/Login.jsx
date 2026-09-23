import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Wrench,
  User,
  ArrowRight,
  Shield,
  Star,
  MapPin,
  Clock,
  Phone,
  Home,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Building2,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';
import GearLogo from '../components/GearLogo';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('user'); // 'user' | 'garage_owner'
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [operationNotAllowed, setOperationNotAllowed] = useState(false);

  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    currentUser,
    isAuthenticated,
    userProfile,
    needsOnboarding
  } = useAuth();

  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // If role is passed in location state (e.g. from List Your Garage button)
  useEffect(() => {
    if (location.state?.defaultRole) {
      setSelectedRole(location.state.defaultRole);
    }
  }, [location.state]);

  // If already authenticated and ready, redirect
  useEffect(() => {
    if (isAuthenticated && userProfile && !needsOnboarding) {
      const from = location.state?.from;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        const dest = userProfile.role === 'garage_owner' ? '/garage-dashboard' : '/';
        navigate(dest, { replace: true });
      }
    }
  }, [isAuthenticated, userProfile, needsOnboarding, navigate, location.state]);

  // Handle Email + Password Sign In or Sign Up
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (authMode === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setErrorMessage('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (authMode === 'signin') {
        const user = await signInWithEmail(email, password);
        const displayName = user.displayName || userProfile?.name || email.split('@')[0] || 'User';
        addToast(`Welcome "${displayName}"! 👋`, 'success');
      } else {
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        await signUpWithEmail(email, password, {
          name,
          phone: `+91 ${cleanPhone}`,
          address,
          role: selectedRole
        });
        addToast(`Welcome "${name.trim()}"! 🎉`, 'success');
      }

      const from = location.state?.from;
      if (selectedRole === 'garage_owner') {
        navigate('/garage-dashboard', { replace: true });
      } else {
        navigate(from && from !== '/login' ? from : '/', { replace: true });
      }
    } catch (err) {
      console.error('Auth error:', err);
      const isNotAllowed =
        err.code === 'auth/operation-not-allowed' ||
        err.message?.includes('operation-not-allowed') ||
        err.message?.includes('operation not allowed') ||
        err.message?.includes('Email/Password provider is not enabled');

      if (isNotAllowed) {
        setOperationNotAllowed(true);
        setErrorMessage('Email/Password sign-in is disabled in Firebase Console.');
        addToast('Email/Password disabled in Firebase Console', 'error');
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please try again.');
        addToast(err.message || 'Authentication failed', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setUnauthorizedDomain(false);
    setIsLoading(true);

    try {
      const gUser = await signInWithGoogle(selectedRole);
      if (gUser) {
        const displayName = gUser.displayName || 'User';
        addToast(`Welcome "${displayName}"! 🌟`, 'success');
        const from = location.state?.from;
        if (selectedRole === 'garage_owner') {
          navigate('/garage-dashboard', { replace: true });
        } else {
          navigate(from && from !== '/login' ? from : '/', { replace: true });
        }
      }
    } catch (err) {
      console.error('Google sign-in catch:', err);
      const isDomainError =
        err.code === 'auth/unauthorized-domain' ||
        err.message?.includes('auth/unauthorized-domain') ||
        err.message?.includes('not authorized in Firebase Console') ||
        err.message?.includes('unauthorized domain');

      if (isDomainError) {
        setUnauthorizedDomain(true);
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        setErrorMessage(`Firebase authorization required for domain: ${domain}`);
        addToast('Domain authorization required in Firebase Console', 'error');
      } else {
        setErrorMessage(err.message || 'Google sign-in failed.');
        addToast(err.message || 'Google sign-in failed', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {
      id: 'user',
      icon: <User size={22} />,
      title: 'Customer / Vehicle Owner',
      subtitle: 'Book service, track status, view estimates',
      activeBorder: 'border-accent bg-accent/15 text-accent shadow-[0_0_15px_rgba(212,175,55,0.25)]',
      inactiveBorder: 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
    },
    {
      id: 'garage_owner',
      icon: <Building2 size={22} />,
      title: 'Garage Partner / Workshop',
      subtitle: 'Manage bay slots, bookings & estimates',
      activeBorder: 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
      inactiveBorder: 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col justify-center py-20 sm:py-24 px-3.5 sm:px-6 relative overflow-x-hidden text-white">
      {/* Ambient glowing background */}
      <div className="absolute top-10 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg mx-auto">
        
        {/* Clean Header */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in px-2">
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-2">
            {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            {authMode === 'signin'
              ? 'Access your vehicle service history, live estimates, and bay tracking'
              : 'Join VahanSangam to discover verified garages or list your workshop'}
          </p>
        </div>

        {/* Account Role Selector */}
        <div className="mb-5 sm:mb-6 animate-fade-in">
          <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Select Account Role
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setSelectedRole(r.id); setErrorMessage(''); setUnauthorizedDomain(false); }}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-3 ${
                  selectedRole === r.id ? r.activeBorder : r.inactiveBorder
                }`}
              >
                <div className="p-2 rounded-xl bg-white/5 shrink-0 mt-0.5">
                  {r.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-white">{r.title}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{r.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Form Container */}
        <div className="glass-panel rounded-3xl p-5 sm:p-8 border border-white/10 shadow-2xl relative animate-fade-in">
          
          {/* Sign In vs Register Tabs */}
          <div className="flex rounded-2xl bg-black/50 p-1 mb-6 border border-white/10">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMessage(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === 'signin'
                  ? 'bg-accent text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setErrorMessage(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === 'signup'
                  ? 'bg-accent text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Domain Authorization Notice Card */}
          {unauthorizedDomain && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 text-xs mb-5 animate-fade-in space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-white text-sm">Firebase Domain Authorization Required</h4>
                  <p className="text-gray-300 mt-1 leading-relaxed">
                    Google Sign-In is blocked because your deployment domain is not in Firebase's allowed list.
                  </p>
                </div>
              </div>

              <div className="bg-black/60 rounded-xl p-3 border border-amber-500/20 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Current Domain to Add:</span>
                  <code className="text-amber-300 font-mono text-xs truncate block">{typeof window !== 'undefined' ? window.location.hostname : ''}</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(window.location.hostname);
                      setCopiedDomain(true);
                      addToast(`Copied "${window.location.hostname}"!`, 'success');
                      setTimeout(() => setCopiedDomain(false), 3000);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedDomain ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-[11px] text-gray-400 space-y-1">
                <p className="font-bold text-gray-300">How to fix in 30 seconds:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-gray-400 pl-1">
                  <li>Go to <strong>Firebase Console</strong> → <strong>Authentication</strong></li>
                  <li>Open <strong>Settings</strong> tab → <strong>Authorized domains</strong></li>
                  <li>Click <strong>Add domain</strong> and paste: <code className="text-amber-300">{typeof window !== 'undefined' ? window.location.hostname : ''}</code></li>
                </ol>
              </div>
            </div>
          )}

          {/* Email/Password Provider Not Allowed Banner */}
          {operationNotAllowed && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 text-xs mb-5 animate-fade-in space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-white text-sm">Email/Password Provider Disabled in Firebase</h4>
                  <p className="text-gray-300 mt-1 leading-relaxed">
                    To allow manual email sign-in & registration, enable Email/Password in your Firebase Console.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 space-y-1 bg-black/50 p-3 rounded-xl border border-white/5">
                <p className="font-bold text-gray-300">How to enable in 3 steps:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-gray-300 pl-1">
                  <li>Go to <strong>Firebase Console</strong> → <strong>Authentication</strong></li>
                  <li>Click the <strong>Sign-in method</strong> tab</li>
                  <li>Click <strong>Email/Password</strong> → Toggle <strong>Enable</strong> → Click <strong>Save</strong></li>
                </ol>
              </div>
            </div>
          )}

          {/* Standard Error Message */}
          {errorMessage && !unauthorizedDomain && !operationNotAllowed && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 mb-5 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Full Name <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    10-Digit Mobile Number <span className="text-amber-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono font-bold text-gray-300">
                      🇮🇳 +91
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Address <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Password <span className="text-amber-400">* (Min 6 chars)</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  City / Address (Optional)
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Bandra West, Mumbai"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-[#050505] shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all hover:opacity-95 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative bg-[#0d0d0d] px-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Or
            </span>
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-white text-gray-900 hover:bg-gray-100 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>


          {/* Footer Terms */}
          <p className="text-center text-[10px] text-gray-500 mt-5 pt-3 border-t border-white/5">
            By continuing, you agree to VahanSangam's Terms of Service and Privacy Policy.
          </p>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1.5"
          >
            <MapPin size={12} /> Browse garages without signing in
          </Link>
        </div>

      </div>
    </div>
  );
}


