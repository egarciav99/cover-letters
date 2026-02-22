'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { FileText, Zap, Download, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

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
                        <Zap size={14} /> Powered by n8n AI Automation
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
                    width: '600px',
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

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid var(--border)',
                padding: '24px 32px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '14px',
            }}>
                CoverCraft © {new Date().getFullYear()}
            </footer>
        </div>
    );
}
