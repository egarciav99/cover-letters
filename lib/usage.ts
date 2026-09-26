import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANS, PlanId, nextResetDate, type AiKind } from './plans';

export interface UsageSummary {
    plan: PlanId;
    used: number;
    limit: number;
    resetsAt: string;
}

/** Plan vigente del usuario. Un Pro caducado o cancelado cuenta como gratis. */
export async function getUserPlan(admin: SupabaseClient, userId: string): Promise<PlanId> {
    const { data } = await admin
        .from('user_plans')
        .select('plan, status, current_period_end')
        .eq('user_id', userId)
        .maybeSingle();
    if (!data || data.plan !== 'pro') return 'free';
    const active = ['active', 'trialing'].includes(data.status);
    const notExpired = !data.current_period_end || new Date(data.current_period_end) > new Date();
    return active && notExpired ? 'pro' : 'free';
}

export async function getUsageSummary(admin: SupabaseClient, userId: string): Promise<UsageSummary> {
    const plan = await getUserPlan(admin, userId);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const countFrom = () => admin
        .from('generation_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString());
    // Solo cartas: las funciones de IA del CV tienen su propio cupo.
    let { count, error } = await countFrom().eq('kind', 'letter');
    if (error) ({ count } = await countFrom()); // Sin la migración 005 (columna kind).

    return {
        plan,
        used: count ?? 0,
        limit: PLANS[plan].monthlyLimit,
        resetsAt: nextResetDate(now).toISOString(),
    };
}

/**
 * Consume una unidad del cupo mensual de una función de IA del CV.
 * Devuelve el id del registro (para devolverlo si algo falla), null si se alcanzó el límite,
 * o 'unmetered' si la migración 005 aún no se ha ejecutado.
 */
export async function consumeAiUsage(admin: SupabaseClient, userId: string, kind: AiKind, limit: number): Promise<string | null | 'unmetered'> {
    if (limit <= 0) return null;
    const { data, error } = await admin.rpc('consume_ai_usage', { p_user: userId, p_kind: kind, p_limit: limit });
    if (error) {
        if (['PGRST202', '42883', '42P01', 'PGRST205'].includes(error.code ?? '')) {
            console.error('Migration 005 not applied: AI usage is NOT metered. Run supabase/migrations/005_ai_resume.sql');
            return 'unmetered';
        }
        throw error;
    }
    return (data as string | null) ?? null;
}

export async function refundUsage(admin: SupabaseClient, usageId: string | null | 'unmetered'): Promise<void> {
    if (usageId && usageId !== 'unmetered') await admin.from('generation_usage').delete().eq('id', usageId);
}
