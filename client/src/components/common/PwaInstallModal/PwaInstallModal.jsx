import React from 'react';
import './PwaInstallModal.css';

export function PwaInstallModal({ isOpen, onClose, isIOS }) {
  if (!isOpen) return null;

  return (
    <div className="pwa-modal-backdrop" onClick={onClose}>
      <div className="pwa-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="pwa-modal-header">
          <div className="pwa-modal-icon">📲</div>
          <div className="pwa-modal-title-box">
            <h3>Install LifeCare HMS</h3>
            <p>Use it like a native app on your phone</p>
          </div>
          <button type="button" className="pwa-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="pwa-modal-body">
          {isIOS ? (
            <div className="pwa-steps">
              <div className="pwa-step">
                <span className="step-num">1</span>
                <div>
                  Tap the <strong>Share</strong> button in Safari's bottom toolbar (the square with an arrow pointing up).
                </div>
              </div>
              <div className="pwa-step">
                <span className="step-num">2</span>
                <div>
                  Scroll down the share sheet and tap <strong>"Add to Home Screen"</strong> (➕).
                </div>
              </div>
              <div className="pwa-step">
                <span className="step-num">3</span>
                <div>
                  Tap <strong>"Add"</strong> in the top-right corner to finish.
                </div>
              </div>
            </div>
          ) : (
            <div className="pwa-steps">
              <div className="pwa-step">
                <span className="step-num">1</span>
                <div>
                  Tap the <strong>3 dots menu (⋮)</strong> at the top right of your browser (Chrome / Edge / Samsung).
                </div>
              </div>
              <div className="pwa-step">
                <span className="step-num">2</span>
                <div>
                  Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </div>
              </div>
              <div className="pwa-step">
                <span className="step-num">3</span>
                <div>
                  Confirm by tapping <strong>"Install"</strong>. The app icon will appear on your phone home screen!
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pwa-modal-footer">
          <button type="button" className="pwa-modal-confirm-btn" onClick={onClose}>
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}

export default PwaInstallModal;
