import { useState, useMemo } from 'react';
import {
  Users, Search, Eye, EyeOff, Download, Shield, UserCheck,
  Phone, Mail, Calendar, Hash, X, ChevronUp, ChevronDown,
  BarChart3, Activity, UserX, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function StatCard({ icon: Icon, label, value, color = 'sky', sub }) {
  const colors = {
    sky:     { bg: 'from-sky-500/20 via-sky-600/10 to-transparent', border: 'border-sky-500/30', text: 'text-sky-300', icon: 'text-sky-400' },
    amber:   { bg: 'from-amber-500/20 via-amber-600/10 to-transparent', border: 'border-amber-500/30', text: 'text-amber-300', icon: 'text-amber-400' },
    emerald: { bg: 'from-emerald-500/20 via-emerald-600/10 to-transparent', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: 'text-emerald-400' },
    rose:    { bg: 'from-rose-500/20 via-rose-600/10 to-transparent', border: 'border-rose-500/30', text: 'text-rose-300', icon: 'text-rose-400' },
  };
  const c = colors[color];
  return (
    <div className={`p-5 rounded-3xl border ${c.border} bg-gradient-to-br ${c.bg} backdrop-blur-xl`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 ${c.icon}`}>
          <Icon size={18} />
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-widest ${c.text}`}>{label}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function IntelligencePanel({ onClose }) {
  const { registeredUsers } = useAuth();
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-sky-400" />
      : <ChevronDown size={12} className="text-sky-400" />;
  };

  const filtered = useMemo(() => {
    let users = [...(registeredUsers || [])];

    if (roleFilter !== 'ALL') {
      users = users.filter(u => (u.role || 'customer') === roleFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.uid || '').toLowerCase().includes(q)
      );
    }

    users.sort((a, b) => {
      let av = (a[sortField] || '').toString().toLowerCase();
      let bv = (b[sortField] || '').toString().toLowerCase();
      if (sortDir === 'asc') return av < bv ? -1 : av > bv ? 1 : 0;
      return av > bv ? -1 : av < bv ? 1 : 0;
    });

    return users;
  }, [registeredUsers, search, roleFilter, sortField, sortDir]);

  // Stats
  const totalUsers = (registeredUsers || []).length;
  const customers = (registeredUsers || []).filter(u => (u.role || 'customer') === 'customer').length;
  const admins = (registeredUsers || []).filter(u => u.role === 'admin').length;
  const phoneVerified = (registeredUsers || []).filter(u => u.isPhoneConfirmed).length;

  const roleBadge = (role) => {
    const map = {
      admin:    { label: 'Admin', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
      mechanic: { label: 'Mechanic', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
      customer: { label: 'Customer', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    };
    const { label, cls } = map[role] || map.customer;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{label}</span>
    );
  };

  // CSV Export
  const handleExport = () => {
    const headers = ['UID', 'Name', 'Email', 'Phone', 'Role', 'Password', 'Phone Verified', 'Created At'];
    const rows = filtered.map(u => [
      u.uid || '-',
      u.name || '-',
      u.email || '-',
      u.phone || '-',
      u.role || 'customer',
      u.password || '-',
      u.isPhoneConfirmed ? 'Yes' : 'No',
      u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autoserve_users_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-[#060a14]/95 backdrop-blur-2xl py-8 px-4">

      {/* Ambient glow blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative w-full max-w-7xl z-10 space-y-6 animate-fade-in">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold uppercase tracking-widest mb-2">
              <BarChart3 size={12} /> Intelligence Panel — Manager Access Only
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              User Registry & Analytics
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Structured view of all registered accounts, credentials, and activity metrics.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-all shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* KPI STAT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={totalUsers} color="sky" sub="All registered accounts" />
          <StatCard icon={User} label="Customers" value={customers} color="amber" sub="Active customer accounts" />
          <StatCard icon={Shield} label="Admin / Staff" value={admins} color="emerald" sub="Admin & mechanic roles" />
          <StatCard icon={UserCheck} label="Phone Verified" value={phoneVerified} color="rose" sub="OTP-confirmed numbers" />
        </div>

        {/* FILTER & SEARCH BAR */}
        <div className="p-5 rounded-3xl bg-white/3 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, phone or UID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-sky-500/50 text-white text-sm placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Role Filter */}
          <div className="flex gap-1.5">
            {['ALL', 'customer', 'admin', 'mechanic'].map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all capitalize ${
                  roleFilter === r
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowPasswords(p => !p)}
              className={`px-3 py-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                showPasswords
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 transition-all"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="rounded-3xl border border-white/10 overflow-hidden bg-[#070a14]/80 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/3">
                  {[
                    { key: 'uid', label: 'UID' },
                    { key: 'name', label: 'Full Name' },
                    { key: 'email', label: 'Email Address' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'role', label: 'Role' },
                    { key: 'password', label: 'Password' },
                    { key: 'createdAt', label: 'Joined' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-sky-300 transition-colors select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label} <SortIcon field={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-slate-500 text-sm">
                      <UserX size={36} className="mx-auto mb-3 text-slate-600" />
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : filtered.map((user, i) => (
                  <tr
                    key={user.uid || i}
                    className="border-b border-white/5 hover:bg-white/4 transition-colors group"
                  >
                    {/* UID */}
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      <span className="bg-white/5 px-2 py-1 rounded-lg border border-white/8">
                        {(user.uid || '-').slice(0, 12)}…
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-[11px] font-black text-white shrink-0">
                          {(user.name || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-sm">{user.name || '—'}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                        <Mail size={12} className="text-slate-500 shrink-0" />
                        {user.email || '—'}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-300 text-xs font-mono whitespace-nowrap">
                        <Phone size={12} className="text-slate-500 shrink-0" />
                        {user.phone || '—'}
                        {user.isPhoneConfirmed && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">✓</span>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {roleBadge(user.role || 'customer')}
                    </td>

                    {/* Password */}
                    <td className="px-4 py-3 font-mono text-xs">
                      {showPasswords ? (
                        <span className="bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg text-rose-200 text-[11px]">
                          {user.password || '—'}
                        </span>
                      ) : (
                        <span className="text-slate-600 tracking-widest text-base">{'•'.repeat(Math.min(user.password?.length || 8, 12))}</span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} className="shrink-0" />
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                          : 'Pre-existing'}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 transition-all"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-5 py-3 border-t border-white/5 bg-white/2 flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              Showing <span className="text-sky-300 font-bold">{filtered.length}</span> of <span className="text-white font-bold">{totalUsers}</span> users
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-600">
              <Activity size={11} /> Real-time from localStorage
            </div>
          </div>
        </div>
      </div>

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl" onClick={() => setSelectedUser(null)}>
          <div
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0a0e1c] shadow-2xl p-6 space-y-5 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-lg">User Detail Card</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-2xl font-black text-white">
                {(selectedUser.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-white text-base">{selectedUser.name || '—'}</h4>
                <div className="mt-1">{roleBadge(selectedUser.role || 'customer')}</div>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Hash, label: 'User ID', value: selectedUser.uid },
                { icon: Mail, label: 'Email', value: selectedUser.email },
                { icon: Phone, label: 'Phone', value: selectedUser.phone },
                { icon: Shield, label: 'Password', value: showPasswords ? selectedUser.password : '•'.repeat(Math.min(selectedUser.password?.length || 8, 12)) },
                { icon: UserCheck, label: 'Phone Verified', value: selectedUser.isPhoneConfirmed ? 'Yes ✓' : 'No' },
                { icon: Calendar, label: 'Joined', value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pre-existing' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="p-3 rounded-2xl bg-white/5 border border-white/8">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">
                    <Icon size={11} /> {label}
                  </div>
                  <p className={`text-xs font-semibold break-all ${label === 'Password' ? 'font-mono text-rose-200' : 'text-white'}`}>
                    {value || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
