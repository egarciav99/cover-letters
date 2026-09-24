import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Borra todos los archivos de una carpeta del usuario en un bucket. */
async function removeFolder(admin: ReturnType<typeof createAdminClient>, bucket: string, folder: string) {
    const { data: files } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
    if (files && files.length > 0) {
        await admin.storage.from(bucket).remove(files.map((f) => `${folder}/${f.name}`));
    }
}

/**
 * Derecho de supresión (RGPD art. 17): borra los archivos del usuario y su cuenta.
 * Al borrar el usuario de auth, la base de datos elimina en cascada perfil, CVs,
 * cartas, uso y plan.
 */
export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const admin = createAdminClient();

        const { data: plan } = await admin
            .from('user_plans')
            .select('plan, status')
            .eq('user_id', user.id)
            .maybeSingle();
        if (plan?.plan === 'pro' && plan.status === 'active') {
            // Evita borrar una cuenta con una suscripción que seguiría cobrándose.
            return NextResponse.json({ error: 'active_subscription' }, { status: 409 });
        }

        await removeFolder(admin, 'cvs', user.id);
        await removeFolder(admin, 'profiles', user.id);

        const { error } = await admin.auth.admin.deleteUser(user.id);
        if (error) throw error;

        await supabase.auth.signOut();
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete account error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
