'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Download, RefreshCw, Loader2 } from 'lucide-react';
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
            .select('status, content, company, position')
            .eq('id', id)
            .single();
        if (data) {
            setStatus(data.status as 'pending' | 'done' | 'error');
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
        fetchLetter();

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
                const updated = payload.new as { status: string; content: string; company: string; position: string };
                setStatus(updated.status as 'pending' | 'done' | 'error');
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
                .select('status, content, company')
                .eq('id', id)
                .single();
            if (data?.status !== 'pending') {
                setStatus(data!.status as 'pending' | 'done' | 'error');
                setContent(data!.content || '');
                setCompany(data!.company || '');
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

    async function handleDownloadPDF() {
        setDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;

            // Fetch letter language from Supabase
            const { data: letterData } = await (await import('@/lib/supabase/client')).createClient()
                .from('cover_letters').select('language').eq('id', id).single();
            const lang = letterData?.language || 'en';

            // Build avatar HTML
            const avatarHtml = profile.avatar_url
                ? `<img src="${profile.avatar_url}" crossorigin="anonymous" style="width:140px;height:140px;border-radius:50%;object-fit:cover;background-color:#e0e0e0;flex-shrink:0;" />`
                : profile.full_name
                    ? `<div style="width:140px;height:140px;border-radius:50%;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:700;color:#555;flex-shrink:0;">${profile.full_name.charAt(0).toUpperCase()}</div>`
                    : '';

            const rawMonthYear = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { year: 'numeric', month: 'long' });
            const monthYear = rawMonthYear.charAt(0).toUpperCase() + rawMonthYear.slice(1);
            const appPrefix = t('editor.application') || 'Application';
            const subjectLine = position ? `${appPrefix} - ${position} - ${company}` : `${appPrefix} - ${company}`;

            const pdfHtml = `
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
                    .pdf-page {
                        background-color: #ffffff;
                        width: 794px;
                        min-height: 1122px;
                        padding: 50px 70px;
                        box-sizing: border-box;
                        position: relative;
                        overflow: hidden;
                        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        color: #333;
                    }
                    .pdf-page::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 220px;
                        background-color: #fdfaf2;
                        border-bottom: 2px solid #eaddca;
                        z-index: 0;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        gap: 40px;
                        margin-bottom: 40px;
                        position: relative;
                        z-index: 1;
                    }
                    .personal-info {
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    }
                    .name {
                        font-size: 24px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #000;
                        margin: 0 0 10px 0;
                        font-weight: 700;
                        line-height: 1.2;
                    }
                    .contact-detail {
                        font-size: 14px;
                        color: #555;
                        margin: 0;
                    }
                    .application-meta {
                        margin-bottom: 30px;
                        position: relative;
                        z-index: 1;
                    }
                    .job-title {
                        font-size: 16px;
                        font-weight: 600;
                        color: #222;
                        margin: 0 0 5px 0;
                    }
                    .date {
                        font-size: 14px;
                        color: #777;
                        margin: 0;
                    }
                    .body-text {
                        position: relative;
                        z-index: 1;
                    }
                    .body-text p {
                        font-size: 14px;
                        line-height: 1.6;
                        margin-bottom: 20px;
                        text-align: justify;
                        color: #2b2b2b;
                    }
                    .signature {
                        margin-top: 40px;
                    }
                    .signature p {
                        margin: 0 0 5px 0;
                    }
                    .handwritten-signature {
                        font-family: 'Great Vibes', cursive;
                        font-size: 300px;
                        color: #8b7355;
                        margin-top: 5px;
                        margin-bottom: 0px;
                    }
                </style>
                <div class="pdf-page">
                    <div class="header">
                        ${avatarHtml}
                        <div class="personal-info">
                            <h1 class="name">${profile.full_name}</h1>
                            ${profile.phone ? `<p class="contact-detail">${profile.phone}</p>` : ''}
                            ${profile.email ? `<p class="contact-detail">${profile.email}</p>` : ''}
                            ${profile.linkedin ? `<p class="contact-detail">${profile.linkedin.replace('https://', '')}</p>` : ''}
                        </div>
                    </div>

                    <div class="application-meta">
                        <h2 class="job-title">${subjectLine}</h2>
                        <p class="date">${monthYear}</p>
                    </div>

                    <div class="body-text">
                        <p>${greeting}</p>
                        ${content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
                        
                        <div class="signature">
                            <p>${closing}</p>
                            <p class="handwritten-signature">${profile.full_name}</p>
                        </div>
                    </div>
                </div>
            `;

            const opt = {
                margin: [0, 0, 0, 0] as [number, number, number, number],
                filename: `cover-letter-${company.replace(/\s+/g, '-').toLowerCase()}.pdf`,
                html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            };

            const tmp = document.createElement('div');
            tmp.style.cssText = 'position:absolute;top:0;left:-9999px;width:794px;z-index:-1;';
            tmp.innerHTML = pdfHtml;
            document.body.appendChild(tmp);

            const contentDiv = tmp.querySelector('.pdf-page') as HTMLElement;

            // Wait for all images in the div to load
            const images = contentDiv.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if an image fails
                });
            });

            await Promise.all(imagePromises);
            await new Promise(r => setTimeout(r, 500)); // Brief extra buffer for rendering

            if (contentDiv) {
                await html2pdf().set(opt).from(contentDiv).save();
            }

            document.body.removeChild(tmp);

        } finally {
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
                background: 'radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.1) 0%, var(--bg-primary) 60%)',
            }}>
                <div className="fade-in" style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 32px',
                        borderRadius: '50%',
                        background: 'rgba(124,58,237,0.15)',
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

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 32px' }}>
                <div className="fade-in">
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

            {/* Hidden PDF Template — Synchronized with Export Logic */}
            <div id="pdf-template" style={{
                position: 'fixed',
                top: 0,
                left: '-9999px',
                visibility: 'hidden',
                width: '210mm',
                minHeight: '297mm',
                background: '#ffffff',
                fontFamily: 'var(--font-geist-sans), "Segoe UI", Roboto, Arial, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                zIndex: -1,
                padding: '50px 70px',
                boxSizing: 'border-box',
                color: '#333',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '220px',
                    backgroundColor: '#fdfaf2',
                    borderBottom: '2px solid #eaddca',
                    zIndex: 0,
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt="Profile"
                            crossOrigin="anonymous"
                            style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#e0e0e0' }}
                        />
                    ) : (
                        <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 700, color: '#555', flexShrink: 0 }}>
                            {profile.full_name?.charAt(0).toUpperCase()}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <h1 style={{ fontSize: '24px', textTransform: 'uppercase', letterSpacing: '1px', color: '#000', margin: '0 0 10px 0', fontWeight: 700 }}>
                            {profile.full_name}
                        </h1>
                        {profile.phone && <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>{profile.phone}</p>}
                        {profile.email && <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>{profile.email}</p>}
                        {profile.linkedin && <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>{profile.linkedin.replace('https://', '')}</p>}
                    </div>
                </div>

                <div style={{ marginBottom: '30px', position: 'relative', zIndex: 1 }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#222', margin: '0 0 5px 0' }}>
                        {(() => {
                            const appPrefix = t('editor.application') || 'Application';
                            return position ? `${appPrefix} - ${position} - ${company}` : `${appPrefix} - ${company}`;
                        })()}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#777', margin: 0 }}>
                        {mounted ? (() => {
                            const raw = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
                            return raw.charAt(0).toUpperCase() + raw.slice(1);
                        })() : ''}
                    </p>
                </div>

                <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#2b2b2b', textAlign: 'justify', position: 'relative', zIndex: 1 }}>
                    <p style={{ marginBottom: '20px' }}>{greeting}</p>
                    <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet" />
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                    <div style={{ marginTop: '40px' }}>
                        <p style={{ margin: '0 0 5px 0' }}>{closing}</p>
                        <p style={{
                            fontFamily: "'Great Vibes', cursive",
                            fontSize: '300px',
                            color: '#8b7355',
                            marginTop: '5px',
                            marginBottom: '0px'
                        }}>
                            {profile.full_name}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
