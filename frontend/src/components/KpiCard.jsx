import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function KpiCard({
  title,
  value,
  change,
  trend, // 'up', 'down', 'neutral'
  icon: Icon,
  color = 'primary', // 'primary', 'teal', 'amber', 'emerald', 'crimson', 'purple'
  subtitle,
  onClick,
  className = '',
}) {
  const colorStyles = {
    primary: {
      iconBg: 'bg-indigo-50 text-indigo-600',
      accentBorder: 'hover:border-indigo-300',
    },
    teal: {
      iconBg: 'bg-teal-50 text-teal-700',
      accentBorder: 'hover:border-teal-300',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600',
      accentBorder: 'hover:border-amber-300',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600',
      accentBorder: 'hover:border-emerald-300',
    },
    crimson: {
      iconBg: 'bg-red-50 text-red-600',
      accentBorder: 'hover:border-red-300',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600',
      accentBorder: 'hover:border-purple-300',
    },
  }[color] || {
    iconBg: 'bg-indigo-50 text-indigo-600',
    accentBorder: 'hover:border-indigo-300',
  };

  return (
    <div
      onClick={onClick}
      className={`card bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${colorStyles.accentBorder} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${colorStyles.iconBg}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">{value}</span>
        {change && (
          <span
            className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
              trend === 'up'
                ? 'text-emerald-700 bg-emerald-50'
                : trend === 'down'
                ? 'text-red-700 bg-red-50'
                : 'text-slate-600 bg-slate-100'
            }`}
          >
            {trend === 'up' && <TrendingUp size={12} className="mr-0.5" />}
            {trend === 'down' && <TrendingDown size={12} className="mr-0.5" />}
            {trend === 'neutral' && <Minus size={12} className="mr-0.5" />}
            {change}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
