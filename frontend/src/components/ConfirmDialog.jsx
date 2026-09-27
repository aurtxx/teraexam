import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger', // 'danger', 'primary', 'warning'
  isLoading = false,
  icon: CustomIcon,
}) {
  const getIcon = () => {
    if (CustomIcon) return <CustomIcon size={24} className="text-slate-700" />;
    switch (confirmVariant) {
      case 'danger':
        return <AlertCircle size={24} className="text-red-600" />;
      case 'warning':
        return <AlertTriangle size={24} className="text-amber-600" />;
      default:
        return <Info size={24} className="text-indigo-600" />;
    }
  };

  const getIconBg = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-red-50';
      case 'warning':
        return 'bg-amber-50';
      default:
        return 'bg-indigo-50';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="460px">
      <div className="flex items-start gap-4 py-2">
        <div className={`p-2.5 rounded-full shrink-0 ${getIconBg()}`}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          size="sm"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
