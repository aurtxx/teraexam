import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'Get started by creating your first entry.',
  actionLabel,
  onAction,
  actionIcon,
  secondaryAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 ${className}`}>
      <div className="p-3.5 bg-slate-50 text-slate-400 rounded-2xl mb-3">
        <Icon size={28} />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
      {(actionLabel || secondaryAction) && (
        <div className="mt-4 flex items-center gap-2.5">
          {actionLabel && (
            <Button size="sm" onClick={onAction} icon={actionIcon}>
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
