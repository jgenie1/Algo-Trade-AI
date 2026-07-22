import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
  display: 'swap',
});

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
      <body
        style={{ backgroundColor: '#09070c', color: '#f3f0f6', minHeight: '100vh' }}
        className={cn(
          "font-body antialiased bg-background text-foreground min-h-screen flex flex-col",
          inter.variable,
          spaceGrotesk.variable,
          sourceCodePro.variable
        )}
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
