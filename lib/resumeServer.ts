import type { SupabaseClient } from '@supabase/supabase-js';
import { isResumeLanguage, sanitizeResumeData, sanitizeResumeStyle, type Resume } from './resume';
import type { JobInfo, MatchResult, TailorChanges } from './resumeTailor';

/** Errores de "la tabla, columna o función no existe": falta ejecutar una migración. */
export const MISSING_TABLE_CODES = ['PGRST202', '42883', '42P01', 'PGRST205', '42703', 'PGRST204'];

/** CV base del usuario (null si no ha creado ninguno). */
export async function getBaseResume(admin: SupabaseClient, userId: string): Promise<Resume | null> {
    const { data, error } = await admin
        .from('resumes')
        .select('id, title, language, data, style, updated_at')
        .eq('user_id', userId)
        .is('parent_id', null)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
        id: data.id,
        title: data.title,
        language: isResumeLanguage(data.language) ? data.language : 'en',
        data: sanitizeResumeData(data.data),
        style: sanitizeResumeStyle(data.style),
        updated_at: data.updated_at,
    };
}

/** Ruta del archivo dentro del bucket `cvs` a partir de la URL guardada. */
export function cvStoragePath(fileUrl: string): string | null {
    const match = String(fileUrl || '').match(/\/storage\/v1\/object\/(?:public|sign)\/cvs\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export interface TailoredResume extends Resume {
    parent_id: string;
    cover_letter_id: string | null;
    status: 'pending' | 'done' | 'error';
    error_code: string | null;
    job: (JobInfo & { usage_id?: string }) | null;
    changes: TailorChanges | null;
    match: { before: MatchResult | null; after: MatchResult | null } | null;
    created_at: string;
}

/** Versión adaptada del usuario (null si no existe o no es suya). */
export async function getTailoredResume(admin: SupabaseClient, userId: string, id: string): Promise<TailoredResume | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const { data, error } = await admin
        .from('resumes')
        .select('id, title, language, data, style, updated_at, created_at, parent_id, cover_letter_id, status, error_code, job, changes, match')
        .eq('id', id)
        .eq('user_id', userId)
        .not('parent_id', 'is', null)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
        ...data,
        language: isResumeLanguage(data.language) ? data.language : 'en',
        data: sanitizeResumeData(data.data),
        style: sanitizeResumeStyle(data.style),
    } as TailoredResume;
}
