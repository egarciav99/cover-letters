import type { SupabaseClient } from '@supabase/supabase-js';

export const APPLICATION_STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
    saved: 'var(--text-muted)',
    applied: 'var(--accent-light)',
    interview: 'var(--warning)',
    offer: 'var(--success)',
    rejected: 'var(--error)',
};

export interface InterviewQuestion {
    category: string;
    question: string;
    why: string;
    tips: string;
    sample_answer: string;
}

export interface InterviewPrep {
    questions: InterviewQuestion[];
    questions_to_ask: string[];
    key_points: string[];
    generated_at: string;
}

export interface Application {
    id: string;
    company: string;
    position: string;
    status: ApplicationStatus;
    url: string | null;
    notes: string | null;
    job_description: string | null;
    applied_at: string | null;
    cover_letter_id: string | null;
    resume_id: string | null;
    interview_prep: InterviewPrep | null;
    created_at: string;
    updated_at: string;
}

/** Cifras del tablero. La tasa de respuesta cuenta entrevistas y ofertas sobre las candidaturas enviadas. */
export function applicationStats(apps: Pick<Application, 'status'>[]) {
    const count = (s: ApplicationStatus) => apps.filter((a) => a.status === s).length;
    const sent = apps.length - count('saved');
    const positive = count('interview') + count('offer');
    return {
        total: apps.length,
        sent,
        interviews: count('interview'),
        offers: count('offer'),
        responseRate: sent > 0 ? Math.round((positive / sent) * 100) : null,
    };
}

/**
 * Tras generar una carta, la apunta en el seguimiento: actualiza la candidatura de esa
 * empresa y puesto si ya existe, o crea una nueva. Si falla (límite del plan gratis o
 * migración 006 sin ejecutar) no pasa nada: la carta es lo importante.
 */
export async function trackLetterApplication(
    admin: SupabaseClient,
    userId: string,
    job: { company: string; position: string; requirements: string; coverLetterId: string },
) {
    try {
        const { data: existing } = await admin
            .from('applications')
            .select('id')
            .eq('user_id', userId)
            .ilike('company', job.company.replace(/[%_\\]/g, '\\$&'))
            .ilike('position', job.position.replace(/[%_\\]/g, '\\$&'))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (existing) {
            await admin.from('applications')
                .update({ cover_letter_id: job.coverLetterId, job_description: job.requirements.slice(0, 15000) })
                .eq('id', existing.id);
            return;
        }
        await admin.from('applications').insert({
            user_id: userId,
            company: job.company.slice(0, 200),
            position: job.position.slice(0, 200),
            status: 'saved',
            job_description: job.requirements.slice(0, 15000),
            cover_letter_id: job.coverLetterId,
        });
    } catch (err) {
        console.error('Track application error:', err);
    }
}
