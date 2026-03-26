import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        // 1. Verify environment variable
        const expectedSecret = process.env.WEBHOOK_SECRET;
        if (!expectedSecret) {
            console.error('DEBUG: WEBHOOK_SECRET is NOT defined in process.env');
            return NextResponse.json({ 
                error: 'Server misconfiguration', 
                detail: 'WEBHOOK_SECRET missing in environment variables' 
            }, { status: 500 });
        }

        // 2. Verify incoming header
        const secret = request.headers.get('x-webhook-secret');
        if (secret !== expectedSecret) {
            console.error('DEBUG: Secret mismatch', { received: secret ? 'provided' : 'missing' });
            return NextResponse.json({ 
                error: 'Unauthorized', 
                detail: secret ? 'Secret mismatch' : 'Missing x-webhook-secret header' 
            }, { status: 401 });
        }

        // 3. Parse and validate body
        let bodyRaw;
        try {
            bodyRaw = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Malformed JSON', detail: 'Could not parse request body' }, { status: 400 });
        }

        const body = Array.isArray(bodyRaw) ? bodyRaw[0] : bodyRaw;
        const { cover_letter_id, content } = body || {};

        if (!cover_letter_id || !content) {
            return NextResponse.json({ 
                error: 'Invalid payload', 
                detail: 'Missing cover_letter_id or content fields',
                received_keys: body ? Object.keys(body) : []
            }, { status: 400 });
        }

        // 4. Update Database
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { error } = await supabase
            .from('cover_letters')
            .update({ content, status: 'done' })
            .eq('id', cover_letter_id);

        if (error) {
            console.error('Supabase DB error:', error);
            return NextResponse.json({ error: 'Database error', detail: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Cover letter updated successfully' });
    } catch (error: any) {
        console.error('Global Webhook Error:', error);
        return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
    }
}
