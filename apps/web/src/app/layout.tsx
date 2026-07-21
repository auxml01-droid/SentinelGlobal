import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '../components/PWARegister';

export const metadata: Metadata = {
  title: 'SentinelGlobal | Centro de Monitoramento de Riscos',
  description: 'Plataforma de monitoramento global de riscos em tempo real com inteligência artificial',
  applicationName: 'SentinelGlobal',
  appleWebApp: {
    capable: true,
    title: 'SentinelGlobal',
    statusBarStyle: 'black-translucent',
  },
  manifest: '/manifest.json',
  keywords: ['monitoramento', 'riscos', 'tempo real', 'desastres', 'conflitos', 'IA'],
  authors: [{ name: 'SentinelGlobal' }],
  creator: 'SentinelGlobal',
  publisher: 'SentinelGlobal',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'SentinelGlobal',
    title: 'SentinelGlobal | Centro de Monitoramento de Riscos',
    description: 'Plataforma de monitoramento global de riscos em tempo real',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1a2e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="bg-sentinel-900 text-sentinel-50 antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
