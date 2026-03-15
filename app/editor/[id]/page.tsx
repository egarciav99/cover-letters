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

            const rawMonthYear = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { year: 'numeric', month: 'long' });
            const monthYear = rawMonthYear.charAt(0).toUpperCase() + rawMonthYear.slice(1);
            const appPrefix = t('editor.application') || 'Application';
            const subjectLine = position ? `${appPrefix} - ${position} - ${company}` : `${appPrefix} - ${company}`;

            const pdfHtml = `
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

                    * { box-sizing: border-box; margin: 0; padding: 0; }

                    .pdf-page {
                        background-color: #ffffff;
                        width: 794px;
                        min-height: 1122px;
                        box-sizing: border-box;
                        position: relative;
                        overflow: hidden;
                        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        color: #1a1a1a;
                        font-size: 12px;
                    }

                    /* ── HEADER BAND ── */
                    .pdf-header {
                        background: linear-gradient(135deg, #142D56 0%, #1B3A6B 100%);
                        border-bottom: 4px solid #2A5298;
                        padding: 36px 48px 30px 48px;
                        display: flex;
                        align-items: center;
                        gap: 36px;
                    }

                    .pdf-avatar {
                        width: 110px;
                        height: 110px;
                        border-radius: 50%;
                        object-fit: cover;
                        flex-shrink: 0;
                        border: 3px solid #2A5298;
                        background: #1B3A6B;
                    }

                    .pdf-avatar-placeholder {
                        width: 110px;
                        height: 110px;
                        border-radius: 50%;
                        flex-shrink: 0;
                        border: 3px solid #2A5298;
                        background: #1e3a70;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 42px;
                        font-weight: 700;
                        color: #F5F0E8;
                    }

                    .pdf-header-info {
                        flex: 1;
                    }

                    .pdf-name {
                        font-size: 17px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        color: #F5F0E8;
                        margin-bottom: 14px;
                        line-height: 1.2;
                    }

                    .pdf-contact-section-label {
                        font-size: 7px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: #F5F0E8;
                        border-bottom: 1px solid #2A5298;
                        padding-bottom: 3px;
                        margin-bottom: 7px;
                    }

                    .pdf-contact-item {
                        display: flex;
                        align-items: baseline;
                        gap: 5px;
                        margin-bottom: 4px;
                    }

                    .pdf-contact-bullet {
                        font-size: 7.5px;
                        font-weight: 700;
                        color: #2A5298;
                        flex-shrink: 0;
                    }

                    .pdf-contact-text {
                        font-size: 8px;
                        color: #c8d6f0;
                        line-height: 1.4;
                    }

                    /* ── BODY ── */
                    .pdf-body {
                        padding: 32px 48px 40px 48px;
                    }

                    .pdf-meta {
                        text-align: right;
                        margin-bottom: 28px;
                        padding-bottom: 14px;
                        border-bottom: 1.5px solid #e8ecf4;
                    }

                    .pdf-subject {
                        font-size: 11px;
                        font-weight: 700;
                        color: #2E74B5;
                        font-style: italic;
                        margin-bottom: 3px;
                    }

                    .pdf-date {
                        font-size: 9px;
                        color: #666;
                        font-style: italic;
                    }

                    .pdf-greeting {
                        font-size: 11.5px;
                        color: #1a1a1a;
                        margin-bottom: 18px;
                        line-height: 1.6;
                    }

                    .pdf-paragraph {
                        font-size: 11.5px;
                        line-height: 1.68;
                        margin-bottom: 14px;
                        text-align: justify;
                        color: #1a1a1a;
                    }

                    .pdf-signature {
                        margin-top: 32px;
                    }

                    .pdf-closing {
                        font-size: 11.5px;
                        color: #1a1a1a;
                        margin-bottom: 2px;
                    }

                    .pdf-sig-name {
                        font-family: 'Great Vibes', cursive;
                        font-size: 52px;
                        color: #1F4D78;
                        line-height: 1.1;
                        margin-top: 4px;
                    }
                </style>

                <div class="pdf-page">
                    <!-- HEADER -->
                    <div class="pdf-header">
                        ${profile.avatar_url
                            ? `<img src="${profile.avatar_url}" crossorigin="anonymous" class="pdf-avatar" />`
                            : `<div class="pdf-avatar-placeholder">${profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}</div>`
                        }
                        <div class="pdf-header-info">
                            <div class="pdf-name">${profile.full_name}</div>
                            <div class="pdf-contact-section-label">Contact</div>
                            ${profile.phone ? `<div class="pdf-contact-item"><span class="pdf-contact-bullet">▸</span><span class="pdf-contact-text">${profile.phone}</span></div>` : ''}
                            ${profile.email ? `<div class="pdf-contact-item"><span class="pdf-contact-bullet">▸</span><span class="pdf-contact-text">${profile.email}</span></div>` : ''}
                            ${profile.linkedin ? `<div class="pdf-contact-item"><span class="pdf-contact-bullet">▸</span><span class="pdf-contact-text">${profile.linkedin.replace('https://', '')}</span></div>` : ''}
                        </div>
                    </div>

                    <!-- BODY -->
                    <div class="pdf-body">
                        <div class="pdf-meta">
                            <div class="pdf-subject">${subjectLine}</div>
                            <div class="pdf-date">${monthYear}</div>
                        </div>

                        <div class="pdf-greeting">${greeting}</div>

                        ${content.split('\n').filter(p => p.trim()).map(p => `<div class="pdf-paragraph">${p}</div>`).join('')}

                        <div class="pdf-signature">
                            <div class="pdf-closing">${closing}</div>
                            <div class="pdf-sig-name">${profile.full_name}</div>
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
                width: '794px',
                minHeight: '1122px',
                background: '#ffffff',
                fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
                zIndex: -1,
                boxSizing: 'border-box',
                overflow: 'hidden',
                fontSize: '12px',
                color: '#1a1a1a',
            }}>
                {/* HEADER BAND */}
                <div style={{
                    background: 'linear-gradient(135deg, #142D56 0%, #1B3A6B 100%)',
                    borderBottom: '4px solid #2A5298',
                    padding: '36px 48px 30px 48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '36px',
                }}>
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt="Profile"
                            crossOrigin="anonymous"
                            style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid #2A5298', background: '#1B3A6B' }}
                        />
                    ) : (
                        <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: '#1e3a70', border: '3px solid #2A5298', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px', fontWeight: 700, color: '#F5F0E8', flexShrink: 0 }}>
                            {profile.full_name?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#F5F0E8', marginBottom: '14px', lineHeight: 1.2 }}>
                            {profile.full_name}
                        </div>
                        <div style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#F5F0E8', borderBottom: '1px solid #2A5298', paddingBottom: '3px', marginBottom: '7px' }}>
                            Contact
                        </div>
                        {profile.phone && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 700, color: '#2A5298' }}>▸</span>
                                <span style={{ fontSize: '8px', color: '#c8d6f0' }}>{profile.phone}</span>
                            </div>
                        )}
                        {profile.email && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 700, color: '#2A5298' }}>▸</span>
                                <span style={{ fontSize: '8px', color: '#c8d6f0' }}>{profile.email}</span>
                            </div>
                        )}
                        {profile.linkedin && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 700, color: '#2A5298' }}>▸</span>
                                <span style={{ fontSize: '8px', color: '#c8d6f0' }}>{profile.linkedin.replace('https://', '')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* BODY */}
                <div style={{ padding: '32px 48px 40px 48px' }}>
                    <div style={{ textAlign: 'right', marginBottom: '28px', paddingBottom: '14px', borderBottom: '1.5px solid #e8ecf4' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#2E74B5', fontStyle: 'italic', marginBottom: '3px' }}>
                            {(() => {
                                const appPrefix = t('editor.application') || 'Application';
                                return position ? `${appPrefix} - ${position} - ${company}` : `${appPrefix} - ${company}`;
                            })()}
                        </div>
                        <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic' }}>
                            {mounted ? (() => {
                                const raw = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
                                return raw.charAt(0).toUpperCase() + raw.slice(1);
                            })() : ''}
                        </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#1a1a1a', marginBottom: '18px', lineHeight: 1.6 }}>{greeting}</div>

                    <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet" />
                    <div style={{ fontSize: '11.5px', lineHeight: 1.68, color: '#1a1a1a', textAlign: 'justify' }} dangerouslySetInnerHTML={{ __html: content }} />

                    <div style={{ marginTop: '32px' }}>
                        <div style={{ fontSize: '11.5px', color: '#1a1a1a', marginBottom: '2px' }}>{closing}</div>
                        <div style={{
                            fontFamily: "'Great Vibes', cursive",
                            fontSize: '52px',
                            color: '#1F4D78',
                            lineHeight: 1.1,
                            marginTop: '4px',
                        }}>
                            {profile.full_name}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
