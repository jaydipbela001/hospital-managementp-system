import React from 'react';
import './Badge.css';

export function Badge({
  children,
  variant = 'neutral', // success | warning | danger | info | primary | neutral
  className = '',
  ...props
}) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;

