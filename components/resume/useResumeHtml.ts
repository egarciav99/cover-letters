'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LetterStyle } from '@/lib/letterTemplates';
import type { ResumeData } from '@/lib/resume';
import { MAX_DENSITY, bottomFor, paginateMeasured, renderResumeHtml, renderResumeMeasureHtml, type ResumeRenderOptions } from '@/lib/resumeTemplates';
import { ensureFonts, mountOffscreen, waitForImages } from '@/lib/pdfExport';

/** Mide el CV con las fuentes y la foto ya cargadas y lo reparte en páginas A4. */
export async function paginateResume(data: ResumeData, style: LetterStyle, options: ResumeRenderOptions): Promise<number[][]> {
    await ensureFonts(style.font);
    const tmp = mountOffscreen(renderResumeMeasureHtml(data, style, options));
    try {
        await waitForImages(tmp);
        return paginateMeasured(tmp, bottomFor(options.density));
    } finally {
        document.body.removeChild(tmp);
    }
}

export interface ResumeLayout {
    pages: number[][];
    /** Nivel de compactación usado (0 = normal). */
    density: number;
    /** Si se pidió una página: true si cabe, false si ni compactado cabe. null si no se pidió. */
    fits: boolean | null;
}

/**
 * Reparte el CV en páginas. Con `fit`, prueba niveles de compactación hasta que cabe en una;
 * si ni el más compacto cabe, vuelve al tamaño normal (mejor dos páginas legibles que una apretada).
 */
export async function layoutResume(data: ResumeData, style: LetterStyle, options: ResumeRenderOptions, fit: boolean): Promise<ResumeLayout> {
    const normal = await paginateResume(data, style, { ...options, density: 0 });
    if (!fit) return { pages: normal, density: 0, fits: null };
    if (normal.length <= 1) return { pages: normal, density: 0, fits: true };
    for (let density = 1; density <= MAX_DENSITY; density++) {
        const pages = await paginateResume(data, style, { ...options, density });
        if (pages.length <= 1) return { pages, density, fits: true };
    }
    return { pages: normal, density: 0, fits: false };
}

/** HTML final del CV ya paginado, calculado en el momento (para descargar el PDF). */
export async function buildResumeHtml(data: ResumeData, style: LetterStyle, options: ResumeRenderOptions, fit = false): Promise<string> {
    const layout = await layoutResume(data, style, options, fit);
    return renderResumeHtml(data, style, { ...options, density: layout.density }, layout.pages);
}

/**
 * HTML del CV repartido en páginas A4 para la vista previa. Se recalcula con un pequeño
 * retardo para no medir en cada pulsación.
 */
export function useResumeHtml(data: ResumeData, style: LetterStyle, options: ResumeRenderOptions, enabled = true, fit = false) {
    const [layout, setLayout] = useState<ResumeLayout>({ pages: [], density: 0, fits: null });

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            const result = await layoutResume(data, style, options, fit).catch(() => null);
            if (!cancelled && result) setLayout(result);
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [enabled, data, style, options, fit]);

    const html = useMemo(
        () => (enabled ? renderResumeHtml(data, style, { ...options, density: layout.density }, layout.pages) : ''),
        [enabled, data, style, options, layout],
    );
    return { html, pageCount: Math.max(1, layout.pages.length), density: layout.density, fits: layout.fits };
}

export function resumeFileName(fullName: string, suffix = ''): string {
    const slug = (fullName || 'cv').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return `cv-${slug || 'cv'}${suffix}.pdf`;
}
