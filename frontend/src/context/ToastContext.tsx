import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    showToast,
    success: useCallback((m: string) => showToast(m, 'success'), [showToast]),
    error: useCallback((m: string) => showToast(m, 'error'), [showToast]),
    info: useCallback((m: string) => showToast(m, 'info'), [showToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '400px',
          width: 'calc(100vw - 40px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const palette =
            t.type === 'success'
              ? { bg: 'rgba(6, 78, 59, 0.95)', border: 'rgba(52, 211, 153, 0.5)', color: '#d1fae5', icon: <CheckCircle2 size={18} color="#34d399" /> }
              : t.type === 'error'
              ? { bg: 'rgba(127, 29, 29, 0.95)', border: 'rgba(248, 113, 113, 0.5)', color: '#fee2e2', icon: <AlertCircle size={18} color="#f87171" /> }
              : { bg: 'rgba(30, 27, 75, 0.95)', border: 'rgba(129, 140, 248, 0.5)', color: '#e0e7ff', icon: <Info size={18} color="#818cf8" /> };

          return (
            <div
              key={t.id}
              role="status"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: palette.bg,
                border: `1px solid ${palette.border}`,
                color: palette.color,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(10px)',
                fontSize: '13px',
                lineHeight: 1.45,
                fontWeight: 500,
              }}
            >
              <span style={{ flexShrink: 0, marginTop: '1px' }}>{palette.icon}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: palette.color,
                  opacity: 0.7,
                  cursor: 'pointer',
                  padding: '2px',
                  flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
