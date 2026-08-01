"use client";

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr" className="dark">
      <body style={{ backgroundColor: '#09070c', color: '#ffffff', fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#140f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', maxWidth: '450px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚡</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#ffffff' }}>AlgoTradeAI - Rechargement</h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Le terminal s'est réinitialisé. Cliquez ci-dessous pour ouvrir l'application.
            </p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
              style={{ width: '100%', height: '44px', backgroundColor: '#c2ff0c', color: '#000000', fontWeight: 'bold', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}
            >
              Recharger l'Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
