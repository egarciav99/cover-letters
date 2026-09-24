import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANS, PlanId, nextResetDate } from './plans';

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
    const { count } = await admin
        .from('generation_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString());
    return {
        plan,
        used: count ?? 0,
        limit: PLANS[plan].monthlyLimit,
        resetsAt: nextResetDate(now).toISOString(),
    };
}
