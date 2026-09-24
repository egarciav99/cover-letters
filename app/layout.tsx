import type { Metadata } from 'next';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { SITE, ADSENSE_CLIENT } from '@/lib/site';
import './globals.css';

const DESCRIPTION =
    'Generate personalized cover letters with AI. Upload your CV, paste the job offer and get a tailored letter in seconds. 3 free letters every month.';

export const metadata: Metadata = {
    metadataBase: new URL(SITE.url),
    title: {
        default: 'CoverCraft — AI Cover Letter Generator',
        template: '%s · CoverCraft',
    },
    description: DESCRIPTION,
    alternates: { canonical: '/' },
    openGraph: {
        type: 'website',
        siteName: SITE.name,
        title: 'CoverCraft — AI Cover Letter Generator',
        description: DESCRIPTION,
        url: SITE.url,
    },
    twitter: {
        card: 'summary',
        title: 'CoverCraft — AI Cover Letter Generator',
        description: DESCRIPTION,
    },
    // AdSense pide esta etiqueta para verificar el sitio.
    other: ADSENSE_CLIENT ? { 'google-adsense-account': ADSENSE_CLIENT } : {},
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body>
                <NextIntlClientProvider messages={messages}>
                    {children}
                </NextIntlClientProvider>
                <Analytics />
                {ADSENSE_CLIENT && (
                    // Carga AdSense y su CMP (mensaje de consentimiento de Google, configurado en AdSense).
                    <Script
                        id="adsense"
                        async
                        strategy="afterInteractive"
                        crossOrigin="anonymous"
                        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
                    />
                )}
            </body>
        </html>
    );
}
