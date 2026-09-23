import { Link } from 'react-router-dom';
import GearLogo from './GearLogo';
import { MapPin, Shield, Star } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#050505] text-white border-t border-white/5 relative z-10" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <GearLogo size={34} />
              <span className="text-xl font-bold tracking-tight text-white">
                Vahan<span className="text-accent font-light">Sangam</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              India's trusted garage marketplace. Find, compare, and book top-rated workshops near you — instantly.
            </p>
            <div className="flex flex-col gap-1.5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5"><Shield size={11} className="text-accent" /> Verified Garages Only</span>
              <span className="flex items-center gap-1.5"><Star size={11} className="text-accent" /> 25,000+ Happy Customers</span>
              <span className="flex items-center gap-1.5"><MapPin size={11} className="text-accent" /> 40+ Cities Across India</span>
            </div>
          </div>

          {/* For Users */}
          <div>
            <h4 className="font-bold mb-4 text-xs uppercase tracking-wider text-gray-300">For Users</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Discover Garages', to: '/discover' },
                { label: 'How It Works', href: '/#how-it-works' },
                { label: 'My Account', to: '/my-account' },
                { label: 'Sign In', to: '/login' }
              ].map((item) => (
                <li key={item.label}>
                  {item.to
                    ? <Link to={item.to} className="text-gray-400 hover:text-white text-sm transition-colors">{item.label}</Link>
                    : <a href={item.href} className="text-gray-400 hover:text-white text-sm transition-colors">{item.label}</a>
                  }
                </li>
              ))}
            </ul>
          </div>

          {/* For Garage Owners */}
          <div>
            <h4 className="font-bold mb-4 text-xs uppercase tracking-wider text-gray-300">For Garage Owners</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Register Your Garage', to: '/login' },
                { label: 'Garage Dashboard', to: '/garage-dashboard' },
                { label: 'Benefits', href: '/#partner' },
                { label: 'Partner Support', href: '#' }
              ].map((item) => (
                <li key={item.label}>
                  {item.to
                    ? <Link to={item.to} className="text-gray-400 hover:text-white text-sm transition-colors">{item.label}</Link>
                    : <a href={item.href} className="text-gray-400 hover:text-white text-sm transition-colors">{item.label}</a>
                  }
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold mb-4 text-xs uppercase tracking-wider text-gray-300">Legal</h4>
            <ul className="space-y-2.5">
              {['Privacy Policy', 'Terms of Service', 'Contact Us', 'Cookie Policy'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-12 pt-7 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">© 2026 VahanSangam Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="text-gray-600 hover:text-accent text-xs transition-colors">Instagram</a>
            <a href="#" className="text-gray-600 hover:text-accent text-xs transition-colors">Twitter</a>
            <a href="#" className="text-gray-600 hover:text-accent text-xs transition-colors">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
