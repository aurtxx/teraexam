import React from 'react';

export function Select({
  label,
  options = [],
  value,
  onChange,
  error,
  helperText,
  placeholder,
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  ...props
}) {
  const selectId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`form-group mb-3 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label block text-xs font-semibold text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`form-input form-select w-full px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 appearance-none transition-colors focus:outline-none pr-8 ${
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-slate-300 focus:border-indigo-600'
          } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            const isDisabled = typeof opt === 'object' ? opt.disabled : false;
            return (
              <option key={val} value={val} disabled={isDisabled}>
                {lbl}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
}
