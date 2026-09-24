import type { Metadata } from 'next';
import LegalShell, { legalLang } from '@/components/legal/LegalShell';
import Owner from '@/components/legal/Owner';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacidad · Privacy', alternates: { canonical: '/privacy' } };

export default async function PrivacyPage() {
    const lang = await legalLang();

    if (lang === 'es') {
        return (
            <LegalShell title="Política de privacidad">
                <h2>1. Responsable del tratamiento</h2>
                <Owner lang="es" />

                <h2>2. Qué datos tratamos</h2>
                <ul>
                    <li><strong>Cuenta:</strong> correo electrónico y contraseña (la contraseña se guarda cifrada por nuestro proveedor de autenticación; nunca la vemos).</li>
                    <li><strong>Perfil:</strong> nombre, teléfono, URL de LinkedIn y foto, si decides añadirlos.</li>
                    <li><strong>CV:</strong> los archivos PDF que subes, con los datos que contengan.</li>
                    <li><strong>Ofertas y cartas:</strong> empresa, puesto, descripción de la oferta y las cartas generadas.</li>
                    <li><strong>Uso:</strong> fecha de cada carta generada, para aplicar el límite de tu plan.</li>
                    <li><strong>Datos técnicos:</strong> registros del servidor (dirección IP, navegador) necesarios para la seguridad del servicio.</li>
                    <li><strong>Pago (plan Pro):</strong> lo gestiona Stripe. No guardamos los datos de tu tarjeta.</li>
                </ul>
                <p>No subas a tu CV datos especialmente protegidos (salud, ideología, etc.) que no sean necesarios para tu candidatura.</p>

                <h2>3. Para qué y con qué base legal</h2>
                <table>
                    <thead><tr><th>Finalidad</th><th>Base legal (RGPD)</th></tr></thead>
                    <tbody>
                        <tr><td>Crear tu cuenta y generar, guardar y exportar tus cartas</td><td>Ejecución del contrato (art. 6.1.b)</td></tr>
                        <tr><td>Aplicar los límites de cada plan y evitar abusos</td><td>Ejecución del contrato e interés legítimo (art. 6.1.b y 6.1.f)</td></tr>
                        <tr><td>Cobrar el plan Pro y emitir facturas</td><td>Contrato y obligación legal (art. 6.1.b y 6.1.c)</td></tr>
                        <tr><td>Mostrar anuncios en el plan gratis</td><td>Anuncios personalizados: tu consentimiento (art. 6.1.a). Sin consentimiento, los anuncios no usan cookies de perfil.</td></tr>
                        <tr><td>Estadísticas de visitas agregadas y sin cookies</td><td>Interés legítimo (art. 6.1.f)</td></tr>
                    </tbody>
                </table>
                <p>No vendemos tus datos ni los usamos para entrenar modelos de inteligencia artificial.</p>

                <h2>4. Cómo se genera tu carta</h2>
                <p>
                    Cuando pides una carta, enviamos a nuestra plataforma de automatización (n8n) un enlace temporal y
                    privado a tu CV y los datos de la oferta. El texto de tu CV y de la oferta se envía a la API de
                    Google Gemini para redactar la carta, que vuelve a tu cuenta. La IA solo redacta un borrador: no toma
                    decisiones sobre ti.
                </p>

                <h2>5. Con quién compartimos datos</h2>
                <p>Solo con proveedores que nos prestan el servicio (encargados del tratamiento), con contrato conforme al RGPD:</p>
                <ul>
                    <li><strong>Supabase</strong>: base de datos, autenticación y almacenamiento de archivos.</li>
                    <li><strong>Vercel</strong>: alojamiento de la web y estadísticas de visitas sin cookies.</li>
                    <li><strong>n8n</strong>: automatización que prepara y envía la solicitud de la carta.</li>
                    <li><strong>Google</strong>: API de Gemini (redacción de la carta) y, en el plan gratis, Google AdSense (anuncios).</li>
                    <li><strong>Stripe</strong>: cobro del plan Pro, cuando esté disponible.</li>
                </ul>
                <p>
                    Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo. En ese caso lo
                    hacen con garantías adecuadas: el Marco de Privacidad de Datos UE-EE. UU. o las cláusulas
                    contractuales tipo de la Comisión Europea.
                </p>

                <h2>6. Cuánto tiempo los guardamos</h2>
                <ul>
                    <li>Tus datos, CV y cartas: mientras tengas la cuenta. Puedes borrar cada CV o carta cuando quieras.</li>
                    <li>Al eliminar tu cuenta, se borran de inmediato tu perfil, CV, cartas y registro de uso.</li>
                    <li>Datos de facturación del plan Pro: el tiempo que exige la ley (en general, 6 años).</li>
                </ul>

                <h2>7. Tus derechos</h2>
                <p>
                    Puedes acceder a tus datos, rectificarlos, suprimirlos, oponerte o limitar su tratamiento y pedir su
                    portabilidad escribiendo a <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. Puedes
                    borrar tu cuenta directamente desde tu perfil, en el panel. Si has dado tu consentimiento para
                    anuncios personalizados, puedes retirarlo en cualquier momento desde «Configuración de cookies».
                </p>
                <p>
                    Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección
                    de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>).
                </p>

                <h2>8. Edad mínima</h2>
                <p>{SITE.name} está dirigido a personas de 16 años o más.</p>

                <h2>9. Seguridad</h2>
                <p>
                    Los CV se guardan en almacenamiento privado; cada usuario solo puede acceder a sus propios datos.
                    Las conexiones van cifradas (HTTPS).
                </p>

                <h2>10. Cambios</h2>
                <p>Si cambiamos esta política de forma importante, te avisaremos en la aplicación o por correo.</p>
            </LegalShell>
        );
    }

    return (
        <LegalShell title="Privacy policy">
            <h2>1. Data controller</h2>
            <Owner lang="en" />

            <h2>2. What data we process</h2>
            <ul>
                <li><strong>Account:</strong> email address and password (the password is stored hashed by our authentication provider; we never see it).</li>
                <li><strong>Profile:</strong> name, phone, LinkedIn URL and photo, if you choose to add them.</li>
                <li><strong>CV:</strong> the PDF files you upload and the data they contain.</li>
                <li><strong>Job offers and letters:</strong> company, position, job description and the generated letters.</li>
                <li><strong>Usage:</strong> the date of each generated letter, to apply your plan&apos;s limit.</li>
                <li><strong>Technical data:</strong> server logs (IP address, browser) needed to keep the service secure.</li>
                <li><strong>Payment (Pro plan):</strong> handled by Stripe. We do not store your card details.</li>
            </ul>
            <p>Please do not include special-category data (health, beliefs, etc.) in your CV unless it is necessary for your application.</p>

            <h2>3. Purposes and legal bases</h2>
            <table>
                <thead><tr><th>Purpose</th><th>Legal basis (GDPR)</th></tr></thead>
                <tbody>
                    <tr><td>Create your account and generate, store and export your letters</td><td>Performance of a contract (Art. 6(1)(b))</td></tr>
                    <tr><td>Apply plan limits and prevent abuse</td><td>Contract and legitimate interest (Art. 6(1)(b) and (f))</td></tr>
                    <tr><td>Charge the Pro plan and issue invoices</td><td>Contract and legal obligation (Art. 6(1)(b) and (c))</td></tr>
                    <tr><td>Show ads on the free plan</td><td>Personalised ads: your consent (Art. 6(1)(a)). Without consent, ads do not use profiling cookies.</td></tr>
                    <tr><td>Aggregated, cookie-free visit statistics</td><td>Legitimate interest (Art. 6(1)(f))</td></tr>
                </tbody>
            </table>
            <p>We do not sell your data or use it to train artificial intelligence models.</p>

            <h2>4. How your letter is generated</h2>
            <p>
                When you request a letter, we send our automation platform (n8n) a temporary private link to your CV and
                the job details. The text of your CV and the job offer is sent to the Google Gemini API to draft the
                letter, which is then saved to your account. The AI only drafts text: it does not make decisions about you.
            </p>

            <h2>5. Who we share data with</h2>
            <p>Only with providers that help us run the service (data processors), under GDPR-compliant agreements:</p>
            <ul>
                <li><strong>Supabase</strong>: database, authentication and file storage.</li>
                <li><strong>Vercel</strong>: website hosting and cookie-free visit statistics.</li>
                <li><strong>n8n</strong>: automation that prepares and sends the letter request.</li>
                <li><strong>Google</strong>: Gemini API (letter drafting) and, on the free plan, Google AdSense (ads).</li>
                <li><strong>Stripe</strong>: Pro plan payments, once available.</li>
            </ul>
            <p>
                Some of these providers may process data outside the European Economic Area. When they do, they rely on
                appropriate safeguards: the EU-US Data Privacy Framework or the European Commission&apos;s Standard
                Contractual Clauses.
            </p>

            <h2>6. How long we keep data</h2>
            <ul>
                <li>Your data, CVs and letters: while you keep your account. You can delete any CV or letter at any time.</li>
                <li>When you delete your account, your profile, CVs, letters and usage records are deleted immediately.</li>
                <li>Pro plan billing records: for as long as the law requires (generally 6 years).</li>
            </ul>

            <h2>7. Your rights</h2>
            <p>
                You can access, rectify or erase your data, object to or restrict its processing, and request
                portability by writing to <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. You can
                delete your account yourself from your profile in the dashboard. If you consented to personalised ads,
                you can withdraw consent at any time via &quot;Cookie settings&quot;.
            </p>
            <p>
                If you believe we have mishandled your data, you can complain to the Spanish Data Protection Agency (
                <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>) or your local
                supervisory authority.
            </p>

            <h2>8. Minimum age</h2>
            <p>{SITE.name} is intended for people aged 16 or over.</p>

            <h2>9. Security</h2>
            <p>CVs are kept in private storage and each user can only access their own data. Connections are encrypted (HTTPS).</p>

            <h2>10. Changes</h2>
            <p>If we change this policy significantly, we will let you know in the app or by email.</p>
        </LegalShell>
    );
}
