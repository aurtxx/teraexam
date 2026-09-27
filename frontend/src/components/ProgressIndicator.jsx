import React from 'react';

export function ProgressIndicator({
  value = 0,
  max = 100,
  label,
  showPercentage = true,
  variant = 'primary', // 'primary', 'success', 'warning', 'danger', 'teal'
  size = 'md', // 'sm', 'md', 'lg'
  className = '',
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4 text-[10px]',
  }[size] || 'h-2.5';

  const barColors = {
    primary: 'bg-indigo-600',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    teal: 'bg-teal-600',
  }[variant] || 'bg-indigo-600';

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1 text-xs">
          {label && <span className="font-medium text-slate-700">{label}</span>}
          {showPercentage && <span className="text-slate-500 font-mono">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizeClasses}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColors}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
