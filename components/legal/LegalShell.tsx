import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Home } from 'lucide-react';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import SiteFooter from '@/components/SiteFooter';
import { SITE } from '@/lib/site';

export type LegalLang = 'es' | 'en';

/** Los textos legales existen en español e inglés; el resto de idiomas ve la versión inglesa. */
export async function legalLang(): Promise<LegalLang> {
    return (await getLocale()) === 'es' ? 'es' : 'en';
}

export default async function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
    const t = await getTranslations('legal_ui');
    const note = t('english_only');
    const date = new Date(SITE.legalUpdated).toLocaleDateString(await getLocale(), { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <header className="page-header">
                <Link href="/" className="logo" style={{ textDecoration: 'none' }}>{SITE.name}</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LanguageSwitcher />
                    <Link href="/" className="btn btn-ghost btn-sm">
                        <Home size={15} /> {t('back_to_home')}
                    </Link>
                </div>
            </header>

            <main className="legal-page">
                <article className="card">
                    <h1>{title}</h1>
                    <p className="legal-meta">{t('updated', { date })}</p>
                    {note && <p className="legal-meta" style={{ marginTop: '8px' }}>{note}</p>}
                    {children}
                </article>
            </main>

            <SiteFooter />
        </div>
    );
}
