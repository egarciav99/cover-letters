'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const t = useTranslations();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
            setError(t('auth.error_invalid'));
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
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>{t('auth.login_title')}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{t('auth.login_subtitle')}</p>
                </div>

                <div className="card" style={{ padding: '32px' }}>
                    <form onSubmit={handleLogin}>
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
                                    autoComplete="current-password"
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

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                            {loading ? <><div className="spinner" /> </> : t('auth.login_button')}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <Link href="/register" style={{ color: 'var(--accent-light)', textDecoration: 'none' }}>{t('auth.login_link')}</Link>
                </p>
                <p className="site-credit" style={{ textAlign: 'center', marginTop: '24px' }}>
                    {t('footer.created_by')}{' '}
                    <a href="https://www.egsolutions.tech/?utm_source=covercraft&utm_medium=footer" target="_blank" rel="noopener">EG Solutions</a>
                </p>
            </div>
        </div>
    );
}
