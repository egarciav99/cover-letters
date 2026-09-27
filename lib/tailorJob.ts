import type { SupabaseClient } from '@supabase/supabase-js';
import type { Resume } from './resume';
import { applyChanges, type JobInfo, type TailorChanges } from './resumeTailor';
import { scoreMatch, tailorResume } from './ai/resumeAi';
import { AiError } from './ai/gemini';
import { refundUsage } from './usage';

/** Tiempo tras el que una adaptación en `pending` se da por fallida (la función se cortó). */
export const TAILOR_TIMEOUT_SECONDS = 240;

/**
 * Genera la versión adaptada y la guarda. Se ejecuta en segundo plano (after()).
 * Si falla, marca la versión como error y devuelve el cupo.
 */
export async function runTailorJob(admin: SupabaseClient, tailoredId: string, base: Resume, job: JobInfo, usageId: string | null | 'unmetered') {
    try {
        const [{ proposal, keys }, before] = await Promise.all([
            tailorResume(base.data, base.language, job),
            scoreMatch(base.data, base.language, job, base.language, 35_000).catch(() => null),
        ]);
        const changes: TailorChanges = { base: base.data, proposal, keys, accepted: keys };
        const data = applyChanges(changes);
        // La puntuación final es opcional: con poco margen se omite antes que perder la adaptación.
        const after = keys.length ? await scoreMatch(data, base.language, job, base.language, 15_000).catch(() => null) : before;
        const { error } = await admin
            .from('resumes')
            .update({ status: 'done', data, changes, match: { before, after }, updated_at: new Date().toISOString() })
            .eq('id', tailoredId)
            .eq('status', 'pending');
        if (error) throw error;
        // Enlaza el CV adaptado con la candidatura de esa carta, si la hay.
        await linkTailoredToApplication(admin, tailoredId);
    } catch (err) {
        console.error('Tailor job error:', err);
        const reason = err instanceof AiError ? `ai_failed:${err.reason}` : 'ai_failed';
        await admin.from('resumes').update({ status: 'error', error_code: reason }).eq('id', tailoredId).eq('status', 'pending');
        await refundUsage(admin, usageId).catch(() => undefined);
    }
}

/** Da por fallida una adaptación atascada en `pending` y devuelve el cupo. */
export async function expireStaleTailor(admin: SupabaseClient, row: { id: string; status: string; created_at: string; job: { usage_id?: string } | null }) {
    if (row.status !== 'pending') return false;
    if (Date.now() - new Date(row.created_at).getTime() < TAILOR_TIMEOUT_SECONDS * 1000) return false;
    const { data } = await admin
        .from('resumes')
        .update({ status: 'error', error_code: 'timeout' })
        .eq('id', row.id)
        .eq('status', 'pending')
        .select('id');
    if (data?.length && row.job?.usage_id) await refundUsage(admin, row.job.usage_id).catch(() => undefined);
    return !!data?.length;
}

async function linkTailoredToApplication(admin: SupabaseClient, tailoredId: string) {
    const { data: row } = await admin.from('resumes').select('cover_letter_id').eq('id', tailoredId).maybeSingle();
    if (!row?.cover_letter_id) return;
    const { error } = await admin.from('applications').update({ resume_id: tailoredId }).eq('cover_letter_id', row.cover_letter_id);
    if (error) console.error('Link tailored CV to application error:', error);
}
