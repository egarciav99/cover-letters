import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUsageSummary } from '@/lib/usage';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        return NextResponse.json(await getUsageSummary(createAdminClient(), user.id));
    } catch (err) {
        console.error('Usage error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
