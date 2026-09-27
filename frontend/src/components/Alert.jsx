import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function Alert({
  variant = 'info', // 'info', 'success', 'warning', 'danger', 'neutral'
  title,
  children,
  onDismiss,
  action,
  className = '',
}) {
  const config = {
    info: {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      icon: Info,
      iconColor: 'text-indigo-600',
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
    },
    danger: {
      bg: 'bg-red-50 border-red-200 text-red-900',
      icon: AlertCircle,
      iconColor: 'text-red-600',
    },
    neutral: {
      bg: 'bg-slate-50 border-slate-200 text-slate-800',
      icon: Info,
      iconColor: 'text-slate-500',
    },
  }[variant] || {
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    icon: Info,
    iconColor: 'text-indigo-600',
  };

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg} ${className}`}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-sm font-semibold mb-0.5">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
