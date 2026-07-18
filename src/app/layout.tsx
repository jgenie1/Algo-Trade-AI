
import type {Metadata} from 'next';
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

export const metadata: Metadata = {
  title: 'AlgoTradeAI - Analyse Forex & Memecoins',
  description: 'Analyse du marché Forex avec IA & Sniper Solana Pump.fun',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning={true}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AlgoTradeAI" />
        <meta name="theme-color" content="#c2ff0c" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={cn(
          "font-body antialiased bg-background text-foreground min-h-screen flex flex-col",
          inter.variable,
          spaceGrotesk.variable,
          sourceCodePro.variable
        )}
        suppressHydrationWarning={true}
      >
        <AppContextProvider>
          <AppLayout>{children}</AppLayout>
        </AppContextProvider>
        <Toaster />
        <RegisterSW />
      </body>
    </html>
  );
}
