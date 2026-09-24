'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { FileText, Zap, Download, ArrowRight, Upload, ClipboardPaste, FileCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import SiteFooter from '@/components/SiteFooter';
import AdSlot from '@/components/AdSlot';

const FAQ_KEYS = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5'] as const;

export default function LandingPage() {
    const t = useTranslations();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setLoading(false);
        });
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="page-header">
                <span className="logo">CoverCraft</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/pricing" className="btn btn-ghost btn-sm hide-mobile">{t('footer.pricing')}</Link>
                    <LanguageSwitcher />
                    {!loading && (
                        user ? (
                            <Link href="/dashboard" className="btn btn-primary btn-sm">
                                {t('landing.cta_dashboard') || 'Go to Dashboard'} <ArrowRight size={14} />
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="btn btn-ghost btn-sm">{t('landing.cta_login')}</Link>
                                <Link href="/register" className="btn btn-primary btn-sm">{t('landing.cta_register')}</Link>
                            </>
                        )
                    )}
                </div>
            </header>

            {/* Hero */}
            <section style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '100px 32px 80px',
                textAlign: 'center',
            }}>
                <div className="fade-in">
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '20px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        color: 'var(--accent-light)',
                        fontWeight: 600,
                        marginBottom: '32px',
                    }}>
                        <Zap size={14} /> {t('landing.badge')}
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(40px, 6vw, 72px)',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        marginBottom: '24px',
                        background: 'linear-gradient(135deg, #fff 40%, var(--accent-light) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        {t('landing.title')}
                    </h1>

                    <p style={{
                        fontSize: '19px',
                        color: 'var(--text-secondary)',
                        maxWidth: '600px',
                        margin: '0 auto 48px',
                        lineHeight: 1.7,
                    }}>
                        {t('landing.subtitle')}
                    </p>

                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {!loading && (
                            user ? (
                                <Link href="/dashboard" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '16px' }}>
                                    {t('landing.cta_dashboard') || 'Go to Dashboard'} →
                                </Link>
                            ) : (
                                <>
                                    <Link href="/register" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '16px' }}>
                                        {t('landing.cta_register')} →
                                    </Link>
                                    <Link href="/login" className="btn btn-secondary" style={{ padding: '16px 28px', fontSize: '16px' }}>
                                        {t('landing.cta_login')}
                                    </Link>
                                </>
                            )
                        )}
                    </div>
                </div>

                {/* Gradient orb */}
                <div style={{
                    position: 'absolute',
                    top: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(600px, 100%)',
                    height: '400px',
                    background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: -1,
                }} />
            </section>

            {/* Features */}
            <section style={{
                maxWidth: '1000px',
                margin: '0 auto',
                padding: '0 32px 100px',
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                }}>
                    {[
                        {
                            icon: <Zap size={24} style={{ color: 'var(--accent-light)' }} />,
                            title: t('landing.feature1_title'),
                            desc: t('landing.feature1_desc'),
                            color: 'rgba(59, 130, 246, 0.08)',
                            border: 'rgba(59, 130, 246, 0.2)',
                        },
                        {
                            icon: <FileText size={24} style={{ color: 'var(--accent-2)' }} />,
                            title: t('landing.feature2_title'),
                            desc: t('landing.feature2_desc'),
                            color: 'rgba(6, 182, 212, 0.08)',
                            border: 'rgba(6, 182, 212, 0.2)',
                        },
                        {
                            icon: <Download size={24} style={{ color: 'var(--success)' }} />,
                            title: t('landing.feature3_title'),
                            desc: t('landing.feature3_desc'),
                            color: 'rgba(16, 185, 129, 0.08)',
                            border: 'rgba(16, 185, 129, 0.2)',
                        },
                    ].map((f, i) => (
                        <div key={i} className="fade-in" style={{
                            animationDelay: `${i * 0.1}s`,
                            background: f.color,
                            border: `1px solid ${f.border}`,
                            borderRadius: 'var(--radius-lg)',
                            padding: '28px',
                        }}>
                            <div style={{ marginBottom: '16px' }}>{f.icon}</div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{f.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="section" aria-labelledby="how-title">
                <h2 id="how-title" className="section-title">{t('landing.how_title')}</h2>
                <div className="steps-grid">
                    {[
                        { icon: <Upload size={22} />, title: t('landing.how1_title'), desc: t('landing.how1_desc') },
                        { icon: <ClipboardPaste size={22} />, title: t('landing.how2_title'), desc: t('landing.how2_desc') },
                        { icon: <FileCheck size={22} />, title: t('landing.how3_title'), desc: t('landing.how3_desc') },
                    ].map((step) => (
                        <div key={step.title} className="card" style={{ padding: '24px' }}>
                            <div style={{ color: 'var(--accent-light)', marginBottom: '12px' }}>{step.icon}</div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>{step.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing teaser */}
            <section className="section" aria-labelledby="pricing-title">
                <div className="card" style={{ padding: '36px', textAlign: 'center', borderColor: 'var(--accent)' }}>
                    <h2 id="pricing-title" style={{ fontSize: '26px', fontWeight: 800, marginBottom: '10px' }}>{t('landing.pricing_title')}</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 24px', lineHeight: 1.7 }}>{t('landing.pricing_desc')}</p>
                    <Link href="/pricing" className="btn btn-primary" id="landing-pricing-cta">
                        {t('landing.pricing_cta')} <ArrowRight size={16} />
                    </Link>
                </div>
            </section>

            {/* FAQ */}
            <section className="section faq" aria-labelledby="faq-title">
                <h2 id="faq-title" className="section-title">{t('landing.faq_title')}</h2>
                {FAQ_KEYS.map((k) => (
                    <details key={k}>
                        <summary>{t(`landing.${k}_q`)}</summary>
                        <p>{t(`landing.${k}_a`)}</p>
                    </details>
                ))}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'FAQPage',
                            mainEntity: FAQ_KEYS.map((k) => ({
                                '@type': 'Question',
                                name: t(`landing.${k}_q`),
                                acceptedAnswer: { '@type': 'Answer', text: t(`landing.${k}_a`) },
                            })),
                        }),
                    }}
                />
            </section>

            <div className="section" style={{ paddingBottom: '40px' }}>
                <AdSlot slotKey="landing" />
            </div>

            <SiteFooter />
        </div>
    );
}
