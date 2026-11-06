import React from 'react';
import './Button.css';

export function Button({
  children,
  variant = 'primary', // primary | secondary | outline | ghost | danger
  size = 'md',        // sm | md | lg
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      <span className="btn-text">{children}</span>
    </button>
  );
}

export default Button;

