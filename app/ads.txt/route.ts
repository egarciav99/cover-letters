import { ADSENSE_CLIENT } from '@/lib/site';

/** ads.txt que exige AdSense. Vacío mientras no haya cuenta configurada. */
export function GET() {
    const publisher = ADSENSE_CLIENT.replace(/^ca-/, '');
    const body = publisher ? `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n` : '';
    return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
