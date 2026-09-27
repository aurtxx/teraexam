import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="toast-icon text-success" size={20} />,
    warning: <AlertTriangle className="toast-icon text-warning" size={20} />,
    error: <AlertCircle className="toast-icon text-danger" size={20} />,
  };

  return (
    <div className={`toast-container toast-${toast.type || 'info'}`} role="status">
      <div className="toast-content">
        {icons[toast.type] || null}
        <span className="toast-message">{toast.message}</span>
      </div>
      <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
