'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';

const LANGS = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
];

export default function LanguageSwitcher() {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState(() => {
        if (typeof document !== 'undefined') {
            const cookie = document.cookie.split(';').find(c => c.trim().startsWith('locale='));
            return cookie?.split('=')?.[1]?.trim() || 'en';
        }
        return 'en';
    });

    function switchLang(code: string) {
        document.cookie = `locale=${code};path=/;max-age=31536000`;
        setCurrent(code);
        setOpen(false);
        window.location.reload();
    }

    const currentLang = LANGS.find(l => l.code === current) || LANGS[0];

    return (
        <div style={{ position: 'relative' }}>
            <button
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(!open)}
                style={{ gap: '6px' }}
            >
                <Globe size={15} />
                <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>
            </button>

            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                        zIndex: 99,
                        minWidth: '160px',
                        boxShadow: 'var(--shadow)',
                    }}>
                        {LANGS.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => switchLang(lang.code)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '10px 16px',
                                    background: current === lang.code ? 'rgba(124,58,237,0.12)' : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: current === lang.code ? 'var(--accent-light)' : 'var(--text-primary)',
                                    fontSize: '14px',
                                    textAlign: 'left',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (current !== lang.code)
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseLeave={e => {
                                    if (current !== lang.code)
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                                <span>{lang.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
