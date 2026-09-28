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
    | 'hint_skills_few' | 'hint_languages_empty';

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
    if (!data.personal.headline.trim()) hints.headline = 'hint_headline_empty';
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
    if (!data.languages.some((l) => l.name.trim())) hints.languages = 'hint_languages_empty';
    return hints;
}
