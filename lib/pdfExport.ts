'use client';

import { fontFamilies, fontsHref, type FontId } from './letterTemplates';

/** Carga las fuentes del estilo en la página y espera a que estén listas (para medir o capturar). */
export async function ensureFonts(font: FontId): Promise<void> {
    if (!document.querySelector(`link[data-letter-font="${font}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontsHref(font);
        link.dataset.letterFont = font;
        document.head.appendChild(link);
        await new Promise((resolve) => { link.onload = resolve; link.onerror = resolve; });
    }
    await Promise.all(fontFamilies(font).flatMap((f) => [
        document.fonts.load(`400 16px "${f}"`),
        document.fonts.load(`700 16px "${f}"`),
    ])).catch(() => undefined);
}

export async function waitForImages(root: HTMLElement): Promise<void> {
    await Promise.all(Array.from(root.querySelectorAll('img')).map((img) => (img.complete ? Promise.resolve() : new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
    }))));
}

/** Inserta HTML fuera de la pantalla (794 px de ancho) y devuelve el contenedor. */
export function mountOffscreen(html: string): HTMLDivElement {
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:absolute;top:0;left:-10000px;width:794px;z-index:-1;';
    tmp.setAttribute('aria-hidden', 'true');
    tmp.innerHTML = html;
    document.body.appendChild(tmp);
    return tmp;
}

/** Convierte cada `.pdf-page` del HTML en una página A4 del PDF y lo descarga. */
export async function downloadPagesPdf(html: string, font: FontId, filename: string): Promise<void> {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
    await ensureFonts(font);
    const tmp = mountOffscreen(html);
    try {
        await waitForImages(tmp);
        await new Promise((r) => setTimeout(r, 200));
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pages = Array.from(tmp.querySelectorAll('.pdf-page')) as HTMLElement[];
        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
            if (i > 0) pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
        }
        pdf.save(filename);
    } finally {
        document.body.removeChild(tmp);
    }
}
