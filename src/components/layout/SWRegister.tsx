"use client";

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('PWA ServiceWorker registered with scope: ', registration.scope);
            registration.update();
          },
          (err) => {
            console.warn('PWA ServiceWorker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return null;
}
