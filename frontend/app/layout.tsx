import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Manrope, Oswald } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import { I18nProvider } from '@/lib/i18n';
import { PageTitle } from '@/components/page-title';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const oswald = Oswald({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-oswald',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ЛВС — Лучшая Версия Себя',
  description:
    'Личный кабинет платформы ЛВС: трекер привычек, дневник, марафоны и база знаний.',
  applicationName: 'ЛВС',
  openGraph: {
    title: 'ЛВС — Лучшая Версия Себя',
    description: 'Личный кабинет платформы ЛВС.',
    type: 'website',
    locale: 'ru_RU',
    siteName: 'ЛВС',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${manrope.variable} ${oswald.variable} ${mono.variable}`}
    >
      <body>
        <I18nProvider>
          <AuthProvider>
            <PageTitle />
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
