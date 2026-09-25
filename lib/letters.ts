import type { SupabaseClient } from '@supabase/supabase-js';

/** Tiempo máximo razonable para que n8n entregue una carta (segundos). */
export const LETTER_TIMEOUT_SECONDS = 180;

/**
 * Da por fallidas las cartas de un usuario que llevan demasiado tiempo en `pending`
 * (n8n se cayó o no avisó) y les devuelve el cupo. Si n8n entrega la carta más tarde,
 * el callback la acepta igualmente.
 */
export async function expireStaleLetters(admin: SupabaseClient, userId: string, onlyId?: string): Promise<number> {
    const cutoff = new Date(Date.now() - LETTER_TIMEOUT_SECONDS * 1000).toISOString();
    let query = admin
        .from('cover_letters')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .lt('created_at', cutoff);
    if (onlyId) query = query.eq('id', onlyId);
    const { data: stale } = await query;
    const ids = (stale || []).map((r: { id: string }) => r.id);
    if (ids.length === 0) return 0;

    let { error } = await admin
        .from('cover_letters')
        .update({ status: 'error', error_code: 'timeout' })
        .in('id', ids)
        .eq('status', 'pending');
    if (error?.code === 'PGRST204' || error?.code === '42703') {
        // Sin la migración 003 (columna error_code).
        ({ error } = await admin.from('cover_letters').update({ status: 'error' }).in('id', ids).eq('status', 'pending'));
    }
    if (error) {
        console.error('Expire letters error:', error);
        return 0;
    }
    await admin.from('generation_usage').delete().in('cover_letter_id', ids);
    return ids.length;
}
