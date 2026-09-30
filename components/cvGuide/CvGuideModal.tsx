'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { BookOpen, X } from 'lucide-react';
import type { CvGuideTip } from '@/lib/cvGuide';
import CvGuideContent from './CvGuideContent';

/** Guía de CV en un panel sobre el editor. `tip` resalta y lleva a una clave concreta. */
export default function CvGuideModal({ tip, onClose }: { tip: CvGuideTip | 'all'; onClose: () => void }) {
    const t = useTranslations('cv_guide');
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        if (tip === 'all') { bodyRef.current?.scrollTo({ top: 0 }); return; }
        bodyRef.current?.querySelector(`#tip-${tip}`)?.scrollIntoView({ block: 'start' });
    }, [tip]);

    return (
        <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'flex-end' }}>
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={t('title')}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 'min(560px, 100vw)', height: '100dvh', background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}
            >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen size={17} /> {t('title')}</h2>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t('close')} title={t('close')}><X size={16} /></button>
                </header>
                <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '14px' }}>{t('intro')}</p>
                    <CvGuideContent highlight={tip === 'all' ? null : tip} />
                    <p style={{ marginTop: '16px', fontSize: '13px' }}>
                        <Link href="/cv-guide" target="_blank" style={{ color: 'var(--accent-light)' }}>{t('full_guide')}</Link>
                    </p>
                </div>
            </aside>
        </div>
    );
}
