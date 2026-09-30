/**
 * Asistente del CV (plan Pro): revisión con sugerencias y mejora de un texto concreto.
 * Aquí van los tipos, la limpieza de la respuesta de la IA y los consejos rápidos sin IA,
 * que se usan tanto en el servidor como en el editor.
 */

import { bulletLines, type ResumeData } from './resume';
import { noDashes } from './resumeTailor';

export const ASSIST_SECTIONS = ['personal', 'summary', 'experience', 'education', 'skills', 'languages', 'certifications', 'general'] as const;
export type AssistSection = (typeof ASSIST_SECTIONS)[number];

/** Texto que una sugerencia puede reescribir directamente. */
export const ASSIST_TARGETS = ['headline', 'summary', 'bullets', 'none'] as const;
export type AssistTarget = (typeof ASSIST_TARGETS)[number];

/** Campos que se pueden mejorar con el botón de cada campo. */
export type ImproveField = 'headline' | 'summary' | 'bullets';

export interface AssistSuggestion {
    section: AssistSection;
    /** Experiencia a la que se refiere (solo con target "bullets"). */
    itemId: string | null;
    message: string;
    target: AssistTarget;
    /** Texto propuesto para aplicar (vacío si la sugerencia es solo un consejo). */
    proposed: string;
}

export interface AssistReview {
    score: number;
    suggestions: AssistSuggestion[];
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? noDashes(v).trim().slice(0, max) : '');

/** Texto propuesto para un campo: una línea por logro y sin viñetas en "bullets". */
export function cleanProposed(field: ImproveField, text: string): string {
    if (field === 'bullets') return bulletLines(text).join('\n');
    return field === 'headline' ? text.replace(/\s+/g, ' ').trim() : text.trim();
}

/** Limpia la revisión de la IA: secciones válidas, experiencias que existen y sin propuestas iguales al original. */
export function sanitizeReview(raw: unknown, data: ResumeData): AssistReview {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const ids = new Set(data.experience.map((e) => e.id));
    const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    const suggestions: AssistSuggestion[] = [];
    for (const item of Array.isArray(r.suggestions) ? r.suggestions.slice(0, 12) : []) {
        if (!item || typeof item !== 'object') continue;
        const s = item as Record<string, unknown>;
        const message = str(s.message, 400);
        if (!message) continue;
        const section = ASSIST_SECTIONS.includes(s.section as AssistSection) ? (s.section as AssistSection) : 'general';
        let target = ASSIST_TARGETS.includes(s.target as AssistTarget) ? (s.target as AssistTarget) : 'none';
        const itemId = typeof s.item_id === 'string' && ids.has(s.item_id) ? s.item_id : null;
        if (target === 'bullets' && !itemId) target = 'none';
        let proposed = target === 'none' ? '' : cleanProposed(target, str(s.proposed, 3000));
        const current = target === 'headline' ? data.personal.headline
            : target === 'summary' ? data.summary
            : target === 'bullets' ? data.experience.find((e) => e.id === itemId)?.bullets ?? ''
            : '';
        if (!proposed || proposed === cleanProposed(target === 'none' ? 'summary' : target, current)) {
            target = 'none';
            proposed = '';
        }
        suggestions.push({ section, itemId: target === 'bullets' ? itemId : null, message, target, proposed });
    }
    return { score, suggestions: suggestions.slice(0, 8) };
}

/** Clave de i18n de un consejo rápido (resume.hint_*). */
export type HintKey =
    | 'hint_headline_empty' | 'hint_summary_empty' | 'hint_summary_long'
    | 'hint_experience_empty' | 'hint_bullets_empty' | 'hint_bullets_numbers' | 'hint_bullets_few'
    | 'hint_skills_few' | 'hint_languages_empty' | 'hint_headline_many' | 'hint_languages_level';

export interface QuickHints {
    headline?: HintKey;
    summary?: HintKey;
    experience?: HintKey;
    /** Por id de experiencia. */
    items: Record<string, HintKey>;
    skills?: HintKey;
    languages?: HintKey;
}

/** Consejos rápidos mientras se rellena el CV. No usan IA: reglas simples sobre lo escrito. */
export function quickHints(data: ResumeData): QuickHints {
    const hints: QuickHints = { items: {} };
    const headline = data.personal.headline.trim();
    if (!headline) hints.headline = 'hint_headline_empty';
    // Varios puestos a la vez ("Ingeniero · Desarrollador · Analista"): mejor uno por CV.
    else if (headline.split(/\s[·|/]\s|\s-\s/).filter((p) => p.trim()).length >= 3) hints.headline = 'hint_headline_many';
    const summary = data.summary.trim();
    if (!summary) hints.summary = 'hint_summary_empty';
    else if (summary.length > 700) hints.summary = 'hint_summary_long';
    if (!data.experience.length) hints.experience = 'hint_experience_empty';
    for (const e of data.experience) {
        const lines = bulletLines(e.bullets);
        if (!lines.length) hints.items[e.id] = 'hint_bullets_empty';
        else if (!lines.some((l) => /\d/.test(l))) hints.items[e.id] = 'hint_bullets_numbers';
        else if (lines.length < 2) hints.items[e.id] = 'hint_bullets_few';
    }
    if (data.skills.length < 4) hints.skills = 'hint_skills_few';
    const langs = data.languages.filter((l) => l.name.trim());
    if (!langs.length) hints.languages = 'hint_languages_empty';
    else if (langs.some((l) => !l.level.trim())) hints.languages = 'hint_languages_level';
    return hints;
}

// ── Chat del asistente ──────────────────────────────────────────

export interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
}

type ExperienceFields = { role: string; company: string; location: string; start: string; end: string; current: boolean; bullets: string };
type EducationFields = { degree: string; school: string; location: string; start: string; end: string; details: string };

/** Cambio que la IA propone en el chat. El usuario lo aplica (o no) con un botón. */
export type ChatChange =
    | { type: 'set_headline'; label: string; text: string }
    | { type: 'set_summary'; label: string; text: string }
    | { type: 'add_experience'; label: string; experience: ExperienceFields }
    | { type: 'update_experience'; label: string; itemId: string; fields: Partial<ExperienceFields> }
    | { type: 'add_education'; label: string; education: EducationFields }
    | { type: 'add_skills'; label: string; skills: string[] }
    | { type: 'add_language'; label: string; name: string; level: string }
    | { type: 'add_certification'; label: string; name: string; issuer: string; year: string }
    | { type: 'add_section'; label: string; title: string; content: string };

export interface ChatReply {
    reply: string;
    changes: ChatChange[];
}

export const MAX_CHAT_MESSAGES = 12;
export const MAX_CHAT_TEXT = 2000;

/** Historial del chat que llega del cliente: solo los últimos mensajes y con longitud limitada. */
export function sanitizeChatMessages(input: unknown): ChatMessage[] {
    if (!Array.isArray(input)) return [];
    return input
        .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, text: typeof m.text === 'string' ? m.text.trim().slice(0, MAX_CHAT_TEXT) : '' }))
        .filter((m) => m.text)
        .slice(-MAX_CHAT_MESSAGES);
}

/** Limpia la respuesta del chat: tipos conocidos, textos acotados y solo experiencias que existen. */
export function sanitizeChatReply(raw: unknown, data: ResumeData): ChatReply {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const ids = new Set(data.experience.map((e) => e.id));
    const o = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const exp = (v: unknown): ExperienceFields => {
        const x = o(v);
        return {
            role: str(x.role, 150), company: str(x.company, 150), location: str(x.location, 150),
            start: str(x.start, 30), end: str(x.end, 30), current: x.current === true,
            bullets: cleanProposed('bullets', str(x.bullets, 3000)),
        };
    };
    const changes: ChatChange[] = [];
    for (const item of Array.isArray(r.changes) ? r.changes.slice(0, 8) : []) {
        const c = o(item);
        const label = str(c.label, 160);
        switch (c.type) {
            case 'set_headline': {
                const text = cleanProposed('headline', str(c.text, 150));
                if (text) changes.push({ type: 'set_headline', label, text });
                break;
            }
            case 'set_summary': {
                const text = str(c.text, 3000);
                if (text) changes.push({ type: 'set_summary', label, text });
                break;
            }
            case 'add_experience': {
                const experience = exp(c.experience);
                if (experience.role || experience.company) changes.push({ type: 'add_experience', label, experience });
                break;
            }
            case 'update_experience': {
                const itemId = typeof c.item_id === 'string' ? c.item_id : '';
                if (!ids.has(itemId)) break;
                const full = exp(c.fields);
                const given = o(c.fields);
                const fields: Partial<ExperienceFields> = {};
                (Object.keys(full) as (keyof ExperienceFields)[]).forEach((k) => {
                    if (k in given && (k === 'current' ? typeof given.current === 'boolean' : full[k] !== '')) (fields as Record<string, unknown>)[k] = full[k];
                });
                if (Object.keys(fields).length) changes.push({ type: 'update_experience', label, itemId, fields });
                break;
            }
            case 'add_education': {
                const x = o(c.education);
                const education = { degree: str(x.degree, 150), school: str(x.school, 150), location: str(x.location, 150), start: str(x.start, 30), end: str(x.end, 30), details: str(x.details, 3000) };
                if (education.degree || education.school) changes.push({ type: 'add_education', label, education });
                break;
            }
            case 'add_skills': {
                const have = new Set(data.skills.map((s) => s.toLowerCase()));
                const skills = (Array.isArray(c.skills) ? c.skills : []).map((s) => str(s, 60)).filter((s) => s && !have.has(s.toLowerCase())).slice(0, 20);
                if (skills.length) changes.push({ type: 'add_skills', label, skills });
                break;
            }
            case 'add_language': {
                const name = str(c.name, 60);
                if (name) changes.push({ type: 'add_language', label, name, level: str(c.level, 60) });
                break;
            }
            case 'add_section': {
                const title = str(c.title, 80);
                const content = cleanProposed('bullets', str(c.content, 3000));
                if (title && content) changes.push({ type: 'add_section', label, title, content });
                break;
            }
            case 'add_certification': {
                const name = str(c.name, 150);
                if (name) changes.push({ type: 'add_certification', label, name, issuer: str(c.issuer, 150), year: str(c.year, 30) });
                break;
            }
        }
    }
    return { reply: str(r.reply, 3000), changes };
}
