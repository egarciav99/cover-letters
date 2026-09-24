import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

        // 3. Create a pending cover letter record
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
            return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
        }

        // 4. Build the callback URL for n8n to call back
        const callbackUrl = `${appUrl}/api/webhook/receive`;

        // 5. Generate a signed URL so n8n can download the private CV
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

        // 6. Send webhook to n8n with timeout
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
                return NextResponse.json({ error: 'External automation failed' }, { status: 502 });
            }
        } catch (err: any) {
            console.error('Webhook Fetch Error:', err.name === 'AbortError' ? 'Timeout' : err);
            await supabase.from('cover_letters').update({ status: 'error' }).eq('id', coverLetter.id);
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
