import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_CODES = new Set(['cv_unreadable', 'generation_failed']);

function secretMatches(received: string | null, expected: string): boolean {
    if (!received) return false;
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Callback de n8n.
 * - Éxito: { cover_letter_id, content } → guarda la carta y la marca como `done`.
 * - Error: { cover_letter_id, status: 'error', error_code } → la marca como `error` y devuelve el cupo.
 * Un aviso de error solo afecta a cartas en `pending`; una carta ya entregada nunca se sobrescribe.
 */
export async function POST(request: NextRequest) {
    try {
        const expectedSecret = process.env.WEBHOOK_SECRET;
        if (!expectedSecret) {
            console.error('WEBHOOK_SECRET is not configured');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }
        if (!secretMatches(request.headers.get('x-webhook-secret'), expectedSecret)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let bodyRaw: unknown;
        try {
            bodyRaw = await request.json();
        } catch {
            return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
        }
        const body = (Array.isArray(bodyRaw) ? bodyRaw[0] : bodyRaw) as Record<string, unknown> | undefined;

        // n8n expressions sometimes prepend an '='
        const coverLetterId = typeof body?.cover_letter_id === 'string' ? body.cover_letter_id.replace(/^=/, '').trim() : '';
        if (!UUID_RE.test(coverLetterId)) {
            return NextResponse.json({ error: 'Invalid cover_letter_id' }, { status: 400 });
        }

        const admin = createAdminClient();
        const isError = body?.status === 'error';

        if (isError) {
            const errorCode = typeof body?.error_code === 'string' && ERROR_CODES.has(body.error_code) ? body.error_code : 'generation_failed';
            let { data, error } = await admin
                .from('cover_letters')
                .update({ status: 'error', error_code: errorCode })
                .eq('id', coverLetterId)
                .eq('status', 'pending')
                .select('id');
            if (error?.code === 'PGRST204' || error?.code === '42703') {
                // Migración 003 aún sin ejecutar: se guarda sin el código de error.
                ({ data, error } = await admin
                    .from('cover_letters')
                    .update({ status: 'error' })
                    .eq('id', coverLetterId)
                    .eq('status', 'pending')
                    .select('id'));
            }
            if (error) {
                console.error('Supabase DB error:', error);
                return NextResponse.json({ error: 'Database error' }, { status: 500 });
            }
            if (data && data.length > 0) {
                // La generación falló: no cuenta para el límite del mes.
                await admin.from('generation_usage').delete().eq('cover_letter_id', coverLetterId);
            }
            return NextResponse.json({ success: true });
        }

        const content = typeof body?.content === 'string' ? body.content : '';
        if (!content.trim()) {
            return NextResponse.json({ error: 'Missing content' }, { status: 400 });
        }

        const { error } = await admin
            .from('cover_letters')
            .update({ content, status: 'done' })
            .eq('id', coverLetterId)
            // `error` también: si la app dio la petición por perdida (timeout) pero n8n terminó, la carta se entrega.
            .in('status', ['pending', 'error']);

        if (error) {
            console.error('Supabase DB error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
