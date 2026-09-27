import React, { useState, useRef, useEffect } from 'react';

export function Dropdown({
  trigger,
  items = [],
  placement = 'bottom-right', // 'bottom-left' or 'bottom-right'
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const placementClasses = {
    'bottom-right': 'right-0 origin-top-right',
    'bottom-left': 'left-0 origin-top-left',
  }[placement] || 'right-0 origin-top-right';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute z-40 mt-1.5 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 border border-slate-100 focus:outline-none ${placementClasses}`}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return <div key={`div-${idx}`} className="my-1 border-t border-slate-100" />;
            }
            const Icon = item.icon;
            return (
              <button
                key={item.label || idx}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  if (item.onClick) item.onClick();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors text-left ${
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {Icon && <Icon size={14} className={item.danger ? 'text-red-500' : 'text-slate-400'} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
