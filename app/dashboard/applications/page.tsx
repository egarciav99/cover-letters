'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, FileText, MessageSquare, Plus, Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { APPLICATION_STATUSES, STATUS_COLORS, applicationStats, type Application, type ApplicationStatus } from '@/lib/applications';
import { FREE_APPLICATION_LIMIT } from '@/lib/plans';
import ApplicationForm, { EMPTY_DRAFT, draftToRow, type ApplicationDraft } from '@/components/applications/ApplicationForm';

export default function ApplicationsPage() {
    const t = useTranslations('applications');
    const tc = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();

    const [apps, setApps] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [plan, setPlan] = useState<'free' | 'pro'>('free');
    const [showAdd, setShowAdd] = useState(false);
    const [draft, setDraft] = useState<ApplicationDraft>(EMPTY_DRAFT);
    const [saving, setSaving] = useState(false);

    function errorText(err: { code?: string; message?: string } | null) {
        if (!err) return tc('common.error');
        if (err.message?.includes('application_limit')) return t('limit_reached', { limit: FREE_APPLICATION_LIMIT });
        if (['42P01', 'PGRST205'].includes(err.code ?? '')) return tc('resume.migration_missing');
        return tc('common.error');
    }

    async function load() {
        const { data, error: err } = await supabase.from('applications').select('*').order('updated_at', { ascending: false });
        if (err) setError(errorText(err));
        else setApps((data as Application[]) || []);
    }

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            const usage = await fetch('/api/usage').then((r) => (r.ok ? r.json() : null)).catch(() => null);
            if (usage?.plan === 'pro') setPlan('pro');
            await load().catch(() => setError(tc('common.error')));
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function addApplication(e: React.FormEvent) {
        e.preventDefault();
        if (!draft.company.trim()) return;
        setSaving(true);
        setError('');
        const { data: { user } } = await supabase.auth.getUser();
        const { error: err } = await supabase.from('applications').insert({ ...draftToRow(draft), user_id: user?.id });
        setSaving(false);
        if (err) { setError(errorText(err)); return; }
        setShowAdd(false);
        setDraft(EMPTY_DRAFT);
        await load();
    }

    async function moveTo(app: Application, status: ApplicationStatus) {
        const patch: Partial<Application> = { status };
        // Al marcarla como enviada por primera vez, se apunta la fecha.
        if (status !== 'saved' && !app.applied_at) patch.applied_at = new Date().toISOString().slice(0, 10);
        setApps((list) => list.map((a) => (a.id === app.id ? { ...a, ...patch } : a)));
        const { error: err } = await supabase.from('applications').update(patch).eq('id', app.id);
        if (err) { setError(errorText(err)); await load(); }
    }

    const stats = applicationStats(apps);
    const fmtDate = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <header className="page-header">
                <button className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard')} id="btn-apps-back">
                    <ArrowLeft size={16} /> {t('back')}
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setDraft(EMPTY_DRAFT); setShowAdd(true); }} id="btn-app-add">
                    <Plus size={15} /> {t('add')}
                </button>
            </header>

            <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Briefcase size={22} /> {t('title')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('subtitle')}</p>

                {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}

                <div className="stats-row" style={{ marginBottom: '24px' }}>
                    {[
                        [t('stat_total'), String(stats.total)],
                        [t('stat_sent'), String(stats.sent)],
                        [t('stat_interviews'), String(stats.interviews)],
                        [t('stat_offers'), String(stats.offers)],
                        [t('stat_response'), stats.responseRate === null ? '-' : `${stats.responseRate} %`],
                    ].map(([label, value]) => (
                        <div key={label} className="card" style={{ padding: '14px 18px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
                        </div>
                    ))}
                </div>

                {plan === 'free' && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        {t('free_limit', { used: apps.length, limit: FREE_APPLICATION_LIMIT })}{' '}
                        <Link href="/pricing" style={{ color: 'var(--accent-light)' }}>{tc('billing.see_plans')}</Link>
                    </p>
                )}

                {apps.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                        <Briefcase size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <p style={{ marginBottom: '16px' }}>{t('empty')}</p>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> {t('add')}</button>
                    </div>
                ) : (
                    <div className="board-grid">
                        {APPLICATION_STATUSES.map((status) => {
                            const column = apps.filter((a) => a.status === status);
                            return (
                                <section key={status} className="board-column" aria-labelledby={`col-${status}`}>
                                    <h2 id={`col-${status}`} style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] }} />
                                        {t(`status_${status}`)} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{column.length}</span>
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {column.map((a) => (
                                            <div key={a.id} className="card" style={{ padding: '12px 14px' }}>
                                                <Link href={`/dashboard/applications/${a.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.company}</div>
                                                    {a.position && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.position}</div>}
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                        <span>{fmtDate(a.applied_at || a.created_at)}</span>
                                                        {a.cover_letter_id && <FileText size={12} aria-label={t('has_letter')} />}
                                                        {a.resume_id && <Sparkles size={12} aria-label={t('has_cv')} />}
                                                        {a.interview_prep && <MessageSquare size={12} aria-label={t('has_prep')} />}
                                                    </div>
                                                </Link>
                                                <select className="input" style={{ marginTop: '8px', padding: '4px 8px', fontSize: '12px' }} value={a.status}
                                                    onChange={(e) => moveTo(a, e.target.value as ApplicationStatus)} aria-label={t('status')}>
                                                    {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
                    <form className="card fade-in" onSubmit={addApplication} style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', position: 'relative' }}>
                        <button type="button" onClick={() => setShowAdd(false)} aria-label={tc('cv.cancel')} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>{t('add')}</h3>
                        <ApplicationForm value={draft} onChange={setDraft} />
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={saving || !draft.company.trim()}>
                            {saving ? <div className="spinner" /> : t('save')}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
