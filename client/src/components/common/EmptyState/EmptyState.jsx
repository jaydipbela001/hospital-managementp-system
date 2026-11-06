import React from 'react';
import './EmptyState.css';

export function EmptyState({
  title = 'No records found',
  description = 'There is no data to display right now.',
  action,
  icon,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      {icon ? <div className="empty-state-icon">{icon}</div> : (
        <div className="empty-state-icon" aria-hidden="true">📋</div>
      )}
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export default EmptyState;

