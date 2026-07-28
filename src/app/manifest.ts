import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Algo-Trade-AI | Terminal Quant & Bots',
    short_name: 'AlgoTradeAI',
    description: 'Terminal de trading algorithmique IA, gestion de bots de trading et coffre-fort de réserve 10%.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0c0d12',
    theme_color: '#c2ff0c',
    categories: ['finance', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Dépôt / Créditer',
        short_name: 'Dépôt',
        description: 'Accéder au rechargement de compte et au Coffre-Fort',
        url: '/deposit',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Retrait de Fonds',
        short_name: 'Retrait',
        description: 'Retirer des SOL ou transférer du Coffre-Fort',
        url: '/withdraw',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Analyses & PnL',
        short_name: 'Analytics',
        description: 'Voir les statistiques et exporter les rapports CSV',
        url: '/analytics',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Stratégies & Bots',
        short_name: 'Stratégies',
        description: 'Marketplace de bots et copy-trading',
        url: '/strategies',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
      }
    ]
  };
}
