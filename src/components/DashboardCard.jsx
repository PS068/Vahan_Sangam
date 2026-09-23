export default function DashboardCard({ icon, title, value, subtitle, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-border p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-heading">{value}</p>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className="w-10 h-10 bg-soft-bg rounded-xl flex items-center justify-center text-accent">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
