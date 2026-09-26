import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isResumeLanguage, isResumeUsable, sanitizeResumeData, sanitizeResumeStyle } from '@/lib/resume';
import { renderResumeTextPdf } from '@/lib/resumePdf';
import { MISSING_TABLE_CODES, cvStoragePath, getBaseResume } from '@/lib/resumeServer';

const MAX_BODY = 100_000;

function migrationMissing(error: { code?: string } | null | undefined) {
    return !!error && MISSING_TABLE_CODES.includes(error.code ?? '');
}

function fileSlug(name: string) {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'cv';
}

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const admin = createAdminClient();
        const resume = await getBaseResume(admin, user.id);
        const { data: cv } = resume
            ? await admin.from('cvs').select('id').eq('resume_id', resume.id).maybeSingle()
            : { data: null };
        return NextResponse.json({ resume, cv_id: cv?.id ?? null });
    } catch (err: any) {
        if (migrationMissing(err)) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
        console.error('Get resume error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Guarda el CV base. Si ya tiene contenido suficiente, genera un PDF de texto y lo publica
 * en la lista de CVs para que se pueda usar al generar cartas (n8n lo lee como cualquier otro CV).
 */
export async function PUT(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const raw = await request.text();
    if (raw.length > MAX_BODY) return NextResponse.json({ error: 'Input too long' }, { status: 413 });
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const data = sanitizeResumeData(body.data);
    const style = sanitizeResumeStyle(body.style);
    const language = isResumeLanguage(body.language) ? body.language : 'en';
    const title = (typeof body.title === 'string' ? body.title : '').trim().slice(0, 80);

    try {
        const admin = createAdminClient();
        const existing = await getBaseResume(admin, user.id);
        const row = { title, language, data, style, updated_at: new Date().toISOString() };
        const { data: saved, error: saveError } = existing
            ? await admin.from('resumes').update(row).eq('id', existing.id).select('id, updated_at').single()
            : await admin.from('resumes').insert({ ...row, user_id: user.id }).select('id, updated_at').single();
        if (saveError || !saved) throw saveError;

        if (!isResumeUsable(data)) {
            return NextResponse.json({ id: saved.id, updated_at: saved.updated_at, cv_id: null });
        }

        // PDF de texto para la IA. Nombre nuevo en cada guardado para que nunca se lea una copia en caché.
        const pdf = await renderResumeTextPdf(data, language, style.accent);
        const path = `${user.id}/resume_${saved.id}_${Date.now()}.pdf`;
        const { error: uploadError } = await admin.storage.from('cvs').upload(path, pdf, { contentType: 'application/pdf' });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = admin.storage.from('cvs').getPublicUrl(path);

        const label = title || (data.personal.headline ? `CV – ${data.personal.headline}` : 'CV CoverCraft');
        const fileName = `cv-${fileSlug(data.personal.fullName)}.pdf`;
        const { data: linked } = await admin.from('cvs').select('id, file_url').eq('resume_id', saved.id).maybeSingle();
        let cvId: string;
        if (linked) {
            const { error } = await admin.from('cvs')
                .update({ label, language, file_url: publicUrl, file_name: fileName })
                .eq('id', linked.id);
            if (error) throw error;
            cvId = linked.id;
            const oldPath = cvStoragePath(linked.file_url);
            if (oldPath && oldPath !== path) await admin.storage.from('cvs').remove([oldPath]);
        } else {
            const { count } = await admin.from('cvs').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
            const { data: inserted, error } = await admin.from('cvs')
                .insert({ user_id: user.id, resume_id: saved.id, label, language, file_url: publicUrl, file_name: fileName, is_default: !count })
                .select('id')
                .single();
            if (error || !inserted) {
                await admin.storage.from('cvs').remove([path]);
                throw error;
            }
            cvId = inserted.id;
        }

        return NextResponse.json({ id: saved.id, updated_at: saved.updated_at, cv_id: cvId });
    } catch (err: any) {
        if (migrationMissing(err)) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
        console.error('Save resume error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** Borra el CV creado y su PDF de la lista de CVs. */
export async function DELETE() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const admin = createAdminClient();
        const resume = await getBaseResume(admin, user.id);
        if (!resume) return NextResponse.json({ success: true });
        const { data: linked } = await admin.from('cvs').select('file_url').eq('resume_id', resume.id);
        const paths = (linked || []).map((c) => cvStoragePath(c.file_url)).filter((p): p is string => !!p);
        // Borra también las versiones adaptadas y sus CVs enlazados (cascada).
        const { error } = await admin.from('resumes').delete().eq('id', resume.id).eq('user_id', user.id);
        if (error) throw error;
        if (paths.length) await admin.storage.from('cvs').remove(paths);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        if (migrationMissing(err)) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
        console.error('Delete resume error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
