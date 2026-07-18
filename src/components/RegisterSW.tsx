"use client";

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register);
        return () => window.removeEventListener('load', register);
      }
    }
    
    function register() {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => {
          console.log('PWA ServiceWorker registered successfully with scope:', reg.scope);
        },
        (err) => {
          console.warn('PWA ServiceWorker registration failed:', err);
        }
      );
    }
  }, []);

  return null;
}
