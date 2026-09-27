import React from 'react';

export function Card({
  children,
  title,
  subtitle,
  action,
  footer,
  className = '',
  padding = 'md',
  hoverable = false,
  noBorder = false,
  ...props
}) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }[padding] || 'p-5';

  return (
    <div
      className={`card bg-white rounded-xl ${
        noBorder ? '' : 'border border-slate-200'
      } shadow-sm ${
        hoverable ? 'hover:shadow-md transition-shadow' : ''
      } ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}
      <div className={paddingClasses}>{children}</div>
      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
}
