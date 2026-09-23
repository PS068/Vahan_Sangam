import { Link } from 'react-router-dom';

export default function ServiceCard({ service }) {
  return (
    <Link
      to="/service-centers"
      className="group block bg-white rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-soft-bg">
        {service.image ? (
          <img 
            src={service.image} 
            alt={service.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300">
            {service.icon}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-heading text-lg mb-1">{service.name}</h3>
        <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-3">{service.description}</p>
        <span className="text-sm font-semibold text-accent">{service.price}</span>
      </div>
    </Link>
  );
}
