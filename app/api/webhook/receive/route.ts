import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        // Optional: verify secret token from n8n
        const secret = request.headers.get('x-webhook-secret');
        if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { cover_letter_id, content } = body;

        if (!cover_letter_id || !content) {
            return NextResponse.json({ error: 'Missing cover_letter_id or content' }, { status: 400 });
        }

        // Use service role key to bypass RLS — this endpoint is protected by WEBHOOK_SECRET
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Update the cover letter with the generated content
        const { error } = await supabase
            .from('cover_letters')
            .update({
                content,
                status: 'done',
            })
            .eq('id', cover_letter_id);

        if (error) {
            console.error('Supabase update error:', error);
            return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook receive error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
