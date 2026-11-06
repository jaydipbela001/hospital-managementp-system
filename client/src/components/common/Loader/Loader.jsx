import React from 'react';
import './Loader.css';

export function Loader({ size = 'md', message, fullScreen = false }) {
  const content = (
    <div className={`loader-wrapper loader-${size}`}>
      <div className="loader-spinner" aria-hidden="true" />
      {message && <p className="loader-message">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="loader-fullscreen">{content}</div>;
  }

  return content;
}

export default Loader;

