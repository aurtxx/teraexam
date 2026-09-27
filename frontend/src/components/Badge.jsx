import React from 'react';

export function Badge({ children, variant = 'default', size = 'sm' }) {
  const variantStyles = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    purple: 'badge-purple',
  };

  const statusVariantMap = {
    ACTIVE: 'success',
    DRAFT: 'warning',
    ARCHIVED: 'default',
    LOW: 'default',
    MEDIUM: 'info',
    HIGH: 'warning',
    CRITICAL: 'danger',
    SUPERUSER: 'purple',
    STAFF: 'info',
    REGULAR: 'default',
  };

  const resolvedVariant = statusVariantMap[children] || variant;

  return (
    <span className={`badge ${variantStyles[resolvedVariant] || 'badge-default'} badge-${size}`}>
      {children}
    </span>
  );
}
