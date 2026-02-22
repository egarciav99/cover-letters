import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { company, position, job_requirements, cv_id, cv_url, language, user_id } = body;

        if (!company || !position || !job_requirements || !cv_id || !user_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Create a pending cover letter record
        const { data: coverLetter, error: dbError } = await supabase
            .from('cover_letters')
            .insert({
                user_id,
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
            return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
        }

        // 2. Build the callback URL for n8n to call back
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '';
        const callbackUrl = `${appUrl}/api/webhook/receive`;

        // 3. Generate a signed URL so n8n can download the private CV
        let signedCvUrl = cv_url;
        if (cv_url) {
            // Extract the storage path from the full URL
            // cv_url format: https://xxx.supabase.co/storage/v1/object/public/cvs/USER_ID/file.pdf
            // or the raw path if stored differently
            const storageMatch = cv_url.match(/\/storage\/v1\/object\/(?:public|sign)\/cvs\/(.+)/);
            if (storageMatch) {
                const filePath = storageMatch[1];
                const { data: signedData } = await supabase.storage
                    .from('cvs')
                    .createSignedUrl(filePath, 3600); // Valid for 1 hour
                if (signedData?.signedUrl) {
                    signedCvUrl = signedData.signedUrl;
                }
            }
        }

        // 4. Send webhook to n8n
        const n8nPayload = {
            cover_letter_id: coverLetter.id,
            company,
            position,
            job_requirements,
            cv_url: signedCvUrl,
            language,
            callback_url: callbackUrl,
        };

        const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload),
        });

        if (!n8nResponse.ok) {
            // Mark as error if n8n is unreachable
            await supabase.from('cover_letters').update({ status: 'error' }).eq('id', coverLetter.id);
            return NextResponse.json({ error: 'Failed to reach n8n webhook' }, { status: 502 });
        }

        return NextResponse.json({ cover_letter_id: coverLetter.id });
    } catch (error) {
        console.error('Generate error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
