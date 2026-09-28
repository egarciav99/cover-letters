'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Lock, Sparkles, Undo2 } from 'lucide-react';
import type { ResumeData, ResumeLanguage } from '@/lib/resume';
import type { AssistReview, AssistSuggestion, ImproveField } from '@/lib/resumeAssist';
import ScoreBadge from './ScoreBadge';
import { AssistError, reviewResume } from './assistApi';

interface Props {
    data: ResumeData;
    language: ResumeLanguage;
    plan: 'free' | 'pro';
    /** Texto actual de un campo, para poder deshacer lo aplicado. */
    getText: (field: ImproveField, itemId: string | null) => string;
    onApply: (field: ImproveField, itemId: string | null, text: string) => void;
}

const SECTION_KEYS: Record<AssistSuggestion['section'], string> = {
    personal: 'section_personal',
    summary: 'section_summary',
    experience: 'section_experience',
    education: 'section_education',
    skills: 'section_skills',
    languages: 'section_languages',
    certifications: 'section_certifications',
    general: 'assist_general',
};

/** Asistente de IA del CV (Pro): revisa el CV, explica qué mejorar y permite aplicar las reescrituras. */
export default function ResumeAssistant({ data, language, plan, getText, onApply }: Props) {
    const t = useTranslations('resume');
    const tc = useTranslations();
    const locale = useLocale();
    const [busy, setBusy] = useState(false);
    const [review, setReview] = useState<AssistReview | null>(null);
    const [error, setError] = useState('');
    /** Texto anterior de cada sugerencia aplicada, por índice (para deshacer). */
    const [applied, setApplied] = useState<Record<number, string>>({});

    const title = (
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={17} /> {t('assist_title')} <span className="badge badge-purple">Pro</span>
        </h2>
    );

    if (plan !== 'pro') {
        return (
            <section className="card" style={{ borderColor: 'rgba(139, 92, 246, 0.35)' }}>
                {title}
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>{t('assist_locked')}</p>
                <Link href="/pricing" className="btn btn-secondary btn-sm"><Lock size={14} /> {t('assist_see_plans')}</Link>
            </section>
        );
    }

    async function runReview() {
        setBusy(true);
        setError('');
        try {
            setReview(await reviewResume(data, language, locale));
            setApplied({});
        } catch (err) {
            const e = err instanceof AssistError ? err : new AssistError(false, 'error');
            setError(e.known ? t(`assist_error_${e.code}`) : `${t('assist_error')} (${tc('common.error_code', { code: e.code })})`);
        } finally {
            setBusy(false);
        }
    }

    function apply(index: number, s: AssistSuggestion) {
        if (s.target === 'none') return;
        setApplied((a) => ({ ...a, [index]: getText(s.target as ImproveField, s.itemId) }));
        onApply(s.target, s.itemId, s.proposed);
    }

    function undo(index: number, s: AssistSuggestion) {
        if (s.target === 'none' || applied[index] === undefined) return;
        onApply(s.target, s.itemId, applied[index]);
        setApplied((a) => { const next = { ...a }; delete next[index]; return next; });
    }

    const sectionLabel = (s: AssistSuggestion) => {
        const base = t(SECTION_KEYS[s.section]);
        const exp = s.itemId ? data.experience.find((e) => e.id === s.itemId) : null;
        return exp ? `${base} · ${[exp.role, exp.company].filter(Boolean).join(', ')}` : base;
    };

    return (
        <section className="card" style={{ borderColor: 'rgba(139, 92, 246, 0.35)' }}>
            {title}
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>{t('assist_desc')}</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={runReview} disabled={busy} id="btn-assist-review">
                {busy ? <div className="spinner" /> : <Sparkles size={14} />} {busy ? t('assist_reviewing') : review ? t('assist_review_again') : t('assist_review')}
            </button>
            {error && <div className="error-msg" style={{ marginTop: '12px' }}>{error}</div>}

            {review && !busy && (
                <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <ScoreBadge score={review.score} label={t('assist_score')} size={64} />
                    {review.suggestions.length === 0 && <p style={{ fontSize: '14px', color: 'var(--success)' }}>{t('assist_none')}</p>}
                    {review.suggestions.map((s, i) => (
                        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-light)', marginBottom: '4px' }}>{sectionLabel(s)}</p>
                            <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{s.message}</p>
                            {s.target !== 'none' && (
                                <>
                                    <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', background: 'var(--bg-secondary, rgba(255,255,255,0.04))', borderRadius: '8px', padding: '10px 12px', marginTop: '10px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.proposed}</p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                                        {applied[i] === undefined ? (
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => apply(i, s)}>{t('assist_apply')}</button>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13} /> {t('assist_applied')}</span>
                                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => undo(i, s)}><Undo2 size={13} /> {t('assist_undo')}</button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('assist_note')}</p>
                </div>
            )}
        </section>
    );
}
