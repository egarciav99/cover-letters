/**
 * Plantillas del CV: las mismas cuatro de la carta (Ejecutiva, Clásica, Moderna, Minimalista),
 * con el mismo color, tipo de letra y foto, para que carta y CV vayan a juego.
 *
 * Un CV puede ocupar varias páginas. El contenido principal se genera en bloques (una sección
 * corta o una entrada de experiencia/formación); el editor mide cada bloque y los reparte en
 * páginas A4 (794 × 1123 px) sin partir ninguno. La vista previa y el PDF usan el mismo HTML.
 */

import { FONTS, escapeHtml, type LetterStyle } from './letterTemplates';
import { RESUME_LABELS, bulletLines, dateRange, type ResumeData, type ResumeLanguage } from './resume';

export const PAGE_W = 794;
export const PAGE_H = 1123;
/** Margen superior del contenido en las páginas 2 y siguientes. */
const CONT_TOP = 52;
/** Margen inferior de todas las páginas (ahí va el pie). */
const BOTTOM = 52;

export interface ResumeRenderOptions {
    language: ResumeLanguage;
    avatarUrl: string;
    /** Texto pequeño al pie de cada página (plan gratis). */
    footer?: string;
}

interface Parts {
    /** Bloques del cuerpo principal, en orden. */
    blocks: string[];
    /** Barra lateral (solo plantilla Moderna). */
    side: string;
}

const e = escapeHtml;

function clean(url: string) {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function contactItems(d: ResumeData): string[] {
    const p = d.personal;
    return [p.email, p.phone, p.location, clean(p.linkedin), clean(p.website)].filter((v) => v.trim()).map(e);
}

function initials(name: string): string {
    return e((name || '?').trim().charAt(0).toUpperCase() || '?');
}

function photo(d: ResumeData, s: LetterStyle, o: ResumeRenderOptions, cls: string): string {
    if (!s.showPhoto) return '';
    return o.avatarUrl
        ? `<img src="${e(o.avatarUrl)}" crossorigin="anonymous" class="${cls}" />`
        : `<div class="${cls} ph">${initials(d.personal.fullName)}</div>`;
}

function paragraphs(text: string): string {
    return text.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => `<p>${e(l)}</p>`).join('');
}

function item(title: string, sub: string, meta: string, body: string): string {
    return `<div class="cv-item">
        <div class="cv-item-head"><div><div class="cv-item-title">${title}</div>${sub ? `<div class="cv-item-sub">${sub}</div>` : ''}</div>
        ${meta ? `<div class="cv-item-meta">${meta}</div>` : ''}</div>
        ${body}
    </div>`;
}

function heading(title: string): string {
    return `<div class="cv-h">${e(title)}</div>`;
}

/**
 * Secciones del CV. Cada entrada de experiencia o formación es un bloque; el título de la
 * sección va pegado a su primera entrada para que nunca quede solo al final de una página.
 */
function buildParts(d: ResumeData, s: LetterStyle, lang: ResumeLanguage): Parts {
    const L = RESUME_LABELS[lang] || RESUME_LABELS.en;
    const blocks: string[] = [];
    const sideSections: string[] = [];
    const inSide = s.template === 'modern';

    const section = (title: string, items: string[]) => {
        if (items.length === 0) return;
        items.forEach((html, i) => blocks.push(`<div class="cv-block">${i === 0 ? heading(title) : ''}${html}</div>`));
    };

    if (d.summary.trim()) section(L.summary, [`<div class="cv-text">${paragraphs(d.summary)}</div>`]);

    section(L.experience, d.experience.map((x) => {
        const bullets = bulletLines(x.bullets);
        return item(
            e(x.role),
            [x.company, x.location].filter((v) => v.trim()).map(e).join(' · '),
            e(dateRange(x.start, x.end, x.current, L.present)),
            bullets.length ? `<ul class="cv-bullets">${bullets.map((b) => `<li>${e(b)}</li>`).join('')}</ul>` : '',
        );
    }));

    section(L.education, d.education.map((x) => item(
        e(x.degree),
        [x.school, x.location].filter((v) => v.trim()).map(e).join(' · '),
        e(dateRange(x.start, x.end, false, L.present)),
        x.details.trim() ? `<div class="cv-text">${paragraphs(x.details)}</div>` : '',
    )));

    const skills = d.skills.length ? `<div class="cv-tags">${d.skills.map((k) => `<span>${e(k)}</span>`).join('')}</div>` : '';
    const langs = d.languages.filter((l) => l.name.trim());
    const languages = langs.length
        ? `<div class="cv-langs">${langs.map((l) => `<div><strong>${e(l.name)}</strong>${l.level ? ` <span>${e(l.level)}</span>` : ''}</div>`).join('')}</div>`
        : '';

    if (inSide) {
        if (skills) sideSections.push(`<div class="side-h">${e(L.skills)}</div>${skills}`);
        if (languages) sideSections.push(`<div class="side-h">${e(L.languages)}</div>${languages}`);
    } else {
        if (skills) section(L.skills, [skills]);
        if (languages) section(L.languages, [languages]);
    }

    const certs = d.certifications.filter((c) => c.name.trim());
    if (certs.length) section(L.certifications, [
        `<ul class="cv-bullets">${certs.map((c) => `<li><strong>${e(c.name)}</strong>${[c.issuer, c.year].filter((v) => v.trim()).map((v) => ` · ${e(v)}`).join('')}</li>`).join('')}</ul>`,
    ]);

    return { blocks, side: sideSections.join('') };
}

function css(s: LetterStyle): string {
    const f = FONTS[s.font];
    const a = s.accent;
    const base = `
        .cvdoc, .cvdoc * { box-sizing: border-box; margin: 0; padding: 0; }
        .cvdoc .pdf-page { background: #fff; width: ${PAGE_W}px; height: ${PAGE_H - 1}px; position: relative; overflow: hidden;
            font-family: ${f.body}; color: #1f2937; font-size: 10.5px; line-height: 1.5; }
        .cvdoc.measure .pdf-page { height: auto; min-height: ${PAGE_H - 1}px; }
        .cvdoc .name { font-family: ${f.heading}; }
        .cvdoc .main { padding-bottom: ${BOTTOM}px; }
        .cvdoc .cont { padding-top: ${CONT_TOP}px; }
        .cvdoc .cv-block { padding-bottom: 12px; }
        .cvdoc .cv-h { font-family: ${f.heading}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px;
            color: ${a}; padding-bottom: 5px; margin-bottom: 9px; border-bottom: 1px solid #e5e7eb; }
        .cvdoc .cv-text p { margin-bottom: 5px; text-align: justify; color: #374151; }
        .cvdoc .cv-item-head { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; }
        .cvdoc .cv-item-title { font-weight: 700; font-size: 11px; color: #111827; }
        .cvdoc .cv-item-sub { font-size: 10px; color: ${a}; font-weight: 600; }
        .cvdoc .cv-item-meta { font-size: 9px; color: #6b7280; white-space: nowrap; flex-shrink: 0; }
        .cvdoc .cv-item .cv-text, .cvdoc .cv-item .cv-bullets { margin-top: 5px; }
        .cvdoc .cv-bullets { padding-left: 15px; color: #374151; }
        .cvdoc .cv-bullets li { margin-bottom: 3px; }
        .cvdoc .cv-bullets li::marker { color: ${a}; }
        .cvdoc .cv-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .cvdoc .cv-tags span { font-size: 9.5px; padding: 3px 9px; border-radius: 10px; background: ${a}14; color: #1f2937; border: 1px solid ${a}33; }
        .cvdoc .cv-langs { display: flex; flex-wrap: wrap; gap: 4px 22px; }
        .cvdoc .cv-langs span { color: #6b7280; }
        .cvdoc .ph { display: flex !important; align-items: center; justify-content: center; font-weight: 700; }
        .cvdoc .foot { position: absolute; left: 0; right: 0; bottom: 18px; text-align: center; font-size: 8px; color: #9ca3af; letter-spacing: 0.3px; }
        .cvdoc .pnum { position: absolute; right: 30px; bottom: 18px; font-size: 8px; color: #9ca3af; }
    `;

    if (s.template === 'executive') return base + `
        .cvdoc .head { background: ${a}; padding: 30px 52px; display: flex; align-items: center; gap: 28px; color: #fff; }
        .cvdoc .avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.25); flex-shrink: 0; background: rgba(255,255,255,0.12); font-size: 36px; color: #fff; }
        .cvdoc .name { font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; }
        .cvdoc .headline { font-size: 11.5px; opacity: 0.9; margin: 3px 0 10px; }
        .cvdoc .contacts { font-size: 8.5px; opacity: 0.9; display: flex; flex-wrap: wrap; gap: 3px 16px; }
        .cvdoc .main { padding-left: 52px; padding-right: 52px; }
        .cvdoc .first { padding-top: 26px; }
    `;
    if (s.template === 'classic') return base + `
        .cvdoc .main { padding-left: 64px; padding-right: 64px; }
        .cvdoc .top { text-align: center; padding: 44px 64px 14px; }
        .cvdoc .top-rule { margin: 0 64px 22px; border-top: 2px solid ${a}; border-bottom: 1px solid ${a}; height: 4px; }
        .cvdoc .avatar { width: 76px; height: 76px; border-radius: 50%; object-fit: cover; margin: 0 auto 10px; display: block; background: #f3f4f6; font-size: 28px; color: ${a}; }
        .cvdoc .name { font-size: 26px; font-weight: 700; color: ${a}; letter-spacing: 1px; }
        .cvdoc .headline { font-size: 11.5px; color: #374151; margin: 4px 0 8px; font-style: italic; }
        .cvdoc .contacts { font-size: 9px; color: #4b5563; }
        .cvdoc .cv-h { text-align: center; border-bottom: none; letter-spacing: 2.5px; }
        .cvdoc .cv-h::after { content: ''; display: block; width: 36px; margin: 5px auto 0; border-bottom: 1px solid ${a}; }
    `;
    if (s.template === 'modern') return base + `
        .cvdoc .wrap { display: flex; height: 100%; }
        .cvdoc.measure .wrap { min-height: ${PAGE_H - 1}px; }
        .cvdoc .side { width: 230px; background: ${a}; color: #fff; padding: 44px 24px; flex-shrink: 0; overflow: hidden; }
        .cvdoc .avatar { width: 124px; height: 124px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 20px; border: 4px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.12); font-size: 44px; color: #fff; }
        .cvdoc .name { font-size: 21px; font-weight: 700; line-height: 1.25; }
        .cvdoc .headline { font-size: 11px; opacity: 0.9; margin: 4px 0 22px; }
        .cvdoc .side-h { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; opacity: 0.75; margin: 18px 0 8px; }
        .cvdoc .citem { font-size: 9px; margin-bottom: 6px; word-break: break-word; opacity: 0.95; }
        .cvdoc .side .cv-tags span { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.25); color: #fff; }
        .cvdoc .side .cv-langs { flex-direction: column; gap: 4px; font-size: 9.5px; }
        .cvdoc .side .cv-langs span { color: rgba(255,255,255,0.8); }
        .cvdoc .main { flex: 1; padding-left: 40px; padding-right: 40px; min-width: 0; }
        .cvdoc .first { padding-top: 48px; }
    `;
    return base + `
        .cvdoc .main { padding-left: 72px; padding-right: 72px; }
        .cvdoc .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding: 58px 72px 30px; }
        .cvdoc .name { font-size: 32px; font-weight: 700; color: #111827; line-height: 1.1; }
        .cvdoc .headline { font-size: 12px; color: ${a}; margin: 6px 0 10px; font-weight: 600; }
        .cvdoc .bar { width: 48px; height: 4px; background: ${a}; margin-bottom: 12px; }
        .cvdoc .contacts { font-size: 9px; color: #6b7280; display: flex; flex-wrap: wrap; gap: 3px 16px; }
        .cvdoc .avatar { width: 84px; height: 84px; border-radius: 12px; object-fit: cover; background: #f3f4f6; font-size: 30px; color: ${a}; flex-shrink: 0; }
        .cvdoc .cv-h { border-bottom: none; font-size: 10px; letter-spacing: 2px; }
        .cvdoc .cv-h::before { content: ''; display: inline-block; width: 14px; height: 2px; background: ${a}; vertical-align: middle; margin-right: 8px; }
    `;
}

/** Cabecera de la primera página (y barra lateral en la plantilla Moderna). */
function firstPage(d: ResumeData, s: LetterStyle, o: ResumeRenderOptions, side: string, main: string): string {
    const p = d.personal;
    const L = RESUME_LABELS[o.language] || RESUME_LABELS.en;
    const name = `<div class="name">${e(p.fullName)}</div>`;
    const headline = p.headline.trim() ? `<div class="headline">${e(p.headline)}</div>` : '';
    const contacts = contactItems(d);

    if (s.template === 'executive') return `
        <div class="head">${photo(d, s, o, 'avatar')}<div>${name}${headline}
            <div class="contacts">${contacts.map((c) => `<span>▸ ${c}</span>`).join('')}</div></div></div>
        <div class="main first">${main}</div>`;
    if (s.template === 'classic') return `
        <div class="top">${photo(d, s, o, 'avatar')}${name}${headline}
            <div class="contacts">${contacts.join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</div></div>
        <div class="top-rule"></div>
        <div class="main">${main}</div>`;
    if (s.template === 'modern') return `
        <div class="wrap">
            <div class="side">${photo(d, s, o, 'avatar')}${name}${headline}
                ${contacts.length ? `<div class="side-h">${e(L.contact)}</div>${contacts.map((c) => `<div class="citem">${c}</div>`).join('')}` : ''}
                ${side}
            </div>
            <div class="main first">${main}</div>
        </div>`;
    return `
        <div class="top"><div>${name}${headline}<div class="bar"></div>
            <div class="contacts">${contacts.map((c) => `<span>${c}</span>`).join('')}</div></div>
            ${photo(d, s, o, 'avatar')}</div>
        <div class="main">${main}</div>`;
}

function nextPage(s: LetterStyle, main: string): string {
    if (s.template === 'modern') return `<div class="wrap"><div class="side"></div><div class="main cont">${main}</div></div>`;
    return `<div class="main cont">${main}</div>`;
}

function footer(o: ResumeRenderOptions, index: number, total: number): string {
    return `${o.footer ? `<div class="foot">${e(o.footer)}</div>` : ''}${total > 1 ? `<div class="pnum">${index + 1}/${total}</div>` : ''}`;
}

/** HTML con todo el contenido en una sola página alta, para medir los bloques. */
export function renderResumeMeasureHtml(d: ResumeData, s: LetterStyle, o: ResumeRenderOptions): string {
    const { blocks, side } = buildParts(d, s, o.language);
    return `<div class="cvdoc measure"><style>${css(s)}</style>
        <div class="pdf-page">${firstPage(d, s, o, side, blocks.join(''))}</div></div>`;
}

/** HTML final: una `.pdf-page` por página, con los bloques repartidos según `pages`. */
export function renderResumeHtml(d: ResumeData, s: LetterStyle, o: ResumeRenderOptions, pages: number[][]): string {
    const { blocks, side } = buildParts(d, s, o.language);
    const groups = pages.length ? pages : [blocks.map((_, i) => i)];
    const html = groups.map((idx, i) => {
        const main = idx.map((b) => blocks[b] || '').join('');
        return `<div class="pdf-page">${i === 0 ? firstPage(d, s, o, side, main) : nextPage(s, main)}${footer(o, i, groups.length)}</div>`;
    }).join('');
    return `<div class="cvdoc"><style>${css(s)}</style>${html}</div>`;
}

/**
 * Reparte los bloques en páginas a partir de la versión de medida ya insertada en el DOM.
 * Un bloque más alto que una página entera se coloca solo en su página.
 */
export function paginateMeasured(root: HTMLElement): number[][] {
    const page = root.querySelector('.pdf-page') as HTMLElement | null;
    if (!page) return [];
    const top0 = page.getBoundingClientRect().top;
    const blocks = Array.from(page.querySelectorAll('.main .cv-block')) as HTMLElement[];
    const pages: number[][] = [[]];
    let limit = PAGE_H - BOTTOM; // Fondo útil de la página actual, en coordenadas de la versión de medida.
    blocks.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const top = r.top - top0;
        const bottom = top + el.offsetHeight;
        const current = pages[pages.length - 1];
        if (bottom > limit && current.length > 0) {
            pages.push([i]);
            limit = top - CONT_TOP + PAGE_H - BOTTOM;
        } else {
            current.push(i);
        }
    });
    return pages;
}
