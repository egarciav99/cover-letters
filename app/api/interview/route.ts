import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/plans';
import { consumeAiUsage, getUserPlan, refundUsage } from '@/lib/usage';
import { isResumeUsable } from '@/lib/resume';
import { MISSING_TABLE_CODES, getBaseResume, getTailoredResume } from '@/lib/resumeServer';
import { AiError, isAiConfigured } from '@/lib/ai/gemini';
import { prepareInterview } from '@/lib/ai/interviewAi';

export const maxDuration = 60;

/** Pro: prepara la entrevista de una candidatura y la guarda en ella. */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const applicationId = typeof body.application_id === 'string' ? body.application_id : '';
    const uiLanguage = typeof body.locale === 'string' ? body.locale.slice(0, 5) : 'en';
    if (!isAiConfigured()) return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });

    const admin = createAdminClient();
    let usageId: string | null | 'unmetered' = null;
    try {
        const plan = await getUserPlan(admin, user.id);
        if (PLANS[plan].ai.interview <= 0) return NextResponse.json({ error: 'pro_required' }, { status: 403 });

        const { data: app, error } = await admin
            .from('applications')
            .select('id, company, position, job_description, resume_id')
            .eq('id', applicationId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (error) throw error;
        if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (!app.job_description || app.job_description.trim().length < 30) {
            return NextResponse.json({ error: 'no_job_description' }, { status: 400 });
        }

        // El CV adaptado a esta oferta si existe; si no, el CV base.
        const tailored = app.resume_id ? await getTailoredResume(admin, user.id, app.resume_id).catch(() => null) : null;
        const cv = tailored?.status === 'done' ? tailored : await getBaseResume(admin, user.id).catch(() => null);

        usageId = await consumeAiUsage(admin, user.id, 'interview', PLANS[plan].ai.interview);
        if (!usageId) return NextResponse.json({ error: 'quota_exceeded', plan, limit: PLANS[plan].ai.interview }, { status: 402 });

        const prep = await prepareInterview(
            { company: app.company, position: app.position, requirements: app.job_description },
            cv && isResumeUsable(cv.data) ? { data: cv.data, language: cv.language } : null,
            uiLanguage,
        );
        const { error: saveError } = await admin.from('applications').update({ interview_prep: prep }).eq('id', app.id);
        if (saveError) throw saveError;
        return NextResponse.json({ prep });
    } catch (err: any) {
        await refundUsage(admin, usageId).catch(() => undefined);
        if (MISSING_TABLE_CODES.includes(err?.code ?? '')) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
        if (err instanceof AiError) {
            console.error('Interview AI error:', err.code, err.reason, err.message);
            return NextResponse.json({ error: 'ai_failed', reason: err.reason }, { status: 502 });
        }
        console.error('Interview error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
