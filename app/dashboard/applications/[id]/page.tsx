'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, FileText, MessageSquare, Save, Sparkles, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { STATUS_COLORS, type Application } from '@/lib/applications';
import ApplicationForm, { draftToRow, type ApplicationDraft } from '@/components/applications/ApplicationForm';
import { aiErrorCode } from '@/lib/aiErrorCode';

export default function ApplicationDetailPage() {
    const t = useTranslations('applications');
    const ti = useTranslations('interview');
    const tc = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const { id } = useParams() as { id: string };
    const supabase = createClient();

    const [app, setApp] = useState<Application | null>(null);
    const [draft, setDraft] = useState<ApplicationDraft | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [plan, setPlan] = useState<'free' | 'pro'>('free');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [error, setError] = useState('');
    const [open, setOpen] = useState<number | null>(0);

    useEffect(() => {
        (async () => {
            const { data, error: err } = await supabase.from('applications').select('*').eq('id', id).maybeSingle();
            if (err || !data) { setNotFound(true); return; }
            setApp(data as Application);
            setDraft(data as Application);
            const usage = await fetch('/api/usage').then((r) => (r.ok ? r.json() : null)).catch(() => null);
            if (usage?.plan === 'pro') setPlan('pro');
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function save(): Promise<boolean> {
        if (!draft || !draft.company.trim()) return false;
        setSaving(true);
        setError('');
        const { error: err } = await supabase.from('applications').update(draftToRow(draft)).eq('id', id);
        setSaving(false);
        if (err) { setError(tc('common.error')); return false; }
        setApp((a) => (a ? { ...a, ...draftToRow(draft) } : a));
        setDirty(false);
        return true;
    }

    async function remove() {
        if (!confirm(t('delete_confirm'))) return;
        const { error: err } = await supabase.from('applications').delete().eq('id', id);
        if (err) setError(tc('common.error'));
        else router.push('/dashboard/applications');
    }

    async function prepare() {
        if (dirty && !(await save())) return;
        setPreparing(true);
        setError('');
        try {
            const res = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ application_id: id, locale }),
                signal: AbortSignal.timeout(70000),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                const code = body.error as string;
                if (['no_job_description', 'quota_exceeded', 'pro_required', 'ai_not_configured'].includes(code)) setError(ti(`error_${code}`));
                else setError(`${ti('error')} (${tc('common.error_code', { code: aiErrorCode(res.status, body) || code || `http_${res.status}` })})`);
                return;
            }
            setApp((a) => (a ? { ...a, interview_prep: body.prep } : a));
            setOpen(0);
        } catch {
            setError(ti('error'));
        } finally {
            setPreparing(false);
        }
    }

    const back = (
        <button className="btn btn-ghost btn-sm" onClick={() => {
            if (dirty && !confirm(tc('resume.leave_confirm'))) return;
            router.push('/dashboard/applications');
        }} id="btn-app-back">
            <ArrowLeft size={16} /> {t('back_board')}
        </button>
    );

    if (notFound) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ marginBottom: '16px' }}>{t('not_found')}</p>{back}</div>
        </div>
    );
    if (!app || !draft) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
    );

    const prep = app.interview_prep;
    const hasDescription = (draft.job_description ?? '').trim().length >= 30;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <header className="page-header">
                {back}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-danger btn-sm" onClick={remove} id="btn-app-delete" aria-label={t('delete')}><Trash2 size={14} /></button>
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !dirty || !draft.company.trim()} id="btn-app-save">
                        {saving ? <div className="spinner" /> : <Save size={15} />} {t('save')}
                    </button>
                </div>
            </header>

            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{app.company}</h1>
                    <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[app.status] }} />
                        {t(`status_${app.status}`)}{app.position ? ` · ${app.position}` : ''}
                    </p>
                </div>

                {error && <div className="error-msg">{error}</div>}

                {(app.cover_letter_id || app.resume_id || app.url) && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {app.cover_letter_id && <Link href={`/editor/${app.cover_letter_id}`} className="btn btn-secondary btn-sm"><FileText size={14} /> {t('open_letter')}</Link>}
                        {app.resume_id && <Link href={`/dashboard/cv/tailored/${app.resume_id}`} className="btn btn-secondary btn-sm"><Sparkles size={14} /> {t('open_cv')}</Link>}
                        {app.url && /^https?:\/\//i.test(app.url) && (
                            <a href={app.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={14} /> {t('open_offer')}</a>
                        )}
                    </div>
                )}

                <section className="card">
                    <ApplicationForm value={draft} onChange={(d) => { setDraft(d); setDirty(true); }} />
                </section>

                <section className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: prep ? '16px' : 0 }}>
                        <div>
                            <h2 style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MessageSquare size={17} /> {ti('title')} <span className="badge badge-purple">Pro</span>
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                                {plan === 'pro' ? (hasDescription ? ti('desc') : ti('needs_description')) : <>{ti('free')} <Link href="/pricing" style={{ color: 'var(--accent-light)' }}>{tc('billing.see_plans')}</Link></>}
                            </p>
                        </div>
                        {plan === 'pro' && (
                            <button className="btn btn-primary btn-sm" onClick={prepare} disabled={preparing || !hasDescription} id="btn-prepare">
                                {preparing ? <div className="spinner" /> : <Sparkles size={14} />} {prep ? ti('regenerate') : ti('button')}
                            </button>
                        )}
                    </div>
                    {preparing && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px' }} role="status">{ti('working')}</p>}

                    {prep && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {prep.key_points.length > 0 && (
                                <div>
                                    <div className="input-label">{ti('key_points')}</div>
                                    <ul style={{ paddingLeft: '18px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                        {prep.key_points.map((k, i) => <li key={i}>{k}</li>)}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <div className="input-label">{ti('questions')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {prep.questions.map((q, i) => (
                                        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                            <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                                                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                <span className="badge badge-cyan" style={{ flexShrink: 0 }}>{ti(`cat_${q.category}`)}</span>
                                                <span style={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.5 }}>{q.question}</span>
                                            </button>
                                            {open === i && (
                                                <div style={{ padding: '0 14px 14px', fontSize: '13px', lineHeight: 1.6 }}>
                                                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}><strong>{ti('why')}:</strong> {q.why}</p>
                                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}><strong>{ti('tips')}:</strong> {q.tips}</p>
                                                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                                                        <div className="input-label" style={{ fontSize: '11px' }}>{ti('sample_answer')}</div>
                                                        <p style={{ whiteSpace: 'pre-wrap' }}>{q.sample_answer}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {prep.questions_to_ask.length > 0 && (
                                <div>
                                    <div className="input-label">{ti('questions_to_ask')}</div>
                                    <ul style={{ paddingLeft: '18px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                        {prep.questions_to_ask.map((k, i) => <li key={i}>{k}</li>)}
                                    </ul>
                                </div>
                            )}
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ti('disclaimer')}</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
