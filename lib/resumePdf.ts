/**
 * PDF del CV con texto real (no imagen), en una sola columna y sin adornos.
 * Es la versión que leen bien los filtros ATS y la que recibe la IA para escribir las cartas.
 * Solo se usa en el servidor.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { RESUME_LABELS, bulletLines, dateRange, type ResumeData, type ResumeLanguage } from './resume';

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 50;
const TEXT = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.4, 0.42, 0.46);

function hexToRgb(hex: string) {
    const n = parseInt(hex.slice(1), 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export async function renderResumeTextPdf(d: ResumeData, lang: ResumeLanguage, accentHex = '#1B3A6B'): Promise<Uint8Array> {
    const L = RESUME_LABELS[lang] || RESUME_LABELS.en;
    const accent = /^#[0-9a-fA-F]{6}$/.test(accentHex) ? hexToRgb(accentHex) : hexToRgb('#1B3A6B');
    const doc = await PDFDocument.create();
    doc.setTitle(d.personal.fullName ? `CV · ${d.personal.fullName}` : 'CV');
    doc.setAuthor(d.personal.fullName || '');
    doc.setCreator('CoverCraft');
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Las fuentes estándar solo cubren WinAnsi: lo que no se pueda codificar se sustituye.
    const okChars = new Map<string, boolean>();
    const safe = (text: string): string =>
        Array.from(text.normalize('NFC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\t/g, ' '))
            .map((ch) => {
                if (!okChars.has(ch)) {
                    try { regular.encodeText(ch); okChars.set(ch, true); } catch { okChars.set(ch, false); }
                }
                if (okChars.get(ch)) return ch;
                // Emojis y símbolos se quitan; otras letras (p. ej. chino) quedan como "?".
                if (/[\p{Extended_Pictographic}‍️]/u.test(ch)) return '';
                const plain = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return plain && plain !== ch && okChars.get(plain) !== false ? plain : '?';
            })
            .join('');

    let page: PDFPage = doc.addPage([A4.w, A4.h]);
    let y = A4.h - MARGIN;
    const width = A4.w - MARGIN * 2;

    const ensure = (h: number) => {
        if (y - h < MARGIN) {
            page = doc.addPage([A4.w, A4.h]);
            y = A4.h - MARGIN;
        }
    };

    const wrap = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
        const lines: string[] = [];
        for (const para of safe(text).split('\n')) {
            let line = '';
            for (const word of para.split(/\s+/).filter(Boolean)) {
                const next = line ? `${line} ${word}` : word;
                if (font.widthOfTextAtSize(next, size) <= maxWidth) {
                    line = next;
                } else {
                    if (line) lines.push(line);
                    // Palabra más larga que la línea (p. ej. una URL): se corta a mano.
                    let rest = word;
                    while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
                        let cut = rest.length - 1;
                        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
                        lines.push(rest.slice(0, cut));
                        rest = rest.slice(cut);
                    }
                    line = rest;
                }
            }
            lines.push(line);
        }
        return lines;
    };

    const write = (text: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
        const font = opts.font || regular;
        const size = opts.size || 10;
        const indent = opts.indent || 0;
        const lh = size * 1.35;
        for (const line of wrap(text, font, size, width - indent)) {
            ensure(lh);
            y -= lh;
            if (line) page.drawText(line, { x: MARGIN + indent, y: y + (lh - size) / 2, size, font, color: opts.color || TEXT });
        }
        y -= opts.gap ?? 0;
    };

    const bullet = (text: string) => {
        const size = 10;
        const lh = size * 1.35;
        const lines = wrap(text, regular, size, width - 12);
        lines.forEach((line, i) => {
            ensure(lh);
            y -= lh;
            if (i === 0) page.drawText('-', { x: MARGIN + 2, y: y + (lh - size) / 2, size, font: regular, color: accent });
            page.drawText(line, { x: MARGIN + 12, y: y + (lh - size) / 2, size, font: regular, color: TEXT });
        });
    };

    const heading = (title: string) => {
        ensure(40);
        y -= 14;
        write(title.toUpperCase(), { font: bold, size: 11, color: accent });
        y -= 3;
        page.drawLine({ start: { x: MARGIN, y }, end: { x: A4.w - MARGIN, y }, thickness: 0.8, color: accent });
        y -= 6;
    };

    const p = d.personal;
    write(p.fullName || ' ', { font: bold, size: 20 });
    if (p.headline) write(p.headline, { size: 12, color: accent, gap: 2 });
    const contact = [p.email, p.phone, p.location, p.linkedin.replace(/^https?:\/\//, ''), p.website.replace(/^https?:\/\//, '')].filter(Boolean);
    if (contact.length) write(contact.join('  |  '), { size: 9, color: MUTED });

    if (d.summary.trim()) {
        heading(L.summary);
        write(d.summary.trim());
    }

    if (d.experience.length) {
        heading(L.experience);
        d.experience.forEach((e, i) => {
            ensure(44);
            if (i > 0) y -= 8;
            write([e.role, e.company].filter(Boolean).join(' · '), { font: bold, size: 10.5 });
            const meta = [dateRange(e.start, e.end, e.current, L.present), e.location].filter(Boolean).join('  |  ');
            if (meta) write(meta, { size: 9, color: MUTED, gap: 2 });
            bulletLines(e.bullets).forEach(bullet);
        });
    }

    if (d.education.length) {
        heading(L.education);
        d.education.forEach((e, i) => {
            ensure(36);
            if (i > 0) y -= 8;
            write([e.degree, e.school].filter(Boolean).join(' · '), { font: bold, size: 10.5 });
            const meta = [dateRange(e.start, e.end, false, L.present), e.location].filter(Boolean).join('  |  ');
            if (meta) write(meta, { size: 9, color: MUTED, gap: 2 });
            if (e.details.trim()) write(e.details.trim());
        });
    }

    if (d.skills.length) {
        heading(L.skills);
        write(d.skills.join(', '));
    }

    const langs = d.languages.filter((l) => l.name.trim());
    if (langs.length) {
        heading(L.languages);
        write(langs.map((l) => (l.level ? `${l.name}: ${l.level}` : l.name)).join('  |  '));
    }

    const certs = d.certifications.filter((c) => c.name.trim());
    if (certs.length) {
        heading(L.certifications);
        certs.forEach((c) => bullet([c.name, c.issuer, c.year].filter(Boolean).join(' · ')));
    }

    return doc.save();
}
