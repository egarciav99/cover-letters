/**
 * CV adaptado a una oferta: qué puede cambiar la IA y cómo se aplican los cambios aceptados.
 *
 * La IA solo propone texto para el titular, el perfil, los logros de cada experiencia y la lista
 * de habilidades. Empresas, puestos, fechas, formación e idiomas se copian siempre del CV base,
 * así que la versión adaptada no puede inventar experiencia.
 */

import { bulletLines, sanitizeResumeData, type ResumeData } from './resume';

export interface TailorProposal {
    headline: string;
    summary: string;
    skills: string[];
    /** Logros propuestos por id de experiencia (uno por línea). */
    experience: Record<string, string>;
    /** Motivo de cada cambio, por clave (headline, summary, skills, exp:<id>). */
    reasons: Record<string, string>;
}

export interface TailorChanges {
    /** CV base en el momento de adaptar (para poder reconstruir con otra selección). */
    base: ResumeData;
    proposal: TailorProposal;
    /** Claves con cambios reales, en orden de presentación. */
    keys: string[];
    /** Claves que el usuario acepta. */
    accepted: string[];
}

export interface MatchResult {
    score: number;
    matched: string[];
    missing: string[];
    tips: string[];
}

export interface JobInfo {
    company: string;
    position: string;
    requirements: string;
}

/** Quita los guiones largos y medios que se cuelen en el texto de la IA (estilo de la casa). */
export function noDashes(s: string): string {
    return s.replace(/\s*[\u2014\u2013]\s*/g, (m) => (m.trim() === m ? '-' : ', '));
}

/** Para comparar: sin mayúsculas, espacios repetidos ni diferencias de guiones. */
const norm = (s: string) => noDashes(s).replace(/\s+/g, ' ').trim().toLowerCase();

/** Limpia la respuesta de la IA y la limita a las experiencias que existen en el CV base. */
export function sanitizeProposal(raw: unknown, base: ResumeData): TailorProposal {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === 'string' ? noDashes(v).trim().slice(0, max) : '');
    const ids = new Set(base.experience.map((e) => e.id));
    const experience: Record<string, string> = {};
    const reasons: Record<string, string> = {};
    if (Array.isArray(r.experience)) {
        for (const item of r.experience.slice(0, 20)) {
            const e = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            const id = str(e.id, 20);
            if (!ids.has(id) || !Array.isArray(e.bullets)) continue;
            const bullets = e.bullets.map((b) => str(b, 400)).filter(Boolean).slice(0, 10);
            if (bullets.length) experience[id] = bullets.join('\n');
            const why = str(e.reason, 300);
            if (why) reasons[`exp:${id}`] = why;
        }
    }
    const rs = (r.reasons && typeof r.reasons === 'object' ? r.reasons : {}) as Record<string, unknown>;
    for (const k of ['headline', 'summary', 'skills']) {
        const why = str(rs[k], 300);
        if (why) reasons[k] = why;
    }
    return {
        headline: str(r.headline, 150),
        summary: str(r.summary, 3000),
        skills: Array.isArray(r.skills) ? r.skills.map((s) => str(s, 60)).filter(Boolean).slice(0, 40) : [],
        experience,
        reasons,
    };
}

/** Claves en las que la propuesta difiere de verdad del CV base. */
export function changedKeys(base: ResumeData, p: TailorProposal): string[] {
    const keys: string[] = [];
    if (p.headline && norm(p.headline) !== norm(base.personal.headline)) keys.push('headline');
    if (p.summary && norm(p.summary) !== norm(base.summary)) keys.push('summary');
    for (const e of base.experience) {
        const next = p.experience[e.id];
        if (next && norm(bulletLines(next).join('\n')) !== norm(bulletLines(e.bullets).join('\n'))) keys.push(`exp:${e.id}`);
    }
    if (p.skills.length && norm(p.skills.join(',')) !== norm(base.skills.join(','))) keys.push('skills');
    return keys;
}

/** CV resultante: el base con los cambios aceptados. */
export function applyChanges(c: TailorChanges): ResumeData {
    const accepted = new Set(c.accepted.filter((k) => c.keys.includes(k)));
    const b = c.base;
    const p = c.proposal;
    return sanitizeResumeData({
        ...b,
        personal: { ...b.personal, headline: accepted.has('headline') ? p.headline : b.personal.headline },
        summary: accepted.has('summary') ? p.summary : b.summary,
        experience: b.experience.map((e) => (accepted.has(`exp:${e.id}`) ? { ...e, bullets: p.experience[e.id] } : e)),
        skills: accepted.has('skills') ? p.skills : b.skills,
    });
}

export function sanitizeMatch(raw: unknown): MatchResult {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const list = (v: unknown, n: number, max: number) =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => noDashes(x).trim().slice(0, max)).filter(Boolean).slice(0, n) : [];
    const score = Math.round(Number(r.score));
    return {
        score: Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0,
        matched: list(r.matched, 15, 80),
        missing: list(r.missing, 15, 80),
        tips: list(r.tips, 5, 300),
    };
}
