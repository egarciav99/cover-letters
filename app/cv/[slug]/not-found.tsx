import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FileText } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import { SITE } from '@/lib/site';

/** CV online que no existe, está despublicado o cuyo dueño ya no es Pro. */
export default async function PublicResumeNotFound() {
    const t = await getTranslations('public_cv');
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            <header className="page-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
                    <FileText size={18} /> {SITE.name}
                </Link>
            </header>
            <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
                <section className="card" style={{ maxWidth: '460px', textAlign: 'center', padding: '28px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{t('unavailable_title')}</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.5 }}>{t('unavailable_text')}</p>
                    <Link href="/register?utm_source=cv_online&utm_medium=unavailable" className="btn btn-primary">{t('cta_button')}</Link>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
