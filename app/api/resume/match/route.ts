import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/plans';
import { consumeAiUsage, getUserPlan, refundUsage } from '@/lib/usage';
import { isResumeUsable } from '@/lib/resume';
import { MISSING_TABLE_CODES, getBaseResume } from '@/lib/resumeServer';
import { parseJob } from '@/lib/jobInput';
import { AiError, isAiConfigured } from '@/lib/ai/gemini';
import { scoreMatch } from '@/lib/ai/resumeAi';

export const maxDuration = 60;

/**
 * Puntuación de encaje entre el CV creado y una oferta.
 * Plan gratis: solo la nota. Pro: también palabras clave encontradas/que faltan y consejos.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const job = parseJob(body);
    if ('error' in job) return NextResponse.json({ error: job.error }, { status: 400 });
    const uiLanguage = typeof body.locale === 'string' ? body.locale.slice(0, 5) : 'en';

    if (!isAiConfigured()) return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });

    const admin = createAdminClient();
    let usageId: string | null | 'unmetered' = null;
    try {
        const resume = await getBaseResume(admin, user.id);
        if (!resume || !isResumeUsable(resume.data)) return NextResponse.json({ error: 'no_resume' }, { status: 400 });

        const plan = await getUserPlan(admin, user.id);
        usageId = await consumeAiUsage(admin, user.id, 'match', PLANS[plan].ai.match);
        if (!usageId) return NextResponse.json({ error: 'quota_exceeded', plan, limit: PLANS[plan].ai.match }, { status: 402 });

        const match = await scoreMatch(resume.data, resume.language, job, uiLanguage);
        if (plan === 'pro') return NextResponse.json({ plan, ...match, locked: false });
        return NextResponse.json({
            plan,
            score: match.score,
            matched_count: match.matched.length,
            missing_count: match.missing.length,
            locked: true,
        });
    } catch (err: any) {
        await refundUsage(admin, usageId).catch(() => undefined);
        if (MISSING_TABLE_CODES.includes(err?.code ?? '')) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
        if (err instanceof AiError) {
            console.error('Match AI error:', err.code, err.reason, err.message);
            return NextResponse.json({ error: 'ai_failed', reason: err.reason }, { status: 502 });
        }
        console.error('Match error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
