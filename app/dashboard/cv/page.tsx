'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowDown, ArrowUp, CheckCircle2, Download, FileText, Plus, Save, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DesignPanel from '@/components/editor/DesignPanel';
import { DEFAULT_STYLE, loadStyle, type LetterStyle } from '@/lib/letterTemplates';
import {
    EMPTY_RESUME, RESUME_LANGUAGES, isResumeLanguage, isResumeUsable, newId,
    type ResumeData, type ResumeLanguage,
} from '@/lib/resume';
import { paginateMeasured, renderResumeHtml, renderResumeMeasureHtml } from '@/lib/resumeTemplates';
import { downloadPagesPdf, ensureFonts, mountOffscreen, waitForImages } from '@/lib/pdfExport';

type ListKey = 'experience' | 'education' | 'languages' | 'certifications';

export default function ResumeBuilderPage() {
    const t = useTranslations('resume');
    const tc = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ResumeData>(EMPTY_RESUME);
    const [skillsText, setSkillsText] = useState('');
    const [language, setLanguage] = useState<ResumeLanguage>(isResumeLanguage(locale) ? locale : 'en');
    const [title, setTitle] = useState('');
    const [style, setStyle] = useState<LetterStyle>(DEFAULT_STYLE);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [plan, setPlan] = useState<'free' | 'pro'>('free');
    const [exists, setExists] = useState(false);
    const [linkedCv, setLinkedCv] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [pages, setPages] = useState<number[][]>([]);

    useEffect(() => {
        async function load() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { router.push('/login'); return; }
                const [profileRes, resumeRes, usageRes] = await Promise.all([
                    supabase.from('profiles').select('full_name, phone, linkedin, avatar_url').eq('id', user.id).single(),
                    fetch('/api/resume', { signal: AbortSignal.timeout(10000) }),
                    fetch('/api/usage', { signal: AbortSignal.timeout(10000) }).catch(() => null),
                ]);
                const prof = profileRes.data;
                setAvatarUrl(prof?.avatar_url || '');
                if (usageRes?.ok) setPlan((await usageRes.json()).plan === 'pro' ? 'pro' : 'free');

                const body = await resumeRes.json().catch(() => ({}));
                if (resumeRes.status === 503) setError(t('migration_missing'));
                else if (!resumeRes.ok) setError(tc('common.error'));

                if (body.resume) {
                    setData(body.resume.data);
                    setSkillsText(body.resume.data.skills.join(', '));
                    setLanguage(body.resume.language);
                    setTitle(body.resume.title || '');
                    setStyle(body.resume.style);
                    setExists(true);
                    setLinkedCv(!!body.cv_id);
                    setSavedAt(body.resume.updated_at);
                } else {
                    // CV nuevo: se rellena con los datos del perfil y el diseño de las cartas.
                    setStyle(loadStyle());
                    setData({
                        ...EMPTY_RESUME,
                        personal: {
                            ...EMPTY_RESUME.personal,
                            fullName: prof?.full_name || '',
                            email: user.email || '',
                            phone: prof?.phone || '',
                            linkedin: prof?.linkedin || '',
                        },
                    });
                }
            } catch (err) {
                console.error('Load resume error:', err);
                setError(tc('common.error'));
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Avisa antes de cerrar la pestaña con cambios sin guardar.
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    const options = useMemo(() => ({
        language,
        avatarUrl,
        footer: plan === 'free' ? t('footer_free') : undefined,
    }), [language, avatarUrl, plan, t]);

    // Reparte el contenido en páginas A4 midiendo cada bloque con las fuentes ya cargadas.
    useEffect(() => {
        if (loading) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            await ensureFonts(style.font);
            if (cancelled) return;
            const tmp = mountOffscreen(renderResumeMeasureHtml(data, style, options));
            try {
                await waitForImages(tmp);
                if (!cancelled) setPages(paginateMeasured(tmp));
            } finally {
                document.body.removeChild(tmp);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [loading, data, style, options]);

    const html = useMemo(
        () => renderResumeHtml(data, style, options, pages),
        [data, style, options, pages],
    );

    function update(patch: Partial<ResumeData>) {
        setData((d) => ({ ...d, ...patch }));
        setDirty(true);
    }

    function setPersonal(key: keyof ResumeData['personal'], value: string) {
        setData((d) => ({ ...d, personal: { ...d.personal, [key]: value } }));
        setDirty(true);
    }

    function setItem<K extends ListKey>(key: K, id: string, patch: Partial<ResumeData[K][number]>) {
        setData((d) => ({ ...d, [key]: (d[key] as ResumeData[K]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        setDirty(true);
    }

    function addItem(key: ListKey) {
        const blank = {
            experience: { id: newId(), role: '', company: '', location: '', start: '', end: '', current: false, bullets: '' },
            education: { id: newId(), degree: '', school: '', location: '', start: '', end: '', details: '' },
            languages: { id: newId(), name: '', level: '' },
            certifications: { id: newId(), name: '', issuer: '', year: '' },
        }[key];
        setData((d) => ({ ...d, [key]: [...d[key], blank] }));
        setDirty(true);
    }

    function removeItem(key: ListKey, id: string) {
        setData((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) }));
        setDirty(true);
    }

    function moveItem(key: ListKey, index: number, delta: number) {
        setData((d) => {
            const list = [...(d[key] as { id: string }[])];
            const target = index + delta;
            if (target < 0 || target >= list.length) return d;
            [list[index], list[target]] = [list[target], list[index]];
            return { ...d, [key]: list };
        });
        setDirty(true);
    }

    function updateSkills(text: string) {
        setSkillsText(text);
        update({ skills: text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) });
    }

    function updateStyle(next: LetterStyle) {
        setStyle(next);
        setDirty(true);
    }

    async function save(): Promise<boolean> {
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/resume', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, language, data, style }),
                signal: AbortSignal.timeout(20000),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(res.status === 503 ? t('migration_missing') : t('error_save'));
                return false;
            }
            setExists(true);
            setLinkedCv(!!body.cv_id);
            setSavedAt(body.updated_at);
            setDirty(false);
            return true;
        } catch {
            setError(t('error_save'));
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function handleDownload() {
        setDownloading(true);
        try {
            const name = (data.personal.fullName || 'cv').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
            await downloadPagesPdf(html, style.font, `cv-${name}.pdf`);
        } catch (err) {
            console.error('Resume PDF error:', err);
            setError(tc('common.error'));
        } finally {
            setDownloading(false);
        }
    }

    async function handleDownloadAts() {
        if ((dirty || !exists) && !(await save())) return;
        // Enlace con `download`: no navega, así que no salta el aviso de cambios sin guardar.
        const link = document.createElement('a');
        link.href = '/api/resume/ats';
        link.download = '';
        link.click();
    }

    async function handleDelete() {
        if (!confirm(t('delete_confirm'))) return;
        const res = await fetch('/api/resume', { method: 'DELETE' }).catch(() => null);
        if (res?.ok) {
            setDirty(false);
            router.push('/dashboard');
        } else {
            setError(tc('common.error'));
        }
    }

    function goBack() {
        if (dirty && !confirm(t('leave_confirm'))) return;
        router.push('/dashboard');
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
    );

    const usable = isResumeUsable(data);
    const p = data.personal;

    const field = (label: string, value: string, onChange: (v: string) => void, opts: { placeholder?: string; id?: string; type?: string } = {}) => (
        <div className="form-group">
            <label className="input-label" htmlFor={opts.id}>{label}</label>
            <input className="input" id={opts.id} type={opts.type || 'text'} value={value} placeholder={opts.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
    );

    const itemTools = (key: ListKey, index: number, id: string, total: number) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button type="button" className="btn btn-ghost btn-sm" title={t('move_up')} aria-label={t('move_up')} disabled={index === 0} onClick={() => moveItem(key, index, -1)}><ArrowUp size={14} /></button>
            <button type="button" className="btn btn-ghost btn-sm" title={t('move_down')} aria-label={t('move_down')} disabled={index === total - 1} onClick={() => moveItem(key, index, 1)}><ArrowDown size={14} /></button>
            <button type="button" className="btn btn-danger btn-sm" title={t('remove')} aria-label={t('remove')} onClick={() => removeItem(key, id)}><X size={14} /></button>
        </div>
    );

    const sectionTitle = (text: string) => <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px' }}>{text}</h2>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={goBack} id="btn-resume-back">
                        <ArrowLeft size={16} /> {t('back')}
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }} className="hide-mobile">{t('page_title')}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleDownloadAts} disabled={saving || !usable} title={t('ats_hint')} id="btn-resume-ats">
                        <FileText size={15} /> {t('download_ats')}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleDownload} disabled={downloading || !html} id="btn-resume-download">
                        {downloading ? <div className="spinner" /> : <Download size={15} />} {t('download_pdf')}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || (!dirty && exists)} id="btn-resume-save">
                        {saving ? <div className="spinner" /> : <Save size={15} />} {saving ? t('saving') : t('save')}
                    </button>
                </div>
            </header>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <p style={{ fontSize: '13px', color: dirty ? 'var(--warning, #f59e0b)' : 'var(--text-muted)' }} role="status">
                        {dirty ? t('unsaved') : savedAt ? <><CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('saved')}</> : ''}
                    </p>
                    {pages.length > 1 && <span className="badge badge-cyan">{t('pages', { count: pages.length })}</span>}
                </div>

                {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}

                {exists && !dirty && (
                    <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {linkedCv ? t('linked') : t('not_usable')}
                    </div>
                )}

                <DesignPanel
                    value={style}
                    onChange={updateStyle}
                    previewHtml={html}
                    pages={Math.max(1, pages.length)}
                    title={t('design_title')}
                    photoHint={t('photo_hint')}
                />

                <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <section className="card">
                        {sectionTitle(t('section_settings'))}
                        <div className="form-row">
                            {field(t('cv_title'), title, (v) => { setTitle(v); setDirty(true); }, { placeholder: t('cv_title_placeholder'), id: 'resume-title' })}
                            <div className="form-group">
                                <label className="input-label" htmlFor="resume-language">{t('cv_language')}</label>
                                <select id="resume-language" className="input" value={language} onChange={(e) => { setLanguage(e.target.value as ResumeLanguage); setDirty(true); }}>
                                    {RESUME_LANGUAGES.map((l) => <option key={l} value={l}>{tc(`cv.language_${l}`)}</option>)}
                                </select>
                            </div>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px' }}>{t('language_hint')}</p>
                    </section>

                    <section className="card">
                        {sectionTitle(t('section_personal'))}
                        <div className="form-row">
                            {field(t('full_name'), p.fullName, (v) => setPersonal('fullName', v), { id: 'resume-name' })}
                            {field(t('headline'), p.headline, (v) => setPersonal('headline', v), { placeholder: t('headline_placeholder'), id: 'resume-headline' })}
                        </div>
                        <div className="form-row">
                            {field(t('email'), p.email, (v) => setPersonal('email', v), { type: 'email' })}
                            {field(t('phone'), p.phone, (v) => setPersonal('phone', v))}
                        </div>
                        <div className="form-row">
                            {field(t('location'), p.location, (v) => setPersonal('location', v), { placeholder: t('location_placeholder') })}
                            {field(t('linkedin'), p.linkedin, (v) => setPersonal('linkedin', v), { placeholder: 'linkedin.com/in/…' })}
                        </div>
                        {field(t('website'), p.website, (v) => setPersonal('website', v), { placeholder: 'https://…' })}
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('photo_from_profile')}</p>
                    </section>

                    <section className="card">
                        {sectionTitle(t('section_summary'))}
                        <textarea className="input" value={data.summary} onChange={(e) => update({ summary: e.target.value })} placeholder={t('summary_placeholder')} style={{ minHeight: '110px' }} aria-label={t('section_summary')} />
                    </section>

                    <section className="card">
                        {sectionTitle(t('section_experience'))}
                        {data.experience.map((x, i) => (
                            <div key={x.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                                {itemTools('experience', i, x.id, data.experience.length)}
                                <div className="form-row">
                                    {field(t('role'), x.role, (v) => setItem('experience', x.id, { role: v }))}
                                    {field(t('company'), x.company, (v) => setItem('experience', x.id, { company: v }))}
                                </div>
                                <div className="form-row">
                                    {field(t('start'), x.start, (v) => setItem('experience', x.id, { start: v }), { placeholder: t('date_placeholder') })}
                                    {x.current
                                        ? <div className="form-group" />
                                        : field(t('end'), x.end, (v) => setItem('experience', x.id, { end: v }), { placeholder: t('date_placeholder') })}
                                </div>
                                <div className="form-row">
                                    {field(t('item_location'), x.location, (v) => setItem('experience', x.id, { location: v }))}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', paddingTop: '12px' }}>
                                        <input type="checkbox" checked={x.current} onChange={(e) => setItem('experience', x.id, { current: e.target.checked })} />
                                        {t('current')}
                                    </label>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="input-label">{t('bullets')}</label>
                                    <textarea className="input" value={x.bullets} onChange={(e) => setItem('experience', x.id, { bullets: e.target.value })} placeholder={t('bullets_placeholder')} style={{ minHeight: '110px' }} />
                                </div>
                            </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem('experience')} id="btn-add-experience">
                            <Plus size={14} /> {t('add_experience')}
                        </button>
                    </section>

                    <section className="card">
                        {sectionTitle(t('section_education'))}
                        {data.education.map((x, i) => (
                            <div key={x.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                                {itemTools('education', i, x.id, data.education.length)}
                                <div className="form-row">
                                    {field(t('degree'), x.degree, (v) => setItem('education', x.id, { degree: v }))}
                                    {field(t('school'), x.school, (v) => setItem('education', x.id, { school: v }))}
                                </div>
                                <div className="form-row">
                                    {field(t('start'), x.start, (v) => setItem('education', x.id, { start: v }), { placeholder: t('date_placeholder') })}
                                    {field(t('end'), x.end, (v) => setItem('education', x.id, { end: v }), { placeholder: t('date_placeholder') })}
                                </div>
                                {field(t('item_location'), x.location, (v) => setItem('education', x.id, { location: v }))}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="input-label">{t('details')}</label>
                                    <textarea className="input" value={x.details} onChange={(e) => setItem('education', x.id, { details: e.target.value })} style={{ minHeight: '70px' }} />
                                </div>
                            </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem('education')} id="btn-add-education">
                            <Plus size={14} /> {t('add_education')}
                        </button>
                    </section>

                    <section className="card">
                        {sectionTitle(t('section_skills'))}
                        <textarea className="input" value={skillsText} onChange={(e) => updateSkills(e.target.value)} placeholder={t('skills_placeholder')} style={{ minHeight: '80px' }} aria-label={t('section_skills')} />
                    </section>

                    <section className="card">
                        {sectionTitle(t('section_languages'))}
                        {data.languages.map((x) => (
                            <div key={x.id} className="form-row" style={{ alignItems: 'flex-end' }}>
                                {field(t('language_name'), x.name, (v) => setItem('languages', x.id, { name: v }))}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>{field(t('language_level'), x.level, (v) => setItem('languages', x.id, { level: v }), { placeholder: t('level_placeholder') })}</div>
                                    <button type="button" className="btn btn-danger btn-sm" style={{ marginBottom: '20px' }} aria-label={t('remove')} title={t('remove')} onClick={() => removeItem('languages', x.id)}><X size={14} /></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem('languages')} id="btn-add-language">
                            <Plus size={14} /> {t('add_language')}
                        </button>
                    </section>

                    <section className="card">
                        {sectionTitle(t('section_certifications'))}
                        {data.certifications.map((x, i) => (
                            <div key={x.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                                {itemTools('certifications', i, x.id, data.certifications.length)}
                                <div className="form-row">
                                    {field(t('cert_name'), x.name, (v) => setItem('certifications', x.id, { name: v }))}
                                    {field(t('issuer'), x.issuer, (v) => setItem('certifications', x.id, { issuer: v }))}
                                </div>
                                {field(t('year'), x.year, (v) => setItem('certifications', x.id, { year: v }))}
                            </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem('certifications')} id="btn-add-certification">
                            <Plus size={14} /> {t('add_certification')}
                        </button>
                    </section>

                    {!usable && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('not_usable')}</p>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        {exists ? (
                            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} id="btn-resume-delete">
                                <Trash2 size={14} /> {t('delete')}
                            </button>
                        ) : <span />}
                        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || (!dirty && exists)}>
                            {saving ? <div className="spinner" /> : <Save size={16} />} {saving ? t('saving') : t('save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
