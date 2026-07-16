
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

export const metadata: Metadata = {
  title: 'AlgoTradeAI - Analyse Forex',
  description: 'Analyse du marché Forex avec IA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
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
      </body>
    </html>
  );
}
