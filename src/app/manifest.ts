import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AlgoTrade AI Enterprise ERP - Quantitative SaaS Trading Suite',
    short_name: 'AlgoTrade ERP',
    description: 'SaaS ERP Enterprise de Trading Algorithmique, Gestion de Trésorerie Multi-Actifs & Intelligence Artificielle.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09070c',
    theme_color: '#c2ff0c',
    orientation: 'any',
    icons: [
      {
        src: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=192&h=192&fit=crop&q=80',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=512&h=512&fit=crop&q=80',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Trading Terminal',
        url: '/',
        description: 'Accéder au Terminal de Trading Direct'
      },
      {
        name: 'ERP Enterprise',
        url: '/erp',
        description: 'Gestion de Trésorerie et Audit ERP'
      },
      {
        name: 'Analyse IA',
        url: '/analysis',
        description: 'Analyse Visuelle par Gemini IA'
      }
    ]
  };
}
