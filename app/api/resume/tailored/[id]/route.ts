import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeResumeStyle } from '@/lib/resume';
import { applyChanges } from '@/lib/resumeTailor';
import { MISSING_TABLE_CODES, getTailoredResume } from '@/lib/resumeServer';
import { expireStaleTailor } from '@/lib/tailorJob';

type Ctx = { params: Promise<{ id: string }> };

async function auth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

function fail(err: any, label: string) {
    if (MISSING_TABLE_CODES.includes(err?.code ?? '')) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
    console.error(label, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
    const user = await auth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    try {
        const admin = createAdminClient();
        let resume = await getTailoredResume(admin, user.id, id);
        if (!resume) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (await expireStaleTailor(admin, resume)) resume = await getTailoredResume(admin, user.id, id);
        // El id de uso es interno.
        const job = resume?.job ? { company: resume.job.company, position: resume.job.position, requirements: resume.job.requirements } : null;
        return NextResponse.json({ resume: { ...resume, job } });
    } catch (err) {
        return fail(err, 'Get tailored error:');
    }
}

/** Guarda qué cambios acepta el usuario y el diseño de esta versión. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
    const user = await auth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    try {
        const admin = createAdminClient();
        const resume = await getTailoredResume(admin, user.id, id);
        if (!resume) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (resume.status !== 'done' || !resume.changes) return NextResponse.json({ error: 'Not ready' }, { status: 409 });

        const accepted = Array.isArray(body.accepted)
            ? body.accepted.filter((k: unknown): k is string => typeof k === 'string' && resume.changes!.keys.includes(k))
            : resume.changes.accepted;
        const changes = { ...resume.changes, accepted };
        const update: Record<string, unknown> = { changes, data: applyChanges(changes), updated_at: new Date().toISOString() };
        if (body.style) update.style = sanitizeResumeStyle(body.style);

        const { error } = await admin.from('resumes').update(update).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return fail(err, 'Update tailored error:');
    }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    const user = await auth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    try {
        const admin = createAdminClient();
        const resume = await getTailoredResume(admin, user.id, id);
        if (!resume) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const { error } = await admin.from('resumes').delete().eq('id', id).eq('user_id', user.id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return fail(err, 'Delete tailored error:');
    }
}
