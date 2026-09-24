'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Upload, Trash2, Star, FileText, LogOut, Plus, X, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import AdSlot from '@/components/AdSlot';
import SiteFooter from '@/components/SiteFooter';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ProfilePhotoCropper from '@/components/ProfilePhotoCropper';

interface CV {
    id: string;
    label: string;
    language: string;
    file_url: string;
    file_name: string;
    is_default: boolean;
    created_at: string;
}

interface CoverLetterHistory {
    id: string;
    company: string;
    language: string;
    status: string;
    created_at: string;
}

interface Usage {
    plan: 'free' | 'pro';
    used: number;
    limit: number;
    resetsAt: string;
}

interface Profile {
    full_name: string;
    phone: string;
    linkedin: string;
    avatar_url: string;
}

export default function DashboardPage() {
    const t = useTranslations();
    const router = useRouter();
    const supabase = createClient();

    const [user, setUser] = useState<{ id: string; email: string } | null>(null);
    const [profile, setProfile] = useState<Profile>({ full_name: '', phone: '', linkedin: '', avatar_url: '' });
    const [cvs, setCvs] = useState<CV[]>([]);
    const [history, setHistory] = useState<CoverLetterHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [quotaHit, setQuotaHit] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    // Profile modal state
    const [showProfile, setShowProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Upload modal state
    const [showUpload, setShowUpload] = useState(false);
    const [uploadLabel, setUploadLabel] = useState('');
    const [uploadLang, setUploadLang] = useState('en');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate form state
    const [company, setCompany] = useState('');
    const [position, setPosition] = useState('');
    const [requirements, setRequirements] = useState('');
    const [selectedCvId, setSelectedCvId] = useState('');
    const [outputLang, setOutputLang] = useState('en');

    useEffect(() => {
        async function load() {
            try {
                setMounted(true);
                const { data: { user: u }, error: authError } = await supabase.auth.getUser();
                if (authError || !u) { router.push('/login'); return; }
                setUser({ id: u.id, email: u.email! });
                await Promise.all([fetchCvs(u.id), fetchHistory(u.id), fetchProfile(u.id), fetchUsage()]);
            } catch (err: any) {
                console.error('Initial load error:', err);
                setError(t('common.error') || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function fetchUsage() {
        try {
            const res = await fetch('/api/usage');
            if (res.ok) setUsage(await res.json());
        } catch {
            // El contador es informativo: si falla, el servidor sigue aplicando el límite.
        }
    }

    async function fetchProfile(userId: string) {
        const { data } = await supabase
            .from('profiles')
            .select('full_name, phone, linkedin, avatar_url')
            .eq('id', userId)
            .single();
        if (data) setProfile({
            full_name: data.full_name ?? '',
            phone: data.phone ?? '',
            linkedin: data.linkedin ?? '',
            avatar_url: data.avatar_url ?? '',
        });
    }

    async function fetchCvs(userId: string) {
        const { data } = await supabase
            .from('cvs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (data) {
            setCvs(data);
            const def = data.find((c: CV) => c.is_default);
            if (def) setSelectedCvId(def.id);
            else if (data.length > 0) setSelectedCvId(data[0].id);
        }
    }

    async function fetchHistory(userId: string) {
        const { data } = await supabase
            .from('cover_letters')
            .select('id, company, language, status, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);
        if (data) setHistory(data);
    }

    async function handleUploadCV() {
        if (!uploadFile || !uploadLabel || !user) return;
        setUploading(true);
        setError('');
        const filePath = `${user.id}/${Date.now()}_${uploadFile.name}`;
        
        try {
            const { error: storageError } = await supabase.storage
                .from('cvs')
                .upload(filePath, uploadFile, { contentType: 'application/pdf' });

            if (storageError) throw storageError;

            const { data: { publicUrl } } = supabase.storage.from('cvs').getPublicUrl(filePath);

            const isFirstCV = cvs.length === 0;
            const { error: dbError } = await supabase.from('cvs').insert({
                user_id: user.id,
                label: uploadLabel,
                language: uploadLang,
                file_url: publicUrl,
                file_name: uploadFile.name,
                is_default: isFirstCV,
            });

            if (dbError) throw dbError;

            setShowUpload(false);
            setUploadLabel('');
            setUploadFile(null);
            await fetchCvs(user.id);
        } catch (err: any) {
            console.error('Upload CV error:', err);
            setError(err.message || t('common.error'));
        } finally {
            setUploading(false);
        }
    }

    async function handleSetDefault(cvId: string) {
        if (!user) return;
        try {
            const { error: err1 } = await supabase.from('cvs').update({ is_default: false }).eq('user_id', user.id);
            if (err1) throw err1;
            const { error: err2 } = await supabase.from('cvs').update({ is_default: true }).eq('id', cvId);
            if (err2) throw err2;
            await fetchCvs(user.id);
        } catch (err: any) {
            console.error('Set default CV error:', err);
            setError(t('common.error'));
        }
    }

    async function handleDeleteCV(cvId: string) {
        if (!user || !confirm(t('common.confirm_delete'))) return;
        
        try {
            const cvToDelete = cvs.find(c => c.id === cvId);
            if (cvToDelete) {
                // 1. Extract path for storage deletion
                const storageMatch = cvToDelete.file_url.match(/\/storage\/v1\/object\/(?:public|sign)\/cvs\/(.+)/);
                if (storageMatch) {
                    const filePath = storageMatch[1];
                    await supabase.storage.from('cvs').remove([filePath]);
                }
            }

            // 2. Delete DB record
            const { error } = await supabase.from('cvs').delete().eq('id', cvId);
            if (error) throw error;
            
            await fetchCvs(user.id);
        } catch (err: any) {
            console.error('Delete CV error:', err);
            setError(t('common.error'));
        }
    }

    async function handleDeleteHistory(historyId: string) {
        if (!user || !confirm(t('common.confirm_delete'))) return;
        try {
           const { error } = await supabase.from('cover_letters').delete().eq('id', historyId);
           if (error) throw error;
           await fetchHistory(user.id);
        } catch (err: any) {
            console.error('Delete history error:', err);
            setError(t('common.error'));
        }
    }

    async function handleGenerate(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCvId || !company || !requirements || !user) return;
        setError('');
        setQuotaHit(false);
        setGenerating(true);

        const selectedCV = cvs.find(c => c.id === selectedCvId);
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company,
                    position,
                    job_requirements: requirements,
                    cv_id: selectedCvId,
                    cv_url: selectedCV?.file_url,
                    language: outputLang,
                }),
            });
            const data = await res.json();
            if (res.status === 402) {
                setQuotaHit(true);
                setUsage({ plan: data.plan, used: data.used, limit: data.limit, resetsAt: data.resetsAt });
                return;
            }
            if (data.cover_letter_id) {
                router.push(`/editor/${data.cover_letter_id}`);
            } else {
                setError(data.error || t('common.error'));
            }
        } catch (err) {
            console.error('Generate error:', err);
            setError(t('common.error'));
        } finally {
            setGenerating(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/');
    }

    async function handleDeleteAccount() {
        if (!window.confirm(t('account.delete_confirm'))) return;
        setDeletingAccount(true);
        setError('');
        try {
            const res = await fetch('/api/account/delete', { method: 'POST' });
            if (res.ok) {
                await supabase.auth.signOut();
                router.push('/');
                return;
            }
            const data = await res.json().catch(() => ({}));
            setError(data.error === 'active_subscription' ? t('account.delete_active_subscription') : t('common.error'));
            setShowProfile(false);
        } catch {
            setError(t('common.error'));
        } finally {
            setDeletingAccount(false);
        }
    }

    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        setSavingProfile(true);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                full_name: profile.full_name,
                phone: profile.phone,
                linkedin: profile.linkedin,
            })
            .eq('id', user.id);

        if (updateError) setError(updateError.message);
        else setShowProfile(false);
        setSavingProfile(false);
    }

    async function handleUploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    async function handleCropComplete(croppedBlob: Blob) {
        if (!user) return;
        setImageToCrop(null);
        setSavingProfile(true);
        setError('');

        const filePath = `${user.id}/avatar_${Date.now()}.jpg`;

        try {
            // 1. Delete old avatar if it exists
            if (profile.avatar_url) {
                const storageMatch = profile.avatar_url.match(/\/storage\/v1\/object\/(?:public|sign)\/profiles\/(.+)/);
                if (storageMatch) {
                    const oldPath = storageMatch[1];
                    await supabase.storage.from('profiles').remove([oldPath]);
                }
            }

            // 2. Upload new avatar
            const { error: storageError } = await supabase.storage
                .from('profiles')
                .upload(filePath, croppedBlob, { contentType: 'image/jpeg' });

            if (storageError) throw storageError;

            const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;
            
            setProfile({ ...profile, avatar_url: publicUrl });
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            setError(err.message || t('common.error'));
        } finally {
            setSavingProfile(false);
        }
    }

    const langLabel = { en: 'EN', es: 'ES', fr: 'FR' };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="page-header">
                <span className="logo">CoverCraft</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LanguageSwitcher />
                    <div
                        onClick={() => setShowProfile(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                        }}
                    >
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profile" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                                {profile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                            {profile.full_name || t('dashboard.set_profile')}
                        </span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                        <LogOut size={15} /> {t('dashboard.logout')}
                    </button>
                </div>
            </header>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 32px' }}>
                {/* Profile Incomplete Banner */}
                {mounted && (!profile.full_name || !profile.avatar_url) && (
                    <div className="fade-in" style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 24px',
                        marginBottom: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ color: 'var(--accent-light)' }}>
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {t('dashboard.profile_incomplete_title') || 'Complete your profile'}
                                </h4>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    {t('dashboard.profile_incomplete_subtitle') || 'Set your name and photo to make your cover letters look professional.'}
                                </p>
                            </div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowProfile(true)}>
                            {t('dashboard.complete_profile_cta') || 'Setup Profile'} <ArrowRight size={14} />
                        </button>
                    </div>
                )}

                <div className="dashboard-grid">

                    {/* LEFT: CV Manager */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{t('dashboard.my_cvs')}</h2>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>
                                <Plus size={15} /> {t('dashboard.add_cv')}
                            </button>
                        </div>

                        {cvs.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
                                <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                                <p style={{ fontSize: '14px' }}>{t('dashboard.no_cvs')}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {cvs.map(cv => (
                                    <div key={cv.id} className="card" style={{
                                        padding: '16px',
                                        borderColor: selectedCvId === cv.id ? 'var(--accent)' : undefined,
                                        cursor: 'pointer',
                                        position: 'relative',
                                    }} onClick={() => setSelectedCvId(cv.id)}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cv.label}</span>
                                                    {cv.is_default && <span className="badge badge-purple">{t('cv.default_badge')}</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span className="badge badge-cyan">{langLabel[cv.language as keyof typeof langLabel] || cv.language.toUpperCase()}</span>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cv.file_name}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                {!cv.is_default && (
                                                    <button className="btn btn-ghost btn-sm" title={t('cv.set_default')} onClick={e => { e.stopPropagation(); handleSetDefault(cv.id); }}>
                                                        <Star size={14} />
                                                    </button>
                                                )}
                                                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDeleteCV(cv.id); }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cover Letter History */}
                        {history.length > 0 && (
                            <div style={{ marginTop: '32px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                                    <Clock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                                    {t('dashboard.history_title')}
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {history.map(cl => (
                                        <div key={cl.id} className="card" style={{ padding: '12px 16px', cursor: 'pointer', position: 'relative' }}
                                            onClick={() => router.push(`/editor/${cl.id}`)}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, fontSize: '14px', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl.company}</span>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                  <span className={`badge ${cl.status === 'done' ? 'badge-green' : 'badge-cyan'}`}>{cl.status}</span>
                                                   <button className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--text-muted)' }} onClick={e => { e.stopPropagation(); handleDeleteHistory(cl.id); }} title={t('common.delete')}>
                                                       <Trash2 size={14} />
                                                   </button>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                {langLabel[cl.language as keyof typeof langLabel] || cl.language.toUpperCase()} · {mounted ? new Date(cl.created_at).toLocaleDateString() : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {usage?.plan === 'free' && <AdSlot slotKey="dashboard" style={{ marginTop: '32px' }} />}
                    </div>

                    {/* RIGHT: Generate Form */}
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>{t('dashboard.generate_title')}</h2>

                        {usage && (
                            <div className="usage-bar" style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', fontSize: '14px' }}>
                                    <span>
                                        <span className={`badge ${usage.plan === 'pro' ? 'badge-purple' : 'badge-cyan'}`} style={{ marginRight: '8px' }}>
                                            {usage.plan === 'pro' ? 'Pro' : t('billing.free_plan')}
                                        </span>
                                        {t('billing.usage', { used: Math.min(usage.used, usage.limit), limit: usage.limit })}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        {t('billing.resets', { date: mounted ? new Date(usage.resetsAt).toLocaleDateString() : '' })}
                                        {usage.plan === 'free' && (
                                            <> · <Link href="/pricing" style={{ color: 'var(--accent-light)' }}>{t('billing.see_plans')}</Link></>
                                        )}
                                    </span>
                                </div>
                                <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
                                        height: '100%',
                                        background: usage.used >= usage.limit ? 'var(--error, #ef4444)' : 'var(--accent)',
                                    }} />
                                </div>
                            </div>
                        )}

                        {quotaHit && usage && (
                            <div className="error-msg" style={{ marginBottom: '20px' }}>
                                {t('billing.quota_reached', { limit: usage.limit })}{' '}
                                <Link href="/pricing" style={{ color: 'inherit', fontWeight: 700 }}>{t('billing.see_plans')} →</Link>
                            </div>
                        )}

                        <div className="card fade-in">
                            <form onSubmit={handleGenerate}>
                                {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}

                                <div className="form-group">
                                    <label className="input-label">{t('dashboard.company')}</label>
                                    <input
                                        className="input"
                                        value={company}
                                        onChange={e => setCompany(e.target.value)}
                                        placeholder={t('dashboard.company_placeholder')}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="input-label">{t('dashboard.position')}</label>
                                    <input
                                        className="input"
                                        value={position}
                                        onChange={e => setPosition(e.target.value)}
                                        placeholder={t('dashboard.position_placeholder')}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="input-label">{t('dashboard.requirements')}</label>
                                    <textarea
                                        className="input"
                                        value={requirements}
                                        onChange={e => setRequirements(e.target.value)}
                                        placeholder={t('dashboard.requirements_placeholder')}
                                        required
                                        style={{ minHeight: '200px' }}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="input-label">{t('dashboard.select_cv')}</label>
                                        <select className="input" value={selectedCvId} onChange={e => setSelectedCvId(e.target.value)} required>
                                            <option value="">—</option>
                                            {cvs.map(cv => (
                                                <option key={cv.id} value={cv.id}>{cv.label} ({langLabel[cv.language as keyof typeof langLabel] || cv.language})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="input-label">{t('dashboard.output_language')}</label>
                                        <select className="input" value={outputLang} onChange={e => setOutputLang(e.target.value)}>
                                            <option value="en">{t('cv.language_en')}</option>
                                            <option value="es">{t('cv.language_es')}</option>
                                            <option value="fr">{t('cv.language_fr')}</option>
                                            <option value="nl">{t('cv.language_nl')}</option>
                                        </select>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px' }} disabled={generating || cvs.length === 0}>
                                    {generating ? <><div className="spinner" /> {t('dashboard.generating')}</> : t('dashboard.generate_button')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Upload CV Modal */}
                {showUpload && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
                    }} onClick={e => { if (e.target === e.currentTarget) setShowUpload(false); }}>
                        <div className="card fade-in" style={{ maxWidth: '440px', width: '100%', padding: '32px', position: 'relative' }}>
                            <button onClick={() => setShowUpload(false)} style={{
                                position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none',
                                cursor: 'pointer', color: 'var(--text-muted)',
                            }}>
                                <X size={20} />
                            </button>

                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>{t('dashboard.add_cv')}</h3>

                            <div className="form-group">
                                <label className="input-label">{t('dashboard.cv_label')}</label>
                                <input
                                    className="input"
                                    value={uploadLabel}
                                    onChange={e => setUploadLabel(e.target.value)}
                                    placeholder={t('cv.label_placeholder')}
                                />
                            </div>

                            <div className="form-group">
                                <label className="input-label">{t('dashboard.cv_language')}</label>
                                <select className="input" value={uploadLang} onChange={e => setUploadLang(e.target.value)}>
                                    <option value="en">{t('cv.language_en')}</option>
                                    <option value="es">{t('cv.language_es')}</option>
                                    <option value="fr">{t('cv.language_fr')}</option>
                                    <option value="other">{t('cv.language_other')}</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="input-label">{t('cv.upload')}</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${uploadFile ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius)',
                                        padding: '32px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s',
                                        background: uploadFile ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                    }}
                                >
                                    <Upload size={28} style={{ margin: '0 auto 12px', color: uploadFile ? 'var(--accent-light)' : 'var(--text-muted)' }} />
                                    {uploadFile ? (
                                        <p style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{uploadFile.name}</p>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Click to select a PDF file</p>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                                />
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={handleUploadCV}
                                disabled={!uploadFile || !uploadLabel || uploading}
                            >
                                {uploading ? <><div className="spinner" /></> : <><Upload size={16} /> {t('cv.save')}</>}
                            </button>
                        </div>
                    </div>
                )}
                {/* Profile Modal */}
                {showProfile && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
                    }} onClick={e => { if (e.target === e.currentTarget) setShowProfile(false); }}>
                        <div className="card fade-in" style={{ maxWidth: '440px', width: '100%', padding: '32px', position: 'relative' }}>
                            <button onClick={() => setShowProfile(false)} style={{
                                position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none',
                                cursor: 'pointer', color: 'var(--text-muted)',
                            }}>
                                <X size={20} />
                            </button>

                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>{t('dashboard.profile_settings')}</h3>

                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <div
                                    onClick={() => avatarInputRef.current?.click()}
                                    style={{
                                        width: '100px', height: '100px', borderRadius: '50%',
                                        margin: '0 auto 12px', background: 'var(--bg-secondary)',
                                        border: '2px solid var(--border)', cursor: 'pointer',
                                        overflow: 'hidden', position: 'relative',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <Upload size={32} style={{ color: 'var(--text-muted)' }} />
                                    )}
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        background: 'rgba(0,0,0,0.5)', padding: '4px', fontSize: '10px'
                                    }}>
                                        {t('dashboard.change_photo')}
                                    </div>
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleUploadAvatar}
                                />
                            </div>

                            <form onSubmit={handleUpdateProfile}>
                                <div className="form-group">
                                    <label className="input-label">{t('dashboard.full_name')}</label>
                                    <input
                                        className="input"
                                        value={profile.full_name}
                                        onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="input-label">{t('dashboard.phone')}</label>
                                    <input
                                        className="input"
                                        value={profile.phone}
                                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                        placeholder="+1 234 567 890"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="input-label">{t('dashboard.linkedin')}</label>
                                    <input
                                        className="input"
                                        value={profile.linkedin}
                                        onChange={e => setProfile({ ...profile, linkedin: e.target.value })}
                                        placeholder="https://linkedin.com/in/your-profile"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    disabled={savingProfile}
                                >
                                    {savingProfile ? <div className="spinner" /> : t('common.save')}
                                </button>
                            </form>

                            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                    {t('account.delete_hint')}
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={handleDeleteAccount}
                                    disabled={deletingAccount}
                                    id="btn-delete-account"
                                >
                                    {deletingAccount ? <div className="spinner" /> : <><Trash2 size={14} /> {t('account.delete_button')}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {imageToCrop && (
                    <ProfilePhotoCropper
                        image={imageToCrop}
                        onCropComplete={handleCropComplete}
                        onCancel={() => setImageToCrop(null)}
                    />
                )}
            </div>
            <SiteFooter />
        </div>
    );
}
