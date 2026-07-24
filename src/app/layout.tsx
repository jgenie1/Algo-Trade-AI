import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AppContextProvider } from '@/context/AppContext';
import RegisterSW from '@/components/RegisterSW';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'AlgoTradeAI - Analyse Forex & Memecoins',
  description: 'Analyse du marché Forex avec IA & Sniper Solana Pump.fun',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AlgoTradeAI'
  }
};

export const viewport: Viewport = {
  themeColor: '#c2ff0c'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning={true} style={{ backgroundColor: '#09070c', color: '#f3f0f6' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Source+Code+Pro:wght@400;600&display=swap" 
          rel="stylesheet" 
        />
        <style dangerouslySetInnerHTML={{ __html: `
          ul, ol { list-style: none !important; padding: 0 !important; margin: 0 !important; }
          a { text-decoration: none !important; color: inherit !important; }
          body { background-color: #09070c !important; color: #f3f0f6 !important; font-family: 'Inter', system-ui, -apple-system, sans-serif !important; }
          button { cursor: pointer; }
        ` }} />
      </head>
      <body
        style={{ backgroundColor: '#09070c', color: '#f3f0f6', minHeight: '100vh' }}
        className="font-body antialiased bg-background text-foreground min-h-screen flex flex-col"
        suppressHydrationWarning={true}
      >
        <ErrorBoundary>
          <AppContextProvider>
            <AppLayout>{children}</AppLayout>
          </AppContextProvider>
        </ErrorBoundary>
        <Toaster />
        <RegisterSW />
      </body>
    </html>
  );
}
