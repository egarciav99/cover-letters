import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUsageSummary } from '@/lib/usage';
import { expireStaleLetters } from '@/lib/letters';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const admin = createAdminClient();
        // Cartas atascadas: se marcan como fallidas y se devuelve el cupo antes de contar.
        const expired = await expireStaleLetters(admin, user.id).catch((err) => {
            console.error('Expire stale letters error:', err);
            return 0;
        });
        return NextResponse.json({ ...(await getUsageSummary(admin, user.id)), expired });
    } catch (err) {
        console.error('Usage error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
