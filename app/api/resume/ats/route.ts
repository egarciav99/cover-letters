import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderResumeTextPdf } from '@/lib/resumePdf';
import { MISSING_TABLE_CODES, getBaseResume, getTailoredResume } from '@/lib/resumeServer';

/** Descarga la versión ATS del CV (o de una versión adaptada con ?id=): texto real, una columna, sin foto. */
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const admin = createAdminClient();
        const id = request.nextUrl.searchParams.get('id');
        const resume = id ? await getTailoredResume(admin, user.id, id) : await getBaseResume(admin, user.id);
        if (!resume) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const pdf = await renderResumeTextPdf(resume.data, resume.language, resume.style.accent);
        const name = (resume.data.personal.fullName || 'cv').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="cv-${name}-ats.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err: any) {
        if (MISSING_TABLE_CODES.includes(err?.code ?? '')) return NextResponse.json({ error: 'migration_missing' }, { status: 503 });
        console.error('ATS resume error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
