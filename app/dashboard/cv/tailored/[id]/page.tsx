'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Check, Download, FileText, Loader2, Save, Sparkles, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DesignPanel from '@/components/editor/DesignPanel';
import { type LetterStyle } from '@/lib/letterTemplates';
import { bulletLines, type ResumeData, type ResumeLanguage, type ResumeStyle } from '@/lib/resume';
import FitOnePage from '@/components/resume/FitOnePage';
import { applyChanges, type JobInfo, type MatchResult, type TailorChanges } from '@/lib/resumeTailor';
import { downloadPagesPdf } from '@/lib/pdfExport';
import { buildResumeHtml, resumeFileName, useResumeHtml } from '@/components/resume/useResumeHtml';
import ScoreBadge from '@/components/resume/ScoreBadge';

interface Tailored {
    id: string;
    title: string;
    language: ResumeLanguage;
    data: ResumeData;
    style: ResumeStyle;
    status: 'pending' | 'done' | 'error';
    error_code: string | null;
    job: JobInfo | null;
    changes: TailorChanges | null;
    match: { before: MatchResult | null; after: MatchResult | null } | null;
    cover_letter_id: string | null;
}

export default function TailoredResumePage() {
    const t = useTranslations('tailor');
    const tr = useTranslations('resume');
    const tc = useTranslations();
    const router = useRouter();
    const { id } = useParams() as { id: string };
    const supabase = createClient();

    const [resume, setResume] = useState<Tailored | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [accepted, setAccepted] = useState<string[]>([]);
    const [style, setStyle] = useState<ResumeStyle | null>(null);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [plan, setPlan] = useState<'free' | 'pro'>('pro');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const res = await fetch(`/api/resume/tailored/${id}`, { signal: AbortSignal.timeout(15000) });
        if (res.status === 404) { setNotFound(true); return null; }
        if (!res.ok) { setError(res.status === 503 ? tr('migration_missing') : tc('common.error')); return null; }
        const { resume: r } = (await res.json()) as { resume: Tailored };
        setResume(r);
        if (r.status === 'done') {
            setAccepted(r.changes?.accepted ?? []);
            setStyle((s) => s ?? r.style);
        }
        return r;
    }, [id, tr, tc]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let stopped = false;
        async function poll() {
            const r = await load().catch(() => null);
            if (!stopped && r?.status === 'pending') timer = setTimeout(poll, 2500);
        }
        poll();
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
            setAvatarUrl(prof?.avatar_url || '');
            const usage = await fetch('/api/usage').then((r) => (r.ok ? r.json() : null)).catch(() => null);
            if (usage) setPlan(usage.plan === 'pro' ? 'pro' : 'free');
        })();
        return () => { stopped = true; if (timer) clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    const data = useMemo(() => {
        if (!resume) return null;
        return resume.changes ? applyChanges({ ...resume.changes, accepted }) : resume.data;
    }, [resume, accepted]);

    const options = useMemo(() => ({
        language: resume?.language ?? 'en',
        avatarUrl,
        footer: plan === 'free' ? tr('footer_free') : undefined,
    }), [resume?.language, avatarUrl, plan, tr]);

    const ready = resume?.status === 'done' && !!data && !!style;
    const { html, pageCount, density, fits } = useResumeHtml(data ?? resume?.data ?? ({} as ResumeData), style ?? ({} as ResumeStyle), options, ready, style?.fitOnePage ?? true);

    function toggle(key: string) {
        setAccepted((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]));
        setDirty(true);
    }

    async function save(): Promise<boolean> {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/resume/tailored/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accepted, style }),
            });
            if (!res.ok) throw new Error();
            setDirty(false);
            return true;
        } catch {
            setError(tr('error_save'));
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function handleDownload() {
        if (!data || !style) return;
        setDownloading(true);
        try {
            await downloadPagesPdf(await buildResumeHtml(data, style, options, style.fitOnePage), style.font, resumeFileName(data.personal.fullName, `-${(resume?.job?.company || 'oferta').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`));
        } catch {
            setError(tc('common.error'));
        } finally {
            setDownloading(false);
        }
    }

    async function handleAts() {
        if (dirty && !(await save())) return;
        const link = document.createElement('a');
        link.href = `/api/resume/ats?id=${id}`;
        link.download = '';
        link.click();
    }

    async function handleDelete() {
        if (!confirm(t('delete_confirm'))) return;
        const res = await fetch(`/api/resume/tailored/${id}`, { method: 'DELETE' }).catch(() => null);
        if (res?.ok) router.push('/dashboard/cv');
        else setError(tc('common.error'));
    }

    const back = (
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard/cv')} id="btn-tailored-back">
            <ArrowLeft size={16} /> {t('back')}
        </button>
    );

    if (notFound) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="card" style={{ textAlign: 'center', maxWidth: '420px' }}>
                <p style={{ marginBottom: '16px' }}>{t('not_found')}</p>{back}
            </div>
        </div>
    );

    if (!resume) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            {error ? <><div className="error-msg">{error}</div>{back}</> : <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />}
        </div>
    );

    if (resume.status === 'pending') return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="fade-in" style={{ textAlign: 'center', maxWidth: '440px' }}>
                <Loader2 size={40} style={{ color: 'var(--accent-light)', animation: 'spin 1.2s linear infinite', margin: '0 auto 20px' }} />
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>{t('pending_title')}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>{t('pending_desc')}</p>
                {back}
            </div>
        </div>
    );

    if (resume.status === 'error') return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="card fade-in" style={{ maxWidth: '460px', textAlign: 'center', padding: '36px 28px' }}>
                <AlertCircle size={36} style={{ color: 'var(--error)', margin: '0 auto 14px' }} />
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{t('error_title')}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{t('error_desc')}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {back}
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /> {tr('remove')}</button>
                </div>
            </div>
        </div>
    );

    const changes = resume.changes;
    const base = changes?.base;
    const before = resume.match?.before;
    const after = resume.match?.after;

    const describe = (key: string): { label: string; from: string[]; to: string[] } => {
        if (!changes || !base) return { label: key, from: [], to: [] };
        if (key === 'headline') return { label: tr('headline'), from: [base.personal.headline], to: [changes.proposal.headline] };
        if (key === 'summary') return { label: tr('section_summary'), from: [base.summary], to: [changes.proposal.summary] };
        if (key === 'skills') return { label: tr('section_skills'), from: [base.skills.join(', ')], to: [changes.proposal.skills.join(', ')] };
        const exp = base.experience.find((e) => `exp:${e.id}` === key);
        return {
            label: exp ? [exp.role, exp.company].filter(Boolean).join(' · ') : key,
            from: bulletLines(exp?.bullets || ''),
            to: bulletLines(changes.proposal.experience[key.slice(4)] || ''),
        };
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{back}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleAts} title={tr('ats_hint')} id="btn-tailored-ats">
                        <FileText size={15} /> {tr('download_ats')}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleDownload} disabled={downloading || !ready} id="btn-tailored-download">
                        {downloading ? <div className="spinner" /> : <Download size={15} />} {tr('download_pdf')}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !dirty} id="btn-tailored-save">
                        {saving ? <div className="spinner" /> : <Save size={15} />} {tr('save')}
                    </button>
                </div>
            </header>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={20} style={{ color: 'var(--accent-light)' }} /> {t('title')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{resume.title}</p>

                {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}

                {(before || after) && (
                    <section className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {before && <ScoreBadge score={before.score} label={t('score_before')} />}
                            {after && <ScoreBadge score={after.score} label={t('score_after')} />}
                            <p style={{ flex: 1, minWidth: '220px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t('score_note')}</p>
                        </div>
                        {after && after.missing.length > 0 && (
                            <div style={{ marginTop: '18px' }}>
                                <div className="input-label">{t('still_missing')}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {after.missing.map((k) => <span key={k} className="badge badge-cyan">{k}</span>)}
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('still_missing_hint')}</p>
                            </div>
                        )}
                    </section>
                )}

                <section className="card" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{t('changes_title')}</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        {changes?.keys.length ? t('changes_desc') : t('no_changes')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {changes?.keys.map((key) => {
                            const d = describe(key);
                            const on = accepted.includes(key);
                            const reason = changes.proposal.reasons[key];
                            return (
                                <div key={key} style={{ border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: reason ? '4px' : '10px' }}>
                                        <input type="checkbox" checked={on} onChange={() => toggle(key)} />
                                        <strong style={{ fontSize: '14px' }}>{d.label}</strong>
                                        {on && <Check size={14} style={{ color: 'var(--accent-light)' }} />}
                                    </label>
                                    {reason && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px 26px' }}>{reason}</p>}
                                    <div className="diff-grid">
                                        <div>
                                            <div className="input-label" style={{ fontSize: '11px' }}>{t('original')}</div>
                                            {d.from.filter(Boolean).length
                                                ? d.from.map((l, i) => <p key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px', lineHeight: 1.5 }}>{d.from.length > 1 ? '• ' : ''}{l}</p>)
                                                : <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>-</p>}
                                        </div>
                                        <div>
                                            <div className="input-label" style={{ fontSize: '11px' }}>{t('adapted')}</div>
                                            {d.to.map((l, i) => <p key={i} style={{ fontSize: '13px', marginBottom: '4px', lineHeight: 1.5 }}>{d.to.length > 1 ? '• ' : ''}{l}</p>)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {ready && (
                    <DesignPanel
                        value={style!}
                        onChange={(s) => { setStyle((prev) => ({ ...prev!, ...s })); setDirty(true); }}
                        previewHtml={html}
                        pages={pageCount}
                        title={tr('design_title')}
                        photoHint={tr('photo_hint')}
                    >
                        <FitOnePage checked={style!.fitOnePage} onChange={(fitOnePage) => { setStyle((prev) => ({ ...prev!, fitOnePage })); setDirty(true); }} density={density} fits={fits} pageCount={pageCount} />
                    </DesignPanel>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} id="btn-tailored-delete">
                        <Trash2 size={14} /> {t('delete')}
                    </button>
                    {resume.cover_letter_id && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push(`/editor/${resume.cover_letter_id}`)}>
                            {t('open_letter')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
