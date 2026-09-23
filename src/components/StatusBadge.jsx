export default function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const labels = {
    completed: 'Completed',
    upcoming: 'Upcoming',
    cancelled: 'Cancelled',
    'in-progress': 'In Progress',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.upcoming}`}>
      {labels[status] || status}
    </span>
  );
}
