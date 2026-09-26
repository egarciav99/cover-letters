import type { JobInfo } from './resumeTailor';

// Mismos límites que /api/generate: protegen el coste de la IA.
const MAX_SHORT_FIELD = 200;
const MAX_REQUIREMENTS = 15000;

/** Lee y valida empresa, puesto y requisitos del cuerpo de la petición. */
export function parseJob(body: Record<string, unknown>): JobInfo | { error: string } {
    const company = typeof body.company === 'string' ? body.company.trim() : '';
    const position = typeof body.position === 'string' ? body.position.trim() : '';
    const requirements = typeof body.requirements === 'string' ? body.requirements.trim() : '';
    if (requirements.length < 30) return { error: 'requirements_too_short' };
    if (company.length > MAX_SHORT_FIELD || position.length > MAX_SHORT_FIELD || requirements.length > MAX_REQUIREMENTS) {
        return { error: 'Input too long' };
    }
    return { company, position, requirements };
}
