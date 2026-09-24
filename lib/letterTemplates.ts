/**
 * Plantillas del PDF de la carta. Cada plantilla es HTML + CSS que html2pdf convierte a A4
 * (794 × 1123 px). El mismo HTML se usa para la vista previa del editor.
 */

export type TemplateId = 'executive' | 'classic' | 'modern' | 'minimal';
export type FontId = 'sans' | 'serif' | 'elegant';

export interface LetterStyle {
    template: TemplateId;
    accent: string;
    font: FontId;
    showPhoto: boolean;
}

export interface LetterData {
    fullName: string;
    email: string;
    phone: string;
    linkedin: string;
    avatarUrl: string;
    subject: string;
    date: string;
    greeting: string;
    /** HTML de cada párrafo, ya saneado. */
    paragraphs: string[];
    closing: string;
    contactLabel: string;
}

export const TEMPLATES: { id: TemplateId; defaultFont: FontId }[] = [
    { id: 'executive', defaultFont: 'sans' },
    { id: 'classic', defaultFont: 'serif' },
    { id: 'modern', defaultFont: 'sans' },
    { id: 'minimal', defaultFont: 'elegant' },
];

export const ACCENTS = ['#1B3A6B', '#0F766E', '#7F1D1D', '#374151', '#5B21B6', '#B45309'];

export const FONTS: Record<FontId, { body: string; heading: string; google: string }> = {
    sans: {
        body: "'Inter', 'Segoe UI', Roboto, Arial, sans-serif",
        heading: "'Inter', 'Segoe UI', Roboto, Arial, sans-serif",
        google: 'Inter:wght@400;500;600;700',
    },
    serif: {
        body: "'Merriweather', Georgia, 'Times New Roman', serif",
        heading: "'Merriweather', Georgia, 'Times New Roman', serif",
        google: 'Merriweather:wght@400;700',
    },
    elegant: {
        body: "'Lato', 'Segoe UI', Arial, sans-serif",
        heading: "'Playfair Display', Georgia, serif",
        google: 'Lato:wght@400;700&family=Playfair+Display:wght@600;700',
    },
};

export const DEFAULT_STYLE: LetterStyle = { template: 'executive', accent: ACCENTS[0], font: 'sans', showPhoto: true };

const SIGNATURE_FONT = 'Great+Vibes';

/** URL de Google Fonts con las fuentes que necesita un estilo. */
export function fontsHref(font: FontId): string {
    return `https://fonts.googleapis.com/css2?family=${FONTS[font].google}&family=${SIGNATURE_FONT}&display=swap`;
}

/** Familias que hay que esperar antes de capturar el PDF. */
export function fontFamilies(font: FontId): string[] {
    const names = [FONTS[font].body, FONTS[font].heading].map((f) => f.split(',')[0].replace(/'/g, '').trim());
    return Array.from(new Set([...names, 'Great Vibes']));
}

export function escapeHtml(value: string): string {
    return (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Solo deja etiquetas de formato de texto, sin atributos (evita HTML inesperado en el PDF). */
export function sanitizeParagraphHtml(html: string): string {
    if (typeof window === 'undefined') return escapeHtml(html);
    const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'UL', 'OL', 'LI', 'P', 'SPAN']);
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || '');
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const el = node as HTMLElement;
        const inner = Array.from(el.childNodes).map(walk).join('');
        if (!allowed.has(el.tagName)) return inner;
        const tag = el.tagName.toLowerCase();
        return tag === 'br' ? '<br />' : `<${tag}>${inner}</${tag}>`;
    };
    return Array.from(doc.body.firstElementChild?.childNodes || []).map(walk).join('');
}

/** Convierte el HTML del editor en párrafos saneados. */
export function toParagraphs(content: string): string[] {
    if (typeof window === 'undefined') return [];
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const out: string[] = [];
    doc.body.childNodes.forEach((node) => {
        const html = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement).innerHTML : escapeHtml(node.textContent || '');
        const clean = sanitizeParagraphHtml(html).trim();
        if (clean) out.push(clean);
    });
    if (out.length === 0) {
        content.split('\n').map((p) => p.trim()).filter(Boolean).forEach((p) => out.push(escapeHtml(p)));
    }
    return out;
}

function initials(name: string): string {
    return escapeHtml((name || '?').trim().charAt(0).toUpperCase() || '?');
}

function contactLines(d: LetterData): string[] {
    return [d.phone, d.email, d.linkedin.replace(/^https?:\/\//, '')].filter(Boolean).map(escapeHtml);
}

function photo(d: LetterData, s: LetterStyle, cls: string): string {
    if (!s.showPhoto) return '';
    return d.avatarUrl
        ? `<img src="${escapeHtml(d.avatarUrl)}" crossorigin="anonymous" class="${cls}" />`
        : `<div class="${cls} ph">${initials(d.fullName)}</div>`;
}

function body(d: LetterData): string {
    return `
        <div class="greeting">${escapeHtml(d.greeting)}</div>
        ${d.paragraphs.map((p) => `<div class="para">${p}</div>`).join('\n')}
        <div class="signature">
            <div class="closing">${escapeHtml(d.closing)}</div>
            <div class="sig">${escapeHtml(d.fullName)}</div>
        </div>`;
}

function baseCss(s: LetterStyle): string {
    const f = FONTS[s.font];
    return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pdf-page { background: #fff; width: 794px; min-height: 1122px; position: relative; overflow: hidden;
            font-family: ${f.body}; color: #1f2937; font-size: 12px; }
        .pdf-page h1, .pdf-page .name { font-family: ${f.heading}; }
        .greeting { font-size: 11.5px; margin-bottom: 20px; font-weight: 600; }
        .para { font-size: 11.5px; line-height: 1.75; margin-bottom: 16px; text-align: justify; color: #2b2b2b; }
        .para ul, .para ol { padding-left: 18px; }
        .signature { margin-top: 34px; }
        .closing { font-size: 11.5px; margin-bottom: 2px; }
        .sig { font-family: 'Great Vibes', cursive; font-size: 44px; color: ${s.accent}; line-height: 1.15; margin-top: 4px; }
        .pdf-page .ph { display: flex !important; align-items: center; justify-content: center; font-weight: 700; }
    `;
}

function executive(d: LetterData, s: LetterStyle): string {
    return `
    <style>${baseCss(s)}
        .head { background: ${s.accent}; padding: 32px 52px 28px; display: flex; align-items: center; gap: 30px; color: #fff; }
        .avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.25); flex-shrink: 0; background: rgba(255,255,255,0.12); font-size: 38px; color: #fff; }
        .name { font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 12px; }
        .clabel { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.75; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px; margin-bottom: 8px; }
        .citem { font-size: 8.5px; opacity: 0.9; margin-bottom: 3px; }
        .content { padding: 36px 52px 48px; }
        .meta { text-align: right; margin-bottom: 30px; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; }
        .subject { font-size: 11px; font-weight: 700; color: ${s.accent}; margin-bottom: 4px; }
        .date { font-size: 9px; color: #6b7280; }
    </style>
    <div class="pdf-page">
        <div class="head">
            ${photo(d, s, 'avatar')}
            <div>
                <div class="name">${escapeHtml(d.fullName)}</div>
                <div class="clabel">${escapeHtml(d.contactLabel)}</div>
                ${contactLines(d).map((c) => `<div class="citem">▸ ${c}</div>`).join('')}
            </div>
        </div>
        <div class="content">
            <div class="meta"><div class="subject">${escapeHtml(d.subject)}</div><div class="date">${escapeHtml(d.date)}</div></div>
            ${body(d)}
        </div>
    </div>`;
}

function classic(d: LetterData, s: LetterStyle): string {
    return `
    <style>${baseCss(s)}
        .content { padding: 56px 72px 56px; }
        .top { text-align: center; padding-bottom: 18px; border-bottom: 2px solid ${s.accent}; margin-bottom: 8px; }
        .avatar { width: 76px; height: 76px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; display: block; background: #f3f4f6; font-size: 28px; color: ${s.accent}; }
        .name { font-size: 26px; font-weight: 700; color: ${s.accent}; letter-spacing: 1px; margin-bottom: 8px; }
        .contacts { font-size: 9.5px; color: #4b5563; }
        .rule2 { border-bottom: 1px solid ${s.accent}; margin-bottom: 30px; }
        .meta { margin-bottom: 26px; }
        .date { font-size: 10px; color: #6b7280; margin-bottom: 10px; }
        .subject { font-size: 11.5px; font-weight: 700; }
    </style>
    <div class="pdf-page">
        <div class="content">
            <div class="top">
                ${photo(d, s, 'avatar')}
                <div class="name">${escapeHtml(d.fullName)}</div>
                <div class="contacts">${contactLines(d).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</div>
            </div>
            <div class="rule2"></div>
            <div class="meta"><div class="date">${escapeHtml(d.date)}</div><div class="subject">${escapeHtml(d.subject)}</div></div>
            ${body(d)}
        </div>
    </div>`;
}

function modern(d: LetterData, s: LetterStyle): string {
    return `
    <style>${baseCss(s)}
        .wrap { display: flex; min-height: 1122px; }
        .side { width: 230px; background: ${s.accent}; color: #fff; padding: 44px 26px; flex-shrink: 0; }
        .avatar { width: 128px; height: 128px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 22px; border: 4px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.12); font-size: 44px; color: #fff; }
        .name { font-size: 21px; font-weight: 700; line-height: 1.25; margin-bottom: 26px; }
        .clabel { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; opacity: 0.75; margin-bottom: 10px; }
        .citem { font-size: 9px; line-height: 1.5; margin-bottom: 8px; word-break: break-word; opacity: 0.95; }
        .content { flex: 1; padding: 52px 48px; }
        .meta { margin-bottom: 30px; }
        .subject { font-size: 13px; font-weight: 700; color: ${s.accent}; margin-bottom: 4px; }
        .date { font-size: 9.5px; color: #6b7280; }
    </style>
    <div class="pdf-page">
        <div class="wrap">
            <div class="side">
                ${photo(d, s, 'avatar')}
                <div class="name">${escapeHtml(d.fullName)}</div>
                <div class="clabel">${escapeHtml(d.contactLabel)}</div>
                ${contactLines(d).map((c) => `<div class="citem">${c}</div>`).join('')}
            </div>
            <div class="content">
                <div class="meta"><div class="subject">${escapeHtml(d.subject)}</div><div class="date">${escapeHtml(d.date)}</div></div>
                ${body(d)}
            </div>
        </div>
    </div>`;
}

function minimal(d: LetterData, s: LetterStyle): string {
    return `
    <style>${baseCss(s)}
        .content { padding: 64px 76px; }
        .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 40px; }
        .name { font-size: 34px; font-weight: 700; color: #111827; line-height: 1.1; margin-bottom: 10px; }
        .bar { width: 48px; height: 4px; background: ${s.accent}; margin-bottom: 12px; }
        .contacts { font-size: 9.5px; color: #6b7280; line-height: 1.7; }
        .avatar { width: 84px; height: 84px; border-radius: 12px; object-fit: cover; background: #f3f4f6; font-size: 30px; color: ${s.accent}; flex-shrink: 0; }
        .meta { margin-bottom: 28px; }
        .subject { font-size: 11.5px; font-weight: 700; color: ${s.accent}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .date { font-size: 9.5px; color: #9ca3af; }
    </style>
    <div class="pdf-page">
        <div class="content">
            <div class="top">
                <div>
                    <div class="name">${escapeHtml(d.fullName)}</div>
                    <div class="bar"></div>
                    <div class="contacts">${contactLines(d).join('<br />')}</div>
                </div>
                ${photo(d, s, 'avatar')}
            </div>
            <div class="meta"><div class="subject">${escapeHtml(d.subject)}</div><div class="date">${escapeHtml(d.date)}</div></div>
            ${body(d)}
        </div>
    </div>`;
}

const RENDERERS: Record<TemplateId, (d: LetterData, s: LetterStyle) => string> = {
    executive,
    classic,
    modern,
    minimal,
};

export function renderLetterHtml(data: LetterData, style: LetterStyle): string {
    const s = { ...DEFAULT_STYLE, ...style };
    const accent = /^#[0-9a-fA-F]{6}$/.test(s.accent) ? s.accent : DEFAULT_STYLE.accent;
    return (RENDERERS[s.template] || executive)(data, { ...s, accent });
}

/** Etiquetas del PDF en el idioma de la carta (no en el de la interfaz). */
export const LETTER_LABELS: Record<string, { application: string; contact: string; locale: string }> = {
    en: { application: 'Application', contact: 'Contact', locale: 'en-GB' },
    es: { application: 'Candidatura', contact: 'Contacto', locale: 'es-ES' },
    fr: { application: 'Candidature', contact: 'Contact', locale: 'fr-FR' },
    nl: { application: 'Sollicitatie', contact: 'Contact', locale: 'nl-NL' },
};

const STORAGE_KEY = 'covercraft.letterStyle';

export function loadStyle(): LetterStyle {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULT_STYLE, ...JSON.parse(raw) };
    } catch {
        // Almacenamiento no disponible: estilo por defecto.
    }
    return DEFAULT_STYLE;
}

export function saveStyle(style: LetterStyle): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
    } catch {
        // Sin almacenamiento: el estilo solo dura esta sesión.
    }
}
