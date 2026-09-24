import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/plans';
import { getUserPlan, getUsageSummary } from '@/lib/usage';

// Límites de tamaño: protegen el coste de la IA y el payload hacia n8n.
const MAX_SHORT_FIELD = 200;
const MAX_REQUIREMENTS = 15000;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { company, position, job_requirements, cv_id, cv_url, language } = body;

        const supabase = await createClient();

        // 1. Get the authenticated user from the session — DO NOT TRUST body.user_id
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!company || !position || !job_requirements || !cv_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (
            String(company).length > MAX_SHORT_FIELD ||
            String(position).length > MAX_SHORT_FIELD ||
            String(job_requirements).length > MAX_REQUIREMENTS
        ) {
            return NextResponse.json({ error: 'Input too long' }, { status: 400 });
        }

        // The callback URL must come from configuration, never from request headers:
        // n8n sends the webhook secret to it.
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl) {
            console.error('NEXT_PUBLIC_APP_URL is not configured');
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        // 2. Validate CV ownership
        const { data: cv, error: cvError } = await supabase
            .from('cvs')
            .select('id')
            .eq('id', cv_id)
            .eq('user_id', user.id)
            .single();

        if (cvError || !cv) {
            return NextResponse.json({ error: 'CV not found or unauthorized' }, { status: 403 });
        }

        // 3. Consume one generation from this month's quota (atomic, server-side)
        const admin = createAdminClient();
        const plan = await getUserPlan(admin, user.id);
        const { data: usageId, error: usageError } = await admin.rpc('consume_generation', {
            p_user: user.id,
            p_limit: PLANS[plan].monthlyLimit,
        });
        // Si aún no se ha ejecutado supabase/migrations/002_freemium.sql, no se bloquea a nadie.
        const migrationMissing = usageError && ['PGRST202', '42883', '42P01', 'PGRST205'].includes(usageError.code ?? '');
        if (usageError && !migrationMissing) {
            console.error('Quota check error:', usageError);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
        if (migrationMissing) {
            console.error('Freemium migration not applied: quota is NOT enforced. Run supabase/migrations/002_freemium.sql');
        } else if (!usageId) {
            const usage = await getUsageSummary(admin, user.id);
            return NextResponse.json({ error: 'quota_exceeded', ...usage }, { status: 402 });
        }
        // If anything below fails, the generation doesn't count.
        const refund = async () => {
            if (usageId) await admin.from('generation_usage').delete().eq('id', usageId);
        };

        // 4. Create a pending cover letter record
        const { data: coverLetter, error: dbError } = await supabase
            .from('cover_letters')
            .insert({
                user_id: user.id,
                company,
                position,
                job_requirements,
                cv_id,
                language,
                status: 'pending',
            })
            .select('id')
            .single();

        if (dbError || !coverLetter) {
            console.error('DB Insert Error:', dbError);
            await refund();
            return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
        }

        if (usageId) {
            await admin.from('generation_usage').update({ cover_letter_id: coverLetter.id }).eq('id', usageId);
        }

        // 5. Build the callback URL for n8n to call back
        const callbackUrl = `${appUrl}/api/webhook/receive`;

        // 6. Generate a signed URL so n8n can download the private CV
        let signedCvUrl = cv_url;
        if (cv_url) {
            const storageMatch = cv_url.match(/\/storage\/v1\/object\/(?:public|sign)\/cvs\/(.+)/);
            if (storageMatch) {
                const filePath = storageMatch[1];
                const { data: signedData } = await supabase.storage
                    .from('cvs')
                    .createSignedUrl(filePath, 3600);
                if (signedData?.signedUrl) {
                    signedCvUrl = signedData.signedUrl;
                }
            }
        }

        // 7. Send webhook to n8n with timeout
        const n8nPayload = {
            cover_letter_id: coverLetter.id,
            company,
            position,
            job_requirements,
            cv_url: signedCvUrl,
            language,
            callback_url: callbackUrl,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(n8nPayload),
                signal: controller.signal,
            });

            if (!n8nResponse.ok) {
                console.error(`n8n Error [${n8nResponse.status}]:`, await n8nResponse.text());
                await supabase.from('cover_letters').update({ status: 'error' }).eq('id', coverLetter.id);
                await refund();
                return NextResponse.json({ error: 'External automation failed' }, { status: 502 });
            }
        } catch (err: any) {
            console.error('Webhook Fetch Error:', err.name === 'AbortError' ? 'Timeout' : err);
            await supabase.from('cover_letters').update({ status: 'error' }).eq('id', coverLetter.id);
            await refund();
            return NextResponse.json({ error: err.name === 'AbortError' ? 'Generation timed out' : 'Failed to reach automation' }, { status: 504 });
        } finally {
            clearTimeout(timeoutId);
        }

        return NextResponse.json({ cover_letter_id: coverLetter.id });
    } catch (error) {
        console.error('Generate error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
