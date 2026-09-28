'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock, Sparkles, Undo2 } from 'lucide-react';
import type { ResumeData, ResumeLanguage } from '@/lib/resume';
import type { ImproveField } from '@/lib/resumeAssist';
import { AssistError, improveResumeField } from './assistApi';

interface Props {
    field: ImproveField;
    itemId?: string | null;
    data: ResumeData;
    language: ResumeLanguage;
    plan: 'free' | 'pro';
    /** Texto actual del campo (para poder deshacer). */
    current: string;
    onApply: (text: string) => void;
}

/** Botón "Mejorar con IA" de un campo del CV (Pro), con opción de deshacer. En el plan gratis enlaza a los planes. */
export default function ImproveButton({ field, itemId = null, data, language, plan, current, onApply }: Props) {
    const t = useTranslations('resume');
    const tc = useTranslations();
    const [busy, setBusy] = useState(false);
    const [previous, setPrevious] = useState<string | null>(null);
    const [error, setError] = useState('');

    if (plan !== 'pro') {
        return (
            <Link href="/pricing" className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }} title={t('assist_locked_short')}>
                <Lock size={13} /> {t('assist_improve')} <span className="badge badge-purple">Pro</span>
            </Link>
        );
    }

    async function improve() {
        setBusy(true);
        setError('');
        try {
            const text = await improveResumeField(data, language, field, itemId);
            setPrevious(current);
            onApply(text);
        } catch (err) {
            const e = err instanceof AssistError ? err : new AssistError(false, 'error');
            setError(e.known ? t(`assist_error_${e.code}`) : `${t('assist_error')} (${tc('common.error_code', { code: e.code })})`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={improve} disabled={busy}>
                {busy ? <div className="spinner" /> : <Sparkles size={13} />} {busy ? t('assist_improving') : t('assist_improve')}
            </button>
            {previous !== null && !busy && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onApply(previous); setPrevious(null); }}>
                    <Undo2 size={13} /> {t('assist_undo')}
                </button>
            )}
            {error && <span style={{ fontSize: '12px', color: 'var(--error, #ef4444)' }} role="alert">{error}</span>}
        </div>
    );
}
