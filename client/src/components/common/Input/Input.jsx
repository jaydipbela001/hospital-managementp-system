import React from 'react';
import './Input.css';

export function Input({
  label,
  id,
  type = 'text',
  error,
  helperText,
  required = false,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
        className="form-input"
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="form-error">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-help`} className="form-helper">
          {helperText}
        </p>
      )}
    </div>
  );
}

export default Input;

