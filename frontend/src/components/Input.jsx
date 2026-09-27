import React from 'react';

export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  rightElement,
  required = false,
  disabled = false,
  type = 'text',
  value,
  onChange,
  placeholder,
  id,
  name,
  className = '',
  ...props
}) {
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`form-group mb-3 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label block text-xs font-semibold text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="input-wrapper relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
            <Icon size={16} />
          </div>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={`form-input w-full px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 transition-colors focus:outline-none ${
            Icon ? 'pl-9' : ''
          } ${rightElement ? 'pr-9' : ''} ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
          } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center text-slate-400">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  value,
  onChange,
  placeholder,
  rows = 3,
  id,
  name,
  className = '',
  ...props
}) {
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`form-group mb-3 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label block text-xs font-semibold text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className={`form-input w-full px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 transition-colors focus:outline-none ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
        } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
}
