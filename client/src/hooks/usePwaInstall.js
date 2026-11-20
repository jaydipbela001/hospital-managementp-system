import { useState, useEffect } from 'react';

// Store prompt globally so it persists across page changes
let globalDeferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    listeners.forEach((cb) => cb(e));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    listeners.forEach((cb) => cb(null));
  });
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isRunningStandalone);

    const handler = (p) => setPrompt(p);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const triggerInstall = async () => {
    if (globalDeferredPrompt) {
      globalDeferredPrompt.prompt();
      try {
        const { outcome } = await globalDeferredPrompt.userChoice;
        if (outcome === 'accepted') {
          globalDeferredPrompt = null;
          setPrompt(null);
        }
      } catch (err) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  return {
    isStandalone,
    canInstall: !isStandalone,
    hasNativePrompt: Boolean(prompt),
    triggerInstall,
    showGuideModal,
    setShowGuideModal,
    isIOS,
  };
}
