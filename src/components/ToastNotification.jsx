import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />,
    warning: <AlertTriangle className="text-amber-400 shrink-0" size={20} />,
    error: <AlertCircle className="text-rose-400 shrink-0" size={20} />,
    info: <Info className="text-accent shrink-0" size={20} />,
    security: <AlertCircle className="text-[#d4af37] shrink-0" size={20} />
  };

  const borders = {
    success: 'border-emerald-500/30 bg-[#0d1f17]/90 text-emerald-100 shadow-emerald-500/10',
    warning: 'border-amber-500/30 bg-[#1f1a0d]/90 text-amber-100 shadow-amber-500/10',
    error: 'border-rose-500/30 bg-[#1f0d0f]/90 text-rose-100 shadow-rose-500/10',
    info: 'border-white/10 bg-[#111111]/90 text-white shadow-black/50',
    security: 'border-accent/40 bg-[#1a1609]/95 text-amber-50 shadow-accent/20'
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container with slick animations */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform animate-in slide-in-from-right-8 fade-in ${
              borders[toast.type] || borders.info
            }`}
          >
            {icons[toast.type] || icons.info}
            <div className="flex-1 text-sm font-medium leading-snug">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
