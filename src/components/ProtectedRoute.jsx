import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastNotification';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { currentUser, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const { addToast } = useToast();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      addToast('Authentication Required: Please sign in to access this protected area.', 'security');
    } else if (!loading && isAuthenticated && allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
      addToast(`Access Denied: You need ${allowedRoles.join(' or ')} privileges to view this page.`, 'error');
    }
  }, [loading, isAuthenticated, currentUser, allowedRoles, addToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm font-medium animate-pulse">Verifying secure credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname, requiredRole: allowedRoles[0] || 'customer' }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
    return (
      <div className="min-h-screen bg-[#050505] pt-32 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#111111]/90 border border-red-500/20 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-400">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Your current account ({currentUser?.email} - <span className="capitalize font-semibold text-accent">{currentUser?.role}</span>) does not have authorization to access this management module.
          </p>
          <div className="space-y-3">
            <Navigate to="/" replace />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
