import type { Metadata } from 'next';
import LegalShell, { legalLang } from '@/components/legal/LegalShell';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Cookies', alternates: { canonical: '/cookies' } };

export default async function CookiesPage() {
    const lang = await legalLang();

    if (lang === 'es') {
        return (
            <LegalShell title="Política de cookies">
                <h2>1. Qué son</h2>
                <p>
                    Las cookies son pequeños archivos que el navegador guarda al visitar una web. {SITE.name} usa las
                    mínimas: las necesarias para que puedas iniciar sesión y recordar tu idioma.
                </p>

                <h2>2. Cookies que usamos</h2>
                <table>
                    <thead><tr><th>Cookie</th><th>Titular</th><th>Para qué</th><th>Duración</th></tr></thead>
                    <tbody>
                        <tr><td><code>sb-…-auth-token</code></td><td>{SITE.name} (Supabase)</td><td>Mantener tu sesión iniciada. Técnica y necesaria.</td><td>Mientras dure la sesión</td></tr>
                        <tr><td><code>locale</code></td><td>{SITE.name}</td><td>Recordar el idioma que eliges. Técnica.</td><td>1 año</td></tr>
                    </tbody>
                </table>
                <p>
                    Las cookies técnicas no necesitan tu consentimiento (art. 22.2 de la LSSI-CE) porque sin ellas el
                    servicio no funciona. Las estadísticas de visitas (Vercel Web Analytics) no usan cookies.
                </p>

                <h2>3. Publicidad (plan gratis)</h2>
                <p>
                    Si mostramos anuncios de Google AdSense, Google puede usar cookies propias (por ejemplo{' '}
                    <code>__gads</code> o <code>__gpi</code>) para medir y, si lo aceptas, personalizar los anuncios.
                    Antes de usarlas verás un mensaje de consentimiento de Google, donde puedes aceptar, rechazar o elegir
                    finalidades. Puedes cambiar tu decisión cuando quieras en «Configuración de cookies», al pie de la
                    página. Más información en la{' '}
                    <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">política de publicidad de Google</a>.
                </p>

                <h2>4. Cómo borrarlas</h2>
                <p>
                    Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas las técnicas,
                    no podrás iniciar sesión.
                </p>
            </LegalShell>
        );
    }

    return (
        <LegalShell title="Cookie policy">
            <h2>1. What they are</h2>
            <p>
                Cookies are small files your browser stores when you visit a website. {SITE.name} uses as few as
                possible: the ones needed to keep you signed in and remember your language.
            </p>

            <h2>2. Cookies we use</h2>
            <table>
                <thead><tr><th>Cookie</th><th>Owner</th><th>Purpose</th><th>Duration</th></tr></thead>
                <tbody>
                    <tr><td><code>sb-…-auth-token</code></td><td>{SITE.name} (Supabase)</td><td>Keep you signed in. Strictly necessary.</td><td>Session</td></tr>
                    <tr><td><code>locale</code></td><td>{SITE.name}</td><td>Remember your language. Functional.</td><td>1 year</td></tr>
                </tbody>
            </table>
            <p>
                Strictly necessary cookies do not require consent because the service cannot work without them. Visit
                statistics (Vercel Web Analytics) do not use cookies.
            </p>

            <h2>3. Advertising (free plan)</h2>
            <p>
                If we show Google AdSense ads, Google may use its own cookies (for example <code>__gads</code> or{' '}
                <code>__gpi</code>) to measure and, if you agree, personalise ads. Before they are used you will see a
                Google consent message where you can accept, reject or choose purposes. You can change your choice at
                any time via &quot;Cookie settings&quot; in the footer. More information in{' '}
                <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google&apos;s advertising policy</a>.
            </p>

            <h2>4. How to delete them</h2>
            <p>
                You can delete or block cookies in your browser settings. If you block the strictly necessary ones, you
                will not be able to sign in.
            </p>
        </LegalShell>
    );
}
