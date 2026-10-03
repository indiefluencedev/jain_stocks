/**
 * @file src/app/layout.tsx
 * @description Next.js App Router Root Layout Component.
 * 
 * Provides global HTML wrapper structure, custom typography fonts (DM Sans, Rajdhani),
 * global CSS styling, and mounts global Providers (`AppProvider`, `ModalRoot`, `ToastRoot`).
 * 
 * @module RootLayout
 */

import type { Metadata } from 'next';
import { DM_Sans, Rajdhani } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ModalRoot } from '@/components/UI/ModalRoot';
import { ToastRoot } from '@/components/UI/ToastRoot';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  variable: '--font-rajdhani',
  weight: ['500', '600', '700'],
  display: 'swap',
});

/** SEO Metadata for the Application */
export const metadata: Metadata = {
  title: 'Jain Automobiles · Stock Management',
  description: 'Authorised Royal Enfield Dealer · GMA & Parts Stock Management System',
};

/** Viewport theme settings */
export const viewport = {
  themeColor: '#0e0e10',
};

/**
 * Root Layout Component wrapping all application pages.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${rajdhani.variable}`}>
      <body>
        <AppProvider>
          <div id="app-root">{children}</div>
          <ModalRoot />
          <ToastRoot />
          <div id="print-root" />
        </AppProvider>
      </body>
    </html>
  );
}
