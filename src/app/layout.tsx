import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AppContextProvider } from '@/context/AppContext';
import SWRegister from '@/components/SWRegister';

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

export const viewport: Viewport = {
  themeColor: '#c2ff0c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Algo-Trade-AI | Terminal Quant & Bots',
  description: 'Terminal de trading algorithmique IA, gestion de bots de trading et coffre-fort de réserve 10%.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AlgoTradeAI',
  },
  applicationName: 'AlgoTradeAI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning={true}>
      <body
        className={cn(
          "font-body antialiased bg-background text-foreground min-h-screen flex flex-col",
          inter.variable,
          spaceGrotesk.variable,
          sourceCodePro.variable
        )}
        suppressHydrationWarning={true}
      >
        <SWRegister />
        <AppContextProvider>
          <AppLayout>{children}</AppLayout>
        </AppContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
