import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { vehicleTypes, cities } from '../data/dummyData';

export default function SearchBar({ compact = false }) {
  const navigate = useNavigate();
  const [vehicleType, setVehicleType] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [location, setLocation] = useState('');

  const serviceOptions = ['Full Service', 'Oil Change', 'AC Service', 'Brake Repair', 'Denting & Painting', 'Battery Replacement', 'Wheel Alignment', 'Car Wash'];

  const handleSearch = (e) => {
    e.preventDefault();
    navigate('/service-centers');
  };

  if (compact) {
    return (
      <form onSubmit={handleSearch} className="flex items-center bg-[#111111] border border-white/10 rounded-full shadow-sm hover:border-white/20 transition-colors overflow-hidden">
        <input
          type="text"
          placeholder="Search service centers..."
          className="flex-1 px-5 py-3 text-sm text-white bg-transparent outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          className="text-[#050505] p-3 m-1 rounded-full hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
        >
          <Search size={18} />
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSearch} className="bg-[#111111]/90 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-black/50 border border-white/10 p-2 lg:p-2.5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Vehicle Type */}
        <div className="relative border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/5 rounded-2xl transition-colors">
          <label className="block px-5 pt-3 text-[11px] font-bold text-white uppercase tracking-wider">Vehicle</label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="w-full px-5 pb-3 pt-0.5 text-sm font-medium text-muted bg-transparent outline-none appearance-none cursor-pointer focus:text-white"
          >
            <option value="" className="bg-[#111111]">Any vehicle</option>
            {vehicleTypes.map((v) => (
              <option key={v} value={v} className="bg-[#111111]">{v}</option>
            ))}
          </select>
        </div>

        {/* Service Type */}
        <div className="relative border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/5 rounded-2xl transition-colors">
          <label className="block px-5 pt-3 text-[11px] font-bold text-white uppercase tracking-wider">Service</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full px-5 pb-3 pt-0.5 text-sm font-medium text-muted bg-transparent outline-none appearance-none cursor-pointer focus:text-white"
          >
            <option value="" className="bg-[#111111]">Any service</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s} className="bg-[#111111]">{s}</option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="relative border-b md:border-b-0 md:border-r md:border-r-transparent border-white/10 hover:bg-white/5 rounded-2xl transition-colors">
          <label className="block px-5 pt-3 text-[11px] font-bold text-white uppercase tracking-wider">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-5 pb-3 pt-0.5 text-sm font-medium text-muted bg-transparent outline-none appearance-none cursor-pointer focus:text-white"
          >
            <option value="" className="bg-[#111111]">Any city</option>
            {cities.map((c) => (
              <option key={c} value={c} className="bg-[#111111]">{c}</option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <div className="flex items-center justify-center p-1 md:p-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 text-[#050505] font-bold py-3.5 md:py-4 px-6 rounded-[1.25rem] hover:opacity-90 transition-all active:scale-[0.98] hover:shadow-lg hover:shadow-accent/20"
            style={{ background: 'linear-gradient(135deg, #d4af37, #b7791f)' }}
          >
            <Search size={18} />
            <span className="md:hidden lg:inline">Search Now</span>
          </button>
        </div>
      </div>
    </form>
  );
}
