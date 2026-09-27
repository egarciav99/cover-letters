import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/plans';
import { consumeAiUsage, getUserPlan, refundUsage } from '@/lib/usage';
import { cvStoragePath } from '@/lib/resumeServer';
import { AiError, isAiConfigured } from '@/lib/ai/gemini';
import { importResumeFromPdf } from '@/lib/ai/resumeImport';

export const maxDuration = 60;

/** Por debajo del límite de 4,5 MB del cuerpo de las funciones de Vercel. */
const MAX_PDF_BYTES = 4 * 1024 * 1024;

/**
 * Lee un CV en PDF con la IA y devuelve sus datos para el creador de CV (no guarda nada).
 * Acepta un archivo (multipart, campo `file`) o `{ cv_id }` de un CV ya subido.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAiConfigured()) return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });

    const admin = createAdminClient();
    let pdf: Buffer;
    try {
        if ((request.headers.get('content-type') || '').includes('multipart/form-data')) {
            const form = await request.formData();
            const file = form.get('file');
            if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 });
            if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
            pdf = Buffer.from(await file.arrayBuffer());
        } else {
            const body = await request.json().catch(() => ({}));
            const cvId = typeof body.cv_id === 'string' ? body.cv_id : '';
            const { data: cv } = await admin.from('cvs').select('file_url').eq('id', cvId).eq('user_id', user.id).maybeSingle();
            const path = cv ? cvStoragePath(cv.file_url) : null;
            if (!path) return NextResponse.json({ error: 'no_file' }, { status: 404 });
            const { data: blob, error } = await admin.storage.from('cvs').download(path);
            if (error || !blob) return NextResponse.json({ error: 'no_file' }, { status: 404 });
            if (blob.size > MAX_PDF_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
            pdf = Buffer.from(await blob.arrayBuffer());
        }
    } catch {
        return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') return NextResponse.json({ error: 'not_pdf' }, { status: 400 });

    let usageId: string | null | 'unmetered' = null;
    try {
        const plan = await getUserPlan(admin, user.id);
        usageId = await consumeAiUsage(admin, user.id, 'import', PLANS[plan].ai.import);
        if (!usageId) return NextResponse.json({ error: 'quota_exceeded', plan, limit: PLANS[plan].ai.import }, { status: 402 });

        const result = await importResumeFromPdf(pdf.toString('base64'));
        if (result.empty) {
            await refundUsage(admin, usageId);
            return NextResponse.json({ error: 'not_a_cv' }, { status: 422 });
        }
        return NextResponse.json(result);
    } catch (err) {
        await refundUsage(admin, usageId).catch(() => undefined);
        if (err instanceof AiError) {
            console.error('Import AI error:', err.code, err.reason, err.message);
            return NextResponse.json({ error: 'ai_failed', reason: err.reason }, { status: 502 });
        }
        console.error('Import error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
