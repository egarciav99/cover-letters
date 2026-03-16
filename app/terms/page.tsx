import { useTranslations } from 'next-intl';
import Link from 'next/link';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { ArrowLeft, Home } from 'lucide-react';

export default function TermsPage() {
    const t = useTranslations('terms');

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <header className="page-header">
                <Link href="/" className="logo" style={{ textDecoration: 'none' }}>CoverCraft</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LanguageSwitcher />
                    <Link href="/" className="btn btn-ghost btn-sm">
                        <Home size={15} /> {t('back_to_home')}
                    </Link>
                </div>
            </header>

            <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 32px' }}>
                <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '32px', fontSize: '14px' }}>
                    <ArrowLeft size={16} /> {t('back_to_register')}
                </Link>

                <div className="card" style={{ padding: '40px 48px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>{t('title')}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>{t('last_updated')}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <section>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>{t('intro_title')}</h2>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{t('intro_text')}</p>
                        </section>

                        <section>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>{t('data_title')}</h2>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{t('data_text')}</p>
                        </section>

                        <section>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>{t('account_title')}</h2>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{t('account_text')}</p>
                        </section>

                        <section>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>{t('changes_title')}</h2>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{t('changes_text')}</p>
                        </section>
                    </div>
                </div>
            </div>
            
            <footer style={{
                marginTop: '40px',
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
