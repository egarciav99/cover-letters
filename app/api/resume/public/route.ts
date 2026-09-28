import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserPlan } from '@/lib/usage';
import { isResumeUsable, sanitizeResumeData } from '@/lib/resume';
import { MISSING_TABLE_CODES } from '@/lib/resumeServer';
import { normalizeSlug, publicResumeUrl, suggestSlug, type PublicResumeSettings } from '@/lib/publicResume';

type Row = { id: string; data: unknown; public_slug: string | null; is_public: boolean; show_contact: boolean; public_views: number };

const COLUMNS = 'id, data, public_slug, is_public, show_contact, public_views';

function settings(row: Row): PublicResumeSettings & { url: string | null } {
    return {
        slug: row.public_slug,
        isPublic: row.is_public,
        showContact: row.show_contact,
        views: row.public_views,
        url: row.public_slug ? publicResumeUrl(row.public_slug) : null,
    };
}

async function loadRow(userId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin.from('resumes').select(COLUMNS).eq('user_id', userId).is('parent_id', null).maybeSingle();
    return { admin, row: data as Row | null, error };
}

function loadError(error: { code?: string }) {
    if (MISSING_TABLE_CODES.includes(error.code ?? '')) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
    console.error('Public resume load error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/** Estado del CV online del usuario. */
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { admin, row, error } = await loadRow(user.id);
    if (error) return loadError(error);
    const plan = await getUserPlan(admin, user.id);
    return NextResponse.json({ plan, ...(row ? settings(row) : { slug: null, isPublic: false, showContact: false, views: 0, url: null }) });
}

/**
 * Cambia el CV online: `{ is_public?, show_contact?, slug? }`.
 * Publicar exige plan Pro y un CV guardado con contenido. El enlace se crea solo la primera vez.
 */
export async function PUT(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({}));

    const { admin, row, error } = await loadRow(user.id);
    if (error) return loadError(error);
    if (!row) return NextResponse.json({ error: 'no_resume' }, { status: 404 });

    const patch: Partial<Row> = {};
    if (typeof body.show_contact === 'boolean') patch.show_contact = body.show_contact;
    if (typeof body.is_public === 'boolean') patch.is_public = body.is_public;
    if (typeof body.slug === 'string') {
        const slug = normalizeSlug(body.slug);
        if (!slug) return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
        patch.public_slug = slug;
    }
    if (!Object.keys(patch).length) return NextResponse.json(settings(row));

    const data = sanitizeResumeData(row.data);
    if (patch.is_public === true) {
        if ((await getUserPlan(admin, user.id)) !== 'pro') return NextResponse.json({ error: 'pro_only' }, { status: 403 });
        if (!isResumeUsable(data)) return NextResponse.json({ error: 'not_usable' }, { status: 400 });
    }
    const autoSlug = !row.public_slug && !patch.public_slug && patch.is_public === true;

    for (let attempt = 0; attempt < 3; attempt++) {
        if (autoSlug) patch.public_slug = suggestSlug(data.personal.fullName);
        const { data: updated, error: updateError } = await admin.from('resumes').update(patch).eq('id', row.id).select(COLUMNS).single();
        if (!updateError && updated) return NextResponse.json(settings(updated as Row));
        if (updateError?.code === '23505') {
            if (autoSlug) continue;
            return NextResponse.json({ error: 'slug_taken' }, { status: 409 });
        }
        return loadError(updateError ?? {});
    }
    return NextResponse.json({ error: 'slug_taken' }, { status: 409 });
}
