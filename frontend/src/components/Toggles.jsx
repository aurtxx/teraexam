import React from 'react';

export function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  description,
  id,
  name,
  className = '',
  ...props
}) {
  const checkboxId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-start gap-2.5 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <input
        id={checkboxId}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="form-checkbox mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        {...props}
      />
      <div>
        {label && <span className="text-sm font-medium text-slate-800">{label}</span>}
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

export function Radio({
  label,
  checked = false,
  onChange,
  disabled = false,
  name,
  value,
  description,
  id,
  className = '',
  ...props
}) {
  const radioId = id || `${name}-${value}`;

  return (
    <label
      htmlFor={radioId}
      className={`inline-flex items-start gap-2.5 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <input
        id={radioId}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="form-radio mt-0.5 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        {...props}
      />
      <div>
        {label && <span className="text-sm font-medium text-slate-800">{label}</span>}
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

export function Switch({
  label,
  checked = false,
  onChange,
  disabled = false,
  description,
  id,
  name,
  className = '',
  ...props
}) {
  const switchId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {(label || description) && (
        <label htmlFor={switchId} className="cursor-pointer select-none">
          {label && <span className="text-sm font-medium text-slate-800 block">{label}</span>}
          {description && <span className="text-xs text-slate-500 block mt-0.5">{description}</span>}
        </label>
      )}
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-indigo-600' : 'bg-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        {...props}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
