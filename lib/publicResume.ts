/**
 * CV online (plan Pro): enlace público del CV base, con QR.
 * La página pública (/cv/[slug]) solo se muestra mientras el dueño sea Pro.
 */

import { fileSlug } from './fileName';
import { SITE } from './site';

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export interface PublicResumeSettings {
    slug: string | null;
    isPublic: boolean;
    showContact: boolean;
    views: number;
}

/** Normaliza lo que escribe el usuario ("José García" > "jose-garcia"). Vacío si no es válido. */
export function normalizeSlug(input: string): string {
    const slug = fileSlug(input, '').slice(0, 50).replace(/-+$/, '');
    return SLUG_RE.test(slug) ? slug : '';
}

/** Enlace sugerido a partir del nombre, con un sufijo corto para que no choque con otros. */
export function suggestSlug(fullName: string): string {
    const base = normalizeSlug(fullName).slice(0, 40).replace(/-+$/, '') || 'cv';
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
}

export function publicResumeUrl(slug: string): string {
    return `${SITE.url}/cv/${slug}`;
}
