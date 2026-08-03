import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--vf-font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://juris-flow.com.br'),
  title: {
    default: 'Juris-Flow — O software jurídico brasileiro que entende do Direito',
    template: '%s · Juris-Flow',
  },
  description:
    'IA jurídica que gera peças processuais, monitora DJEN oficial e calcula tudo. Para advogados autônomos e pequenos escritórios.',
  keywords: [
    'software jurídico',
    'gerador de petições',
    'IA jurídica',
    'monitor DJEN',
    'calculadora TRCT',
    'advogado',
  ],
  authors: [{ name: 'Juris-Flow' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://juris-flow.com.br',
    siteName: 'Juris-Flow',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="dark" className={inter.variable}>
      <body className="min-h-screen bg-ink-950 text-ink-50 antialiased">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgb(37, 40, 48)',
              border: '1px solid rgb(37, 40, 48)',
              color: 'rgb(238, 239, 241)',
            },
          }}
        />
      </body>
    </html>
  );
}
