import React from 'react';

export function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-inner">
        <div>
          <p className="stat-card-title">{title}</p>
          <h4 className="stat-card-value">{value}</h4>
          {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="stat-card-icon-wrapper">
            <Icon size={24} className="stat-card-icon" />
          </div>
        )}
      </div>
    </div>
  );
}
