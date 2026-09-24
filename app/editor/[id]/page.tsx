'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Download, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import DesignPanel from '@/components/editor/DesignPanel';
import {
    DEFAULT_STYLE, LETTER_LABELS, fontFamilies, fontsHref, loadStyle, renderLetterHtml, saveStyle, toParagraphs,
    type LetterStyle,
} from '@/lib/letterTemplates';
import dynamic from 'next/dynamic';

const CoverLetterEditor = dynamic(() => import('@/components/editor/CoverLetterEditor'), { ssr: false });

export default function EditorPage() {
    const t = useTranslations();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const supabase = createClient();

    const [status, setStatus] = useState<'pending' | 'done' | 'error'>('pending');
    const [content, setContent] = useState('');
    const [company, setCompany] = useState('');
    const [position, setPosition] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [profile, setProfile] = useState<{ full_name: string; phone: string; linkedin: string; avatar_url: string; email: string }>({
        full_name: '', phone: '', linkedin: '', avatar_url: '', email: ''
    });
    const [greeting, setGreeting] = useState('');
    const [closing, setClosing] = useState('');
    const [progressStep, setProgressStep] = useState(0);
    const [letterLang, setLetterLang] = useState('en');
    const [errorCode, setErrorCode] = useState('');
    const [letterStyle, setLetterStyle] = useState<LetterStyle>(DEFAULT_STYLE);

    useEffect(() => {
        setLetterStyle(loadStyle());
    }, []);

    function updateStyle(style: LetterStyle) {
        setLetterStyle(style);
        saveStyle(style);
    }

    const steps = [
        t('editor.step_analyzing') || 'Analyzing job requirements...',
        t('editor.step_researching') || 'Researching company profile...',
        t('editor.step_drafting') || 'Drafting your personalized letter...',
        t('editor.step_polishing') || 'Polishing structure & design...',
        t('editor.step_finalizing') || 'Finalizing dynamic PDF template...',
    ];

    const fetchLetter = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (prof) setProfile({ ...prof, email: user.email || '' });
        }

        const { data } = await supabase
            .from('cover_letters')
            .select('*')
            .eq('id', id)
            .single();
        if (data) {
            setStatus(data.status as 'pending' | 'done' | 'error');
            setErrorCode(data.error_code || '');
            setLetterLang(data.language || 'en');
            setContent(data.content || '');
            setCompany(data.company || '');
            setPosition(data.position || '');

            // Initialize greeting and closing based on language
            setGreeting(t('editor.default_greeting', { company: data.company || t('common.company_fallback') || 'the company' }));
            setClosing(t('editor.default_closing'));
        }
    }, [id, t]);

    useEffect(() => {
        setMounted(true);
        
        async function init() {
            try {
                await fetchLetter();
            } catch (err) {
                console.error('Fetch letter error:', err);
                setStatus('error');
            }
        }
        init();

        // Progress stepper timer
        const progressInterval = setInterval(() => {
            setProgressStep(prev => (prev + 1) % steps.length);
        }, 3500);

        // Supabase Realtime subscription
        const channel = supabase
            .channel(`cover_letter_${id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'cover_letters',
                filter: `id=eq.${id}`,
            }, (payload) => {
                const updated = payload.new as { status: string; content: string; company: string; position: string; error_code?: string };
                setStatus(updated.status as 'pending' | 'done' | 'error');
                setErrorCode(updated.error_code || '');
                setContent(updated.content || '');
                setCompany(updated.company || '');
                setPosition(updated.position || '');
                if (updated.status !== 'pending') clearInterval(progressInterval);
            })
            .subscribe();

        // Fallback polling (every 3s while pending)
        const interval = setInterval(async () => {
            const { data } = await supabase
                .from('cover_letters')
                .select('*')
                .eq('id', id)
                .single();
            if (data && data.status !== 'pending') {
                setStatus(data.status as 'pending' | 'done' | 'error');
                setErrorCode(data.error_code || '');
                setContent(data.content || '');
                setCompany(data.company || '');
                clearInterval(interval);
                clearInterval(progressInterval);
            }
        }, 3000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, [id, fetchLetter]);

    const labels = LETTER_LABELS[letterLang] || LETTER_LABELS.en;

    const letterHtml = useMemo(() => {
        if (!mounted) return '';
        const rawMonthYear = new Date().toLocaleDateString(labels.locale, { year: 'numeric', month: 'long' });
        return renderLetterHtml(
            {
                fullName: profile.full_name,
                email: profile.email,
                phone: profile.phone,
                linkedin: profile.linkedin,
                avatarUrl: profile.avatar_url,
                subject: position ? `${labels.application} – ${position} – ${company}` : `${labels.application} – ${company}`,
                date: rawMonthYear.charAt(0).toUpperCase() + rawMonthYear.slice(1),
                greeting,
                paragraphs: toParagraphs(content),
                closing,
                contactLabel: labels.contact,
            },
            letterStyle,
        );
    }, [mounted, labels, profile, position, company, greeting, content, closing, letterStyle]);

    /** Carga las fuentes del estilo en la página y espera a que estén listas antes de capturar. */
    async function ensureFonts(style: LetterStyle) {
        const href = fontsHref(style.font);
        if (!document.querySelector(`link[data-letter-font="${style.font}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.dataset.letterFont = style.font;
            document.head.appendChild(link);
            await new Promise((resolve) => { link.onload = resolve; link.onerror = resolve; });
        }
        await Promise.all(fontFamilies(style.font).flatMap((f) => [
            document.fonts.load(`400 16px "${f}"`),
            document.fonts.load(`700 16px "${f}"`),
        ])).catch(() => undefined);
    }

    async function handleDownloadPDF() {
        setDownloading(true);
        let tmp: HTMLDivElement | null = null;
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            await ensureFonts(letterStyle);

            const opt = {
                margin: [0, 0, 0, 0] as [number, number, number, number],
                filename: `cover-letter-${company.replace(/\s+/g, '-').toLowerCase()}.pdf`,
                html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            };

            tmp = document.createElement('div');
            tmp.style.cssText = 'position:absolute;top:0;left:-9999px;width:794px;z-index:-1;';
            tmp.innerHTML = letterHtml;
            document.body.appendChild(tmp);

            const contentDiv = tmp.querySelector('.pdf-page') as HTMLElement;

            // Wait for all images in the div to load
            const images = contentDiv.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => img.complete ? Promise.resolve() : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if an image fails
            })));
            await new Promise(r => setTimeout(r, 300)); // Brief extra buffer for rendering

            if (contentDiv) {
                await html2pdf().set(opt).from(contentDiv).save();
            }
        } finally {
            if (tmp) document.body.removeChild(tmp);
            setDownloading(false);
        }
    }

    if (status === 'pending') {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(ellipse at 50% 30%, rgba(59, 130, 246, 0.1) 0%, var(--bg-primary) 60%)',
            }}>
                <div className="fade-in" style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 32px',
                        borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulseGlow 2s ease-in-out infinite',
                    }}>
                        <Loader2 size={36} style={{ color: 'var(--accent-light)', animation: 'spin 1.2s linear infinite' }} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>{t('editor.waiting')}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{t('editor.waiting_subtitle')}</p>

                    {/* Progress Stepper */}
                    <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {steps.map((step, idx) => {
                                const isCurrent = progressStep === idx;
                                const isDone = progressStep > idx;
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: isCurrent ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            background: isDone ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '10px', color: isDone || isCurrent ? '#fff' : 'inherit'
                                        }}>
                                            {isDone ? '✓' : idx + 1}
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: isCurrent ? 600 : 400 }}>{step}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-primary)' }}>
                <div className="card fade-in" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 32px' }}>
                    <AlertCircle size={40} style={{ color: 'var(--error)', margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>{t('editor.error_title')}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.6 }}>
                        {errorCode === 'cv_unreadable' ? t('editor.error_cv_unreadable') : t('editor.error_generic')}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>{t('editor.error_not_counted')}</p>
                    <button className="btn btn-primary" onClick={() => router.push('/dashboard')} id="btn-error-back">
                        <ArrowLeft size={16} /> {t('editor.back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft size={16} /> {t('editor.back')}
                    </button>
                    {company && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            {t('editor.title')} {t('editor.for_company')} <strong style={{ color: 'var(--text-primary)' }}>{company}</strong>
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard')}>
                        <RefreshCw size={15} /> {t('editor.regenerate')}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF} disabled={downloading}>
                        {downloading ? <div className="spinner" /> : <Download size={15} />}
                        {t('editor.download_pdf')}
                    </button>
                </div>
            </header>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 32px' }}>
                <DesignPanel value={letterStyle} onChange={updateStyle} previewHtml={letterHtml} />
                <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                        ✏️ {t('editor.edit_hint')}
                    </p>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {t('editor.greeting_label') || 'Greeting'}
                        </label>
                        <input
                            className="input"
                            value={greeting}
                            onChange={(e) => setGreeting(e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, paddingLeft: 0, fontSize: '15px' }}
                        />
                    </div>

                    <CoverLetterEditor content={content} onChange={setContent} />

                    <div style={{ marginTop: '32px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {t('editor.closing_label') || 'Closing & Sign-off'}
                        </label>
                        <input
                            className="input"
                            value={closing}
                            onChange={(e) => setClosing(e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, paddingLeft: 0, fontSize: '15px' }}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
