/**
 * Modelo del CV creado en CoverCraft. Lo usan el editor (cliente), la API (servidor)
 * y el PDF de texto que recibe la IA, así que no depende del navegador.
 */

import { DEFAULT_STYLE, type LetterStyle } from './letterTemplates';

export const RESUME_LANGUAGES = ['en', 'es', 'fr', 'nl'] as const;
export type ResumeLanguage = (typeof RESUME_LANGUAGES)[number];

export interface ResumePersonal {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
}

export interface ResumeExperience {
    id: string;
    role: string;
    company: string;
    location: string;
    start: string;
    end: string;
    current: boolean;
    /** Un logro por línea. */
    bullets: string;
}

export interface ResumeEducation {
    id: string;
    degree: string;
    school: string;
    location: string;
    start: string;
    end: string;
    details: string;
}

export interface ResumeLanguageSkill {
    id: string;
    name: string;
    level: string;
}

export interface ResumeCertification {
    id: string;
    name: string;
    issuer: string;
    year: string;
}

/** Sección libre (voluntariado, proyectos, publicaciones…): un elemento por línea. */
export interface ResumeCustomSection {
    id: string;
    title: string;
    content: string;
}

export interface ResumeData {
    personal: ResumePersonal;
    summary: string;
    experience: ResumeExperience[];
    education: ResumeEducation[];
    skills: string[];
    languages: ResumeLanguageSkill[];
    certifications: ResumeCertification[];
    custom: ResumeCustomSection[];
}

export interface Resume {
    id: string;
    title: string;
    language: ResumeLanguage;
    data: ResumeData;
    style: ResumeStyle;
    updated_at: string;
}

export const EMPTY_RESUME: ResumeData = {
    personal: { fullName: '', headline: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    custom: [],
};

// Límites: protegen la base de datos y el coste de la IA cuando el CV se usa para las cartas.
const SHORT = 150;
const MEDIUM = 300;
const LONG = 3000;
const MAX_ITEMS = 15;
const MAX_SKILLS = 40;
const MAX_CUSTOM = 8;

export function newId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function str(value: unknown, max: number): string {
    return typeof value === 'string' ? value.slice(0, max) : '';
}

function list<T>(value: unknown, max: number, map: (item: Record<string, unknown>) => T): T[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .slice(0, max)
        .map(map);
}

/** Normaliza lo que llegue (del cliente o de la base de datos) al formato esperado. */
export function sanitizeResumeData(input: unknown): ResumeData {
    const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const p = (raw.personal && typeof raw.personal === 'object' ? raw.personal : {}) as Record<string, unknown>;
    const id = (v: unknown) => str(v, 20) || newId();
    return {
        personal: {
            fullName: str(p.fullName, SHORT),
            headline: str(p.headline, SHORT),
            email: str(p.email, SHORT),
            phone: str(p.phone, 50),
            location: str(p.location, SHORT),
            linkedin: str(p.linkedin, MEDIUM),
            website: str(p.website, MEDIUM),
        },
        summary: str(raw.summary, LONG),
        experience: list(raw.experience, MAX_ITEMS, (e) => ({
            id: id(e.id),
            role: str(e.role, SHORT),
            company: str(e.company, SHORT),
            location: str(e.location, SHORT),
            start: str(e.start, 30),
            end: str(e.end, 30),
            current: e.current === true,
            bullets: str(e.bullets, LONG),
        })),
        education: list(raw.education, MAX_ITEMS, (e) => ({
            id: id(e.id),
            degree: str(e.degree, SHORT),
            school: str(e.school, SHORT),
            location: str(e.location, SHORT),
            start: str(e.start, 30),
            end: str(e.end, 30),
            details: str(e.details, LONG),
        })),
        skills: Array.isArray(raw.skills)
            ? raw.skills.map((s) => str(s, 60).trim()).filter(Boolean).slice(0, MAX_SKILLS)
            : [],
        languages: list(raw.languages, MAX_ITEMS, (l) => ({ id: id(l.id), name: str(l.name, 60), level: str(l.level, 60) })),
        certifications: list(raw.certifications, MAX_ITEMS, (c) => ({
            id: id(c.id),
            name: str(c.name, SHORT),
            issuer: str(c.issuer, SHORT),
            year: str(c.year, 30),
        })),
        custom: list(raw.custom, MAX_CUSTOM, (c) => ({ id: id(c.id), title: str(c.title, 80), content: str(c.content, LONG) })),
    };
}

/** Diseño del CV: el de las cartas más la opción de ajustarlo a una página. */
export type ResumeStyle = LetterStyle & { fitOnePage: boolean };

export function sanitizeResumeStyle(input: unknown): ResumeStyle {
    const s = (input && typeof input === 'object' ? input : {}) as Partial<ResumeStyle>;
    return {
        fitOnePage: s.fitOnePage !== false,
        template: ['executive', 'classic', 'modern', 'minimal'].includes(s.template as string) ? s.template! : DEFAULT_STYLE.template,
        accent: typeof s.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.accent) ? s.accent : DEFAULT_STYLE.accent,
        font: ['sans', 'serif', 'elegant'].includes(s.font as string) ? s.font! : DEFAULT_STYLE.font,
        showPhoto: s.showPhoto !== false,
    };
}

export function isResumeLanguage(value: unknown): value is ResumeLanguage {
    return RESUME_LANGUAGES.includes(value as ResumeLanguage);
}

/** Títulos de sección en el idioma del CV (no en el de la interfaz). */
export const RESUME_LABELS: Record<ResumeLanguage, {
    summary: string; experience: string; education: string; skills: string;
    languages: string; certifications: string; contact: string; present: string;
}> = {
    en: { summary: 'Profile', experience: 'Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', contact: 'Contact', present: 'Present' },
    es: { summary: 'Perfil', experience: 'Experiencia', education: 'Formación', skills: 'Habilidades', languages: 'Idiomas', certifications: 'Certificaciones', contact: 'Contacto', present: 'Actualidad' },
    fr: { summary: 'Profil', experience: 'Expérience', education: 'Formation', skills: 'Compétences', languages: 'Langues', certifications: 'Certifications', contact: 'Contact', present: 'Aujourd’hui' },
    nl: { summary: 'Profiel', experience: 'Werkervaring', education: 'Opleiding', skills: 'Vaardigheden', languages: 'Talen', certifications: 'Certificaten', contact: 'Contact', present: 'Heden' },
};

export function bulletLines(text: string): string[] {
    return text.split('\n').map((l) => l.replace(/^\s*[-•·*▸]\s*/, '').trim()).filter(Boolean);
}

export function dateRange(start: string, end: string, current: boolean, present: string): string {
    const to = current ? present : end.trim();
    return [start.trim(), to].filter(Boolean).join(' – ');
}

/** ¿Tiene contenido suficiente para usarse en una carta? */
export function isResumeUsable(d: ResumeData): boolean {
    return !!d.personal.fullName.trim() && (d.experience.length > 0 || d.education.length > 0 || d.summary.trim().length > 0);
}

/** Texto plano del CV: lo que lee la IA y la base del PDF para filtros ATS. */
export function resumeToText(d: ResumeData, lang: ResumeLanguage): string {
    const L = RESUME_LABELS[lang] || RESUME_LABELS.en;
    const out: string[] = [];
    const p = d.personal;
    out.push(p.fullName);
    if (p.headline) out.push(p.headline);
    const contact = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).join(' | ');
    if (contact) out.push(contact);

    const section = (title: string, lines: string[]) => {
        if (lines.length === 0) return;
        out.push('', title.toUpperCase(), ...lines);
    };
    section(L.summary, d.summary.trim() ? [d.summary.trim()] : []);
    section(L.experience, d.experience.flatMap((e) => [
        '',
        [e.role, e.company].filter(Boolean).join(' · '),
        [dateRange(e.start, e.end, e.current, L.present), e.location].filter(Boolean).join(' | '),
        ...bulletLines(e.bullets).map((b) => `- ${b}`),
    ].filter((l, i) => i === 0 || l)));
    section(L.education, d.education.flatMap((e) => [
        '',
        [e.degree, e.school].filter(Boolean).join(' · '),
        [dateRange(e.start, e.end, false, L.present), e.location].filter(Boolean).join(' | '),
        e.details.trim(),
    ].filter((l, i) => i === 0 || l)));
    section(L.skills, d.skills.length ? [d.skills.join(', ')] : []);
    section(L.languages, d.languages.filter((l) => l.name).map((l) => (l.level ? `${l.name}: ${l.level}` : l.name)));
    section(L.certifications, d.certifications.filter((c) => c.name).map((c) => [c.name, c.issuer, c.year].filter(Boolean).join(' · ')));
    customSections(d).forEach((c) => section(c.title, c.lines.length > 1 ? c.lines.map((l) => `- ${l}`) : c.lines));
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Secciones libres con título y contenido, ya partidas en líneas. */
export function customSections(d: ResumeData): { title: string; lines: string[] }[] {
    return (d.custom || [])
        .map((c) => ({ title: c.title.trim(), lines: bulletLines(c.content) }))
        .filter((c) => c.title && c.lines.length);
}
