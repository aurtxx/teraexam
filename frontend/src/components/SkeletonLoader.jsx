import React from 'react';

export function Skeleton({
  variant = 'text', // 'text', 'circular', 'rectangular', 'card', 'table'
  width,
  height,
  className = '',
  count = 1,
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-lg';
      case 'text':
      default:
        return 'rounded h-3 w-full';
    }
  };

  const renderSingle = (key) => (
    <div
      key={key}
      style={{ width, height }}
      className={`animate-pulse bg-slate-200/80 ${getVariantStyles()} ${className}`}
    />
  );

  if (variant === 'card') {
    return (
      <div className={`p-5 bg-white border border-slate-200 rounded-xl space-y-3 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="animate-pulse bg-slate-200 rounded h-3 w-1/3" />
          <div className="animate-pulse bg-slate-200 rounded h-6 w-6" />
        </div>
        <div className="animate-pulse bg-slate-200 rounded h-7 w-1/2" />
        <div className="animate-pulse bg-slate-200 rounded h-2.5 w-3/4" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-3 p-4 bg-white border border-slate-200 rounded-xl ${className}`}>
        <div className="flex gap-4 border-b pb-3">
          <div className="animate-pulse bg-slate-200 rounded h-4 w-1/4" />
          <div className="animate-pulse bg-slate-200 rounded h-4 w-1/4" />
          <div className="animate-pulse bg-slate-200 rounded h-4 w-1/4" />
          <div className="animate-pulse bg-slate-200 rounded h-4 w-1/4" />
        </div>
        {Array.from({ length: count || 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2 border-b border-slate-100 last:border-0">
            <div className="animate-pulse bg-slate-100 rounded h-3 w-1/4" />
            <div className="animate-pulse bg-slate-100 rounded h-3 w-1/4" />
            <div className="animate-pulse bg-slate-100 rounded h-3 w-1/4" />
            <div className="animate-pulse bg-slate-100 rounded h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => renderSingle(i))}
      </div>
    );
  }

  return renderSingle(0);
}
