'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, Globe, Lock, Pencil } from 'lucide-react';

interface Settings {
    slug: string | null;
    isPublic: boolean;
    showContact: boolean;
    views: number;
    url: string | null;
}

interface Props {
    plan: 'free' | 'pro';
    /** Hay un CV guardado. */
    saved: boolean;
    /** Hay cambios sin guardar (el CV online muestra la última versión guardada). */
    dirty: boolean;
    fileName: string;
}

const KNOWN_ERRORS = ['slug_taken', 'invalid_slug', 'pro_only', 'not_usable', 'migration_missing'];

/** "Mi CV online" en el editor (Pro): publicar el CV, su enlace, el QR y las visitas. */
export default function OnlineResumePanel({ plan, saved, dirty, fileName }: Props) {
    const t = useTranslations('resume');
    const [settings, setSettings] = useState<Settings | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [slugDraft, setSlugDraft] = useState('');
    const [qr, setQr] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (plan !== 'pro' || !saved) return;
        fetch('/api/resume/public')
            .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (res.ok) setSettings(body);
                else setError(body.error === 'migration_missing' ? t('online_error_migration_missing') : t('online_error'));
            })
            .catch(() => setError(t('online_error')));
    }, [plan, saved, t]);

    const url = settings?.isPublic ? settings.url : null;

    useEffect(() => {
        if (!url) { setQr(''); return; }
        QRCode.toDataURL(url, { width: 512, margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
    }, [url]);

    const title = (
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={17} /> {t('online_title')} <span className="badge badge-purple">Pro</span>
        </h2>
    );

    if (plan !== 'pro') {
        return (
            <section className="card" style={{ borderColor: 'rgba(139, 92, 246, 0.35)' }}>
                {title}
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>{t('online_locked')}</p>
                <Link href="/pricing" className="btn btn-secondary btn-sm"><Lock size={14} /> {t('assist_see_plans')}</Link>
            </section>
        );
    }

    async function change(patch: { is_public?: boolean; show_contact?: boolean; slug?: string }) {
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/resume/public', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
                signal: AbortSignal.timeout(15000),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(KNOWN_ERRORS.includes(body.error) ? t(`online_error_${body.error}`) : t('online_error'));
                return false;
            }
            setSettings(body);
            return true;
        } catch {
            setError(t('online_error'));
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function copy() {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError(t('online_error'));
        }
    }

    async function saveSlug() {
        if (await change({ slug: slugDraft })) setEditing(false);
    }

    return (
        <section className="card" style={{ borderColor: 'rgba(139, 92, 246, 0.35)' }}>
            {title}
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>{t('online_desc')}</p>

            {!saved ? (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('online_save_first')}</p>
            ) : (
                <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="checkbox" checked={!!settings?.isPublic} disabled={busy || !settings} onChange={(e) => change({ is_public: e.target.checked })} id="toggle-online-cv" />
                        {t('online_publish')}
                        {busy && <div className="spinner" />}
                    </label>

                    {url && settings && (
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '16px', alignItems: 'flex-start' }}>
                            <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {editing ? (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/cv/</span>
                                        <input className="input" style={{ flex: '1 1 160px', width: 'auto' }} value={slugDraft} maxLength={50} onChange={(e) => setSlugDraft(e.target.value)} aria-label={t('online_link')} />
                                        <button type="button" className="btn btn-primary btn-sm" onClick={saveSlug} disabled={busy}>{t('save')}</button>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setError(''); }}>{t('online_cancel')}</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input className="input" readOnly value={url} style={{ flex: '1 1 200px', width: 'auto', fontSize: '13px' }} aria-label={t('online_link')} onFocus={(e) => e.target.select()} />
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={copy} id="btn-online-copy">
                                            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('online_copied') : t('online_copy')}
                                        </button>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <a href={url} target="_blank" rel="noopener" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> {t('online_open')}</a>
                                    {!editing && (
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSlugDraft(settings.slug || ''); setEditing(true); }}>
                                            <Pencil size={14} /> {t('online_edit_link')}
                                        </button>
                                    )}
                                </div>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', lineHeight: 1.45 }}>
                                    <input type="checkbox" checked={settings.showContact} disabled={busy} onChange={(e) => change({ show_contact: e.target.checked })} style={{ marginTop: '2px' }} />
                                    <span>{t('online_show_contact')}<br /><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t('online_show_contact_hint')}</span></span>
                                </label>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('online_views', { count: settings.views })}</p>
                                <p style={{ fontSize: '12px', color: dirty ? 'var(--warning, #f59e0b)' : 'var(--text-muted)' }}>{dirty ? t('online_unsaved') : t('online_last_saved')}</p>
                            </div>
                            {qr && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qr} alt={t('online_qr_alt')} width={140} height={140} style={{ background: '#fff', borderRadius: '8px', padding: '6px' }} />
                                    <a href={qr} download={`qr-${fileName}.png`} className="btn btn-ghost btn-sm"><Download size={14} /> {t('online_qr_download')}</a>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
            {error && <div className="error-msg" style={{ marginTop: '12px' }}>{error}</div>}
        </section>
    );
}
