import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/plans';
import { consumeAiUsage, getUserPlan, refundUsage } from '@/lib/usage';
import { isResumeLanguage, sanitizeResumeData } from '@/lib/resume';
import { AiError, isAiConfigured } from '@/lib/ai/gemini';
import { improveField, reviewResume } from '@/lib/ai/resumeAssistAi';
import type { ImproveField } from '@/lib/resumeAssist';

export const maxDuration = 60;

const MAX_BODY = 100_000;
const FIELDS: ImproveField[] = ['headline', 'summary', 'bullets'];

/**
 * Asistente del CV (solo Pro). Trabaja con lo que hay en el editor, aunque no esté guardado.
 * - `{ action: 'review', data, language, locale }` → nota y sugerencias.
 * - `{ action: 'improve', field, item_id?, data, language }` → texto mejorado de ese campo.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const text = await request.text();
    if (text.length > MAX_BODY) return NextResponse.json({ error: 'too_large' }, { status: 413 });
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }

    const action = body.action;
    const field = body.field as ImproveField;
    if (action !== 'review' && !(action === 'improve' && FIELDS.includes(field))) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    const data = sanitizeResumeData(body.data);
    const language = isResumeLanguage(body.language) ? body.language : 'en';
    const uiLanguage = typeof body.locale === 'string' ? body.locale.slice(0, 5) : language;
    const itemId = typeof body.item_id === 'string' ? body.item_id : null;
    if (action === 'improve' && field === 'bullets' && !data.experience.some((e) => e.id === itemId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

    if (!isAiConfigured()) return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });

    const admin = createAdminClient();
    let usageId: string | null | 'unmetered' = null;
    try {
        const plan = await getUserPlan(admin, user.id);
        if (PLANS[plan].ai.assist <= 0) return NextResponse.json({ error: 'pro_only', plan }, { status: 403 });
        usageId = await consumeAiUsage(admin, user.id, 'assist', PLANS[plan].ai.assist);
        if (!usageId) return NextResponse.json({ error: 'quota_exceeded', plan, limit: PLANS[plan].ai.assist }, { status: 402 });

        if (action === 'review') return NextResponse.json(await reviewResume(data, language, uiLanguage));

        const improved = await improveField(data, language, field, itemId);
        if (!improved) throw new AiError('bad_output', 'Empty improved text', 'empty');
        return NextResponse.json({ text: improved });
    } catch (err) {
        await refundUsage(admin, usageId).catch(() => undefined);
        if (err instanceof AiError) {
            console.error('Assist AI error:', err.code, err.reason, err.message);
            return NextResponse.json({ error: 'ai_failed', reason: err.reason }, { status: 502 });
        }
        console.error('Assist error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
