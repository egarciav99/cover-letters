'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LetterStyle } from '@/lib/letterTemplates';
import type { ResumeData } from '@/lib/resume';
import { paginateMeasured, renderResumeHtml, renderResumeMeasureHtml, type ResumeRenderOptions } from '@/lib/resumeTemplates';
import { ensureFonts, mountOffscreen, waitForImages } from '@/lib/pdfExport';

/**
 * HTML del CV repartido en páginas A4. Mide los bloques con las fuentes ya cargadas
 * (con un pequeño retardo para no medir en cada pulsación).
 */
export function useResumeHtml(data: ResumeData, style: LetterStyle, options: ResumeRenderOptions, enabled = true) {
    const [pages, setPages] = useState<number[][]>([]);

    useEffect(() => {
        if (!enabled) return;
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
    }, [enabled, data, style, options]);

    const html = useMemo(() => (enabled ? renderResumeHtml(data, style, options, pages) : ''), [enabled, data, style, options, pages]);
    return { html, pageCount: Math.max(1, pages.length) };
}

export function resumeFileName(fullName: string, suffix = ''): string {
    const slug = (fullName || 'cv').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return `cv-${slug || 'cv'}${suffix}.pdf`;
}
