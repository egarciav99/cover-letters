import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/plans';
import { consumeAiUsage, getUserPlan, refundUsage } from '@/lib/usage';
import { isResumeUsable } from '@/lib/resume';
import { MISSING_TABLE_CODES, getBaseResume } from '@/lib/resumeServer';
import { parseJob } from '@/lib/jobInput';
import { isAiConfigured } from '@/lib/ai/gemini';
import { runTailorJob } from '@/lib/tailorJob';

// La adaptación sigue en segundo plano tras responder; este es su tiempo máximo
// (60 s cabe en todos los planes de Vercel; las llamadas a Gemini están acotadas para no pasarse).
export const maxDuration = 60;

/**
 * Pro: crea una versión del CV adaptada a una oferta. Responde enseguida con el id
 * (estado `pending`) y la IA trabaja en segundo plano.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const job = parseJob(body);
    if ('error' in job) return NextResponse.json({ error: job.error }, { status: 400 });
    const coverLetterId = typeof body.cover_letter_id === 'string' ? body.cover_letter_id : null;

    if (!isAiConfigured()) return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });

    const admin = createAdminClient();
    let usageId: string | null | 'unmetered' = null;
    try {
        const plan = await getUserPlan(admin, user.id);
        if (PLANS[plan].ai.tailor <= 0) return NextResponse.json({ error: 'pro_required' }, { status: 403 });

        const base = await getBaseResume(admin, user.id);
        if (!base || !isResumeUsable(base.data)) return NextResponse.json({ error: 'no_resume' }, { status: 400 });

        if (coverLetterId) {
            const { data: letter } = await admin.from('cover_letters').select('id').eq('id', coverLetterId).eq('user_id', user.id).maybeSingle();
            if (!letter) return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
        }

        usageId = await consumeAiUsage(admin, user.id, 'tailor', PLANS[plan].ai.tailor);
        if (!usageId) return NextResponse.json({ error: 'quota_exceeded', plan, limit: PLANS[plan].ai.tailor }, { status: 402 });

        const title = [job.position, job.company].filter(Boolean).join(' · ') || 'CV';
        const { data: row, error } = await admin
            .from('resumes')
            .insert({
                user_id: user.id,
                parent_id: base.id,
                cover_letter_id: coverLetterId,
                title: title.slice(0, 80),
                language: base.language,
                data: base.data,
                style: base.style,
                status: 'pending',
                job: { ...job, ...(usageId !== 'unmetered' ? { usage_id: usageId } : {}) },
            })
            .select('id')
            .single();
        if (error || !row) throw error;

        const pendingUsage = usageId;
        after(() => runTailorJob(admin, row.id, base, job, pendingUsage));
        return NextResponse.json({ id: row.id });
    } catch (err: any) {
        await refundUsage(admin, usageId).catch(() => undefined);
        if (MISSING_TABLE_CODES.includes(err?.code ?? '')) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
        console.error('Tailor error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
