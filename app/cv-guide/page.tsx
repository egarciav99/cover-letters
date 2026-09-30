import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FileText, Home } from 'lucide-react';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import SiteFooter from '@/components/SiteFooter';
import CvGuideContent from '@/components/cvGuide/CvGuideContent';
import { SITE } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('cv_guide');
    return {
        title: t('meta_title'),
        description: t('meta_description'),
        alternates: { canonical: '/cv-guide' },
        openGraph: { title: t('meta_title'), description: t('meta_description'), url: `${SITE.url}/cv-guide` },
    };
}

/** Guía pública para hacer un buen CV (atrae visitas y lleva al creador de CV). */
export default async function CvGuidePage() {
    const t = await getTranslations('cv_guide');
    const tl = await getTranslations('legal_ui');
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <header className="page-header">
                <Link href="/" className="logo" style={{ textDecoration: 'none' }}>{SITE.name}</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LanguageSwitcher />
                    <Link href="/" className="btn btn-ghost btn-sm"><Home size={15} /> {tl('back_to_home')}</Link>
                </div>
            </header>

            <main style={{ maxWidth: '820px', margin: '0 auto', padding: '48px 16px 32px' }}>
                <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 800, marginBottom: '12px' }}>{t('title')}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.6, marginBottom: '28px' }}>{t('intro')}</p>

                <CvGuideContent />

                <section className="card" style={{ marginTop: '28px', textAlign: 'center', padding: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>{t('cta_title')}</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>{t('cta_text')}</p>
                    <Link href="/dashboard/cv" className="btn btn-primary" id="cv-guide-cta"><FileText size={16} /> {t('cta_button')}</Link>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
