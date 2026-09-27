import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  title,
  ...props
}) {
  const baseClasses = 'btn inline-flex items-center justify-center font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs gap-1 rounded',
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
    md: 'px-4 py-2 text-sm gap-2 rounded-lg',
    lg: 'px-5 py-2.5 text-base gap-2.5 rounded-lg',
  }[size] || 'px-4 py-2 text-sm gap-2 rounded-lg';

  const variantStyles = {
    primary: 'btn-primary bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
    secondary: 'btn-secondary bg-slate-800 hover:bg-slate-900 text-white shadow-sm',
    teal: 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm',
    outline: 'btn-outline border border-slate-300 hover:bg-slate-100 text-slate-700 bg-white shadow-sm',
    ghost: 'hover:bg-slate-100 text-slate-700 bg-transparent',
    danger: 'btn-danger bg-red-600 hover:bg-red-700 text-white shadow-sm',
    dangerOutline: 'border border-red-300 text-red-700 hover:bg-red-50 bg-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    subtle: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200',
  }[variant] || 'btn-primary';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      className={`${baseClasses} ${sizeClasses} ${variantStyles} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" size={size === 'xs' || size === 'sm' ? 14 : 16} />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'xs' || size === 'sm' ? 14 : 16} className="shrink-0" />}
          {children}
          {IconRight && <IconRight size={size === 'xs' || size === 'sm' ? 14 : 16} className="shrink-0" />}
        </>
      )}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  isLoading = false,
  label,
  onClick,
  className = '',
  ...props
}) {
  const sizeMap = {
    xs: { padding: 'p-1 rounded', iconSize: 13 },
    sm: { padding: 'p-1.5 rounded-md', iconSize: 15 },
    md: { padding: 'p-2 rounded-lg', iconSize: 18 },
    lg: { padding: 'p-2.5 rounded-lg', iconSize: 20 },
  }[size] || { padding: 'p-2 rounded-lg', iconSize: 18 };

  const variantStyles = {
    ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 bg-transparent',
    outline: 'border border-slate-300 hover:bg-slate-100 text-slate-700 bg-white shadow-sm',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
    danger: 'text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent',
  }[variant] || 'hover:bg-slate-100 text-slate-600';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeMap.padding} ${variantStyles} ${className}`.trim()}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={sizeMap.iconSize} />
      ) : (
        Icon && <Icon size={sizeMap.iconSize} />
      )}
    </button>
  );
}
