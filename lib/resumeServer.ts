import type { SupabaseClient } from '@supabase/supabase-js';
import { isResumeLanguage, sanitizeResumeData, sanitizeResumeStyle, type Resume } from './resume';

/** Errores de "la tabla o función no existe": la migración aún no se ha ejecutado. */
export const MISSING_TABLE_CODES = ['PGRST202', '42883', '42P01', 'PGRST205'];

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
