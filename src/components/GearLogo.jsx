export default function GearLogo({ size = 40, className = '', spinOnHover = true }) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  
  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-amber-500/20 border border-amber-400/30 group transition-all duration-300 ${className}`}
      style={{ 
        width: pixelSize, 
        height: pixelSize, 
        background: 'radial-gradient(circle at 35% 35%, #222222 0%, #0d0d0d 65%, #050505 100%)' 
      }}
    >
      {/* Ambient background soft glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent opacity-80 pointer-events-none" />

      {/* SVG Gear Graphic */}
      <svg 
        viewBox="0 0 64 64" 
        className={`w-full h-full p-1.5 transition-transform duration-700 ease-out ${
          spinOnHover ? 'group-hover:rotate-90' : ''
        }`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gearGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE885" />
            <stop offset="35%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#B7791F" />
            <stop offset="100%" stopColor="#8C530A" />
          </linearGradient>

          <filter id="gearGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#D4AF37" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* 8-Tooth Precision Mechanical Gear Body */}
        <g filter="url(#gearGlow)">
          <path
            d="M34.8 12h-5.6l-1 4.5a16 16 0 0 0-4.1 1.7l-4.2-2.2-4 4 2.2 4.2a16 16 0 0 0-1.7 4.1L12 29.2v5.6l4.5 1a16 16 0 0 0 1.7 4.1l-2.2 4.2 4 4 4.2-2.2a16 16 0 0 0 4.1 1.7l1 4.5h5.6l1-4.5a16 16 0 0 0 4.1-1.7l4.2 2.2 4-4-2.2-4.2a16 16 0 0 0 1.7-4.1l4.5-1v-5.6l-4.5-1a16 16 0 0 0-1.7-4.1l2.2-4.2-4-4-4.2 2.2a16 16 0 0 0-4.1-1.7l-1-4.5z"
            fill="url(#gearGoldGradient)"
          />
          
          {/* Central Hub Cutout */}
          <circle 
            cx="32" 
            cy="32" 
            r="10" 
            fill="#0d0d0d" 
            stroke="url(#gearGoldGradient)" 
            strokeWidth="2.5" 
          />
          
          {/* Central Precision Core Diamond Pin */}
          <polygon points="32,25 36,32 32,39 28,32" fill="url(#gearGoldGradient)" />
          <circle cx="32" cy="32" r="2" fill="#FFE885" />
        </g>
      </svg>
    </div>
  );
}
