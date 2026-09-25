import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { expireStaleLetters } from '@/lib/letters';

/** El editor lo llama cuando una carta supera el tiempo de espera. */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    try {
        const expired = await expireStaleLetters(createAdminClient(), user.id, id);
        return NextResponse.json({ expired });
    } catch (err) {
        console.error('Expire error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
