import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Check, Home } from 'lucide-react';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import SiteFooter from '@/components/SiteFooter';
import { BILLING_ENABLED } from '@/lib/plans';
import { SITE } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pricing');
    return { title: t('meta_title'), description: t('subtitle'), alternates: { canonical: '/pricing' } };
}

export default async function PricingPage() {
    const t = await getTranslations('pricing');
    const tl = await getTranslations('legal_ui');

    const free = [t('free_f1'), t('free_f2'), t('free_f3'), t('free_f4')];
    const pro = [t('pro_f1'), t('pro_f2'), t('pro_f3'), t('pro_f4')];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <header className="page-header">
                <Link href="/" className="logo" style={{ textDecoration: 'none' }}>{SITE.name}</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LanguageSwitcher />
                    <Link href="/" className="btn btn-ghost btn-sm"><Home size={15} /> {tl('back_to_home')}</Link>
                </div>
            </header>

            <main style={{ padding: '64px 24px 24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: '12px' }}>{t('title')}</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>{t('subtitle')}</p>
                </div>

                <div className="pricing-grid">
                    <section className="card pricing-card" aria-labelledby="plan-free">
                        <h2 id="plan-free" style={{ fontSize: '22px', fontWeight: 700 }}>{t('free_name')}</h2>
                        <div className="pricing-price">{t('free_price')} <small>{t('per_month')}</small></div>
                        <ul>
                            {free.map((f) => <li key={f}><Check size={18} style={{ color: 'var(--success)', flexShrink: 0 }} /> {f}</li>)}
                        </ul>
                        <Link href="/register" className="btn btn-secondary" style={{ justifyContent: 'center', marginTop: 'auto' }} id="pricing-free-cta">
                            {t('free_cta')}
                        </Link>
                    </section>

                    <section className="card pricing-card" aria-labelledby="plan-pro" style={{ borderColor: 'var(--accent)' }}>
                        <h2 id="plan-pro" style={{ fontSize: '22px', fontWeight: 700 }}>{t('pro_name')}</h2>
                        <div className="pricing-price">{t('pro_price')} <small>{t('per_month')}</small></div>
                        <ul>
                            {pro.map((f) => <li key={f}><Check size={18} style={{ color: 'var(--accent-light)', flexShrink: 0 }} /> {f}</li>)}
                        </ul>
                        {BILLING_ENABLED ? (
                            <Link href="/dashboard?upgrade=1" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 'auto' }} id="pricing-pro-cta">
                                {t('pro_cta')}
                            </Link>
                        ) : (
                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button className="btn btn-primary" disabled style={{ justifyContent: 'center', opacity: 0.6 }} id="pricing-pro-cta">
                                    {t('pro_soon')}
                                </button>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    {t('pro_soon_desc')}{' '}
                                    <a href={`mailto:${SITE.contactEmail}?subject=CoverCraft%20Pro`} style={{ color: 'var(--accent-light)' }}>{SITE.contactEmail}</a>
                                </p>
                            </div>
                        )}
                    </section>
                </div>

                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '24px' }}>
                    {t('fair_use')} {t('vat')}
                </p>
            </main>

            <SiteFooter />
        </div>
    );
}
