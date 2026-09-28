import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FileText, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserPlan } from '@/lib/usage';
import { isResumeLanguage, sanitizeResumeData, sanitizeResumeStyle } from '@/lib/resume';
import { SLUG_RE, publicResumeUrl } from '@/lib/publicResume';
import { SITE } from '@/lib/site';
import SiteFooter from '@/components/SiteFooter';
import PublicResumeView from '@/components/resume/PublicResumeView';

export const dynamic = 'force-dynamic';

const LOCALES = ['en', 'es', 'fr', 'nl'];
const SIGNUP_URL = '/register?utm_source=cv_online&utm_medium=public_cv';

/**
 * CV online publicado por su dueño. Solo se muestra mientras el dueño sea Pro y lo tenga publicado.
 * Sin "mostrar contacto", el correo y el teléfono no salen del servidor.
 */
const loadPublicResume = cache(async (slug: string) => {
    if (!SLUG_RE.test(slug)) return null;
    const admin = createAdminClient();
    const { data: row, error } = await admin
        .from('resumes')
        .select('id, user_id, language, data, style, show_contact')
        .eq('public_slug', slug)
        .eq('is_public', true)
        .is('parent_id', null)
        .maybeSingle();
    if (error || !row) return null;
    if ((await getUserPlan(admin, row.user_id)) !== 'pro') return null;

    const data = sanitizeResumeData(row.data);
    if (!row.show_contact) data.personal = { ...data.personal, email: '', phone: '' };
    const style = sanitizeResumeStyle(row.style);
    let avatarUrl = '';
    if (style.showPhoto) {
        const { data: profile } = await admin.from('profiles').select('avatar_url').eq('id', row.user_id).maybeSingle();
        avatarUrl = profile?.avatar_url || '';
    }
    return {
        id: row.id as string,
        userId: row.user_id as string,
        language: isResumeLanguage(row.language) ? row.language : 'en',
        data,
        style,
        avatarUrl,
    };
});

/** Idioma de la página: el que eligió el visitante o, si no eligió ninguno, el del CV. */
async function pageLocale(cvLanguage: string): Promise<string> {
    const chosen = (await cookies()).get('locale')?.value;
    return chosen && LOCALES.includes(chosen) ? chosen : cvLanguage;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const cv = await loadPublicResume(slug);
    const t = await getTranslations({ locale: await pageLocale(cv?.language ?? 'en'), namespace: 'public_cv' });
    if (!cv) return { title: t('unavailable_title'), robots: { index: false, follow: false } };
    const p = cv.data.personal;
    const title = [p.fullName, p.headline].filter(Boolean).join(' · ') || t('meta_fallback');
    const description = (cv.data.summary || t('meta_description', { name: p.fullName || 'CV' })).replace(/\s+/g, ' ').slice(0, 160);
    return {
        title: { absolute: `${title} | ${SITE.name}` },
        description,
        robots: { index: false, follow: true },
        alternates: { canonical: publicResumeUrl(slug) },
        openGraph: {
            type: 'profile',
            title,
            description,
            url: publicResumeUrl(slug),
            siteName: SITE.name,
            ...(cv.avatarUrl ? { images: [{ url: cv.avatarUrl }] } : {}),
        },
        twitter: { card: 'summary', title, description },
    };
}

export default async function PublicResumePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cv = await loadPublicResume(slug);
    if (!cv) notFound();

    const t = await getTranslations({ locale: await pageLocale(cv.language), namespace: 'public_cv' });

    // Visitas: no cuenta las del propio dueño.
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (user?.id !== cv.userId) {
        await createAdminClient().rpc('bump_resume_views', { p_id: cv.id }).then(() => undefined, () => undefined);
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            <header className="page-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
                    <FileText size={18} /> {SITE.name}
                </Link>
                <Link href={SIGNUP_URL} className="btn btn-secondary btn-sm" id="public-cv-header-cta">{t('header_cta')}</Link>
            </header>

            <main style={{ flex: 1, width: '100%', maxWidth: '860px', margin: '0 auto', padding: '24px 16px 40px' }}>
                <h1 className="sr-only">{[cv.data.personal.fullName, cv.data.personal.headline].filter(Boolean).join(' · ')}</h1>
                <PublicResumeView
                    data={cv.data}
                    style={cv.style}
                    language={cv.language}
                    avatarUrl={cv.avatarUrl}
                    labels={{ download: t('download'), loading: t('loading') }}
                />

                <section className="card" style={{ marginTop: '32px', textAlign: 'center', padding: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Sparkles size={17} /> {t('cta_title')}
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>{t('cta_text')}</p>
                    <Link href={SIGNUP_URL} className="btn btn-primary" id="public-cv-cta">{t('cta_button')}</Link>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
