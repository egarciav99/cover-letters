'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
    const t = useTranslations();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        if (!acceptTerms) return;
        
        setError('');
        setLoading(true);
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) {
            setError(authError.message || t('auth.error_generic'));
        } else {
            router.push('/dashboard');
            router.refresh();
        }
        setLoading(false);
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.08) 0%, var(--bg-primary) 60%)',
        }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <Link href="/" className="logo" style={{ display: 'inline-block', marginBottom: '24px' }}>CoverCraft</Link>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>{t('auth.register_title')}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{t('auth.register_subtitle')}</p>
                </div>

                <div className="card" style={{ padding: '32px' }}>
                    <form onSubmit={handleRegister}>
                        {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}

                        <div className="form-group">
                            <label className="input-label">{t('auth.email')}</label>
                            <input
                                type="email"
                                className="input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label className="input-label">{t('auth.password')}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    className="input"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    style={{
                                        position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                    }}
                                >
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '16px' }}>
                            <input
                                type="checkbox"
                                id="terms"
                                checked={acceptTerms}
                                onChange={e => setAcceptTerms(e.target.checked)}
                                style={{ marginTop: '4px', cursor: 'pointer' }}
                            />
                            <label htmlFor="terms" style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', cursor: 'pointer' }}>
                                {t('auth.terms_agree')} <Link href="/terms" target="_blank" style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>{t('auth.terms_link')}</Link> {t('auth.terms_suffix')}
                            </label>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading || !acceptTerms}>
                            {loading ? <div className="spinner" /> : t('auth.register_button')}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <Link href="/login" style={{ color: 'var(--accent-light)', textDecoration: 'none' }}>{t('auth.register_link')}</Link>
                </p>
            </div>
        </div>
    );
}
