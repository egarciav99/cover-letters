'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { fontsHref } from '@/lib/letterTemplates';
import type { ResumeData, ResumeLanguage, ResumeStyle } from '@/lib/resume';
import { PAGE_H, PAGE_W } from '@/lib/resumeTemplates';
import { downloadPagesPdf } from '@/lib/pdfExport';
import { buildResumeHtml, resumeFileName, useResumeHtml } from './useResumeHtml';

const PAGE_GAP = 16;

interface Props {
    data: ResumeData;
    style: ResumeStyle;
    language: ResumeLanguage;
    avatarUrl: string;
    labels: { download: string; loading: string };
}

/** CV online: las mismas páginas A4 que el PDF, escaladas al ancho de la pantalla, y botón de descarga. */
export default function PublicResumeView({ data, style, language, avatarUrl, labels }: Props) {
    const [options] = useState(() => ({ language, avatarUrl }));
    const { html, pageCount } = useResumeHtml(data, style, options, true, style.fitOnePage);
    const boxRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const update = () => setScale(Math.min(1, el.clientWidth / PAGE_W));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    async function download() {
        setDownloading(true);
        try {
            await downloadPagesPdf(await buildResumeHtml(data, style, options, style.fitOnePage), style.font, resumeFileName(data.personal.fullName));
        } catch (err) {
            console.error('Public resume PDF error:', err);
        } finally {
            setDownloading(false);
        }
    }

    const totalH = PAGE_H * pageCount + PAGE_GAP * (pageCount - 1);
    const srcDoc = `<!doctype html><html><head><meta charset="utf-8" /><link rel="stylesheet" href="${fontsHref(style.font)}" />
        <style>html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}html,body{margin:0;background:transparent;}.pdf-page{box-shadow:0 1px 3px rgba(0,0,0,.25);}.pdf-page + .pdf-page{margin-top:${PAGE_GAP}px !important;}</style></head><body>${html}</body></html>`;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={download} disabled={downloading || !html} id="btn-public-cv-download">
                    {downloading ? <div className="spinner" /> : <Download size={15} />} {labels.download}
                </button>
            </div>
            <div ref={boxRef} style={{ width: '100%', maxWidth: PAGE_W, margin: '0 auto', height: html ? totalH * scale : 300, overflow: 'hidden' }}>
                {html ? (
                    <iframe
                        title={data.personal.fullName || 'CV'}
                        srcDoc={srcDoc}
                        sandbox=""
                        style={{ width: PAGE_W, height: totalH, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', background: 'transparent' }}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} aria-label={labels.loading}><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
                )}
            </div>
        </div>
    );
}
