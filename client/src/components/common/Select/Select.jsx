import React from 'react';
import '../Input/Input.css';
import './Select.css';

export function Select({
  label,
  id,
  options = [],
  error,
  helperText,
  required = false,
  className = '',
  placeholder = 'Select an option',
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
          {required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-help` : undefined}
        className="form-input form-select"
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="form-error">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${selectId}-help`} className="form-helper">
          {helperText}
        </p>
      )}
    </div>
  );
}

export default Select;

