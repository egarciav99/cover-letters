import type { Metadata } from 'next';
import LegalShell, { legalLang } from '@/components/legal/LegalShell';
import { SITE } from '@/lib/site';
import { PLANS } from '@/lib/plans';

export const metadata: Metadata = { title: 'Condiciones de uso · Terms of use', alternates: { canonical: '/terms' } };

const FREE = PLANS.free.monthlyLimit;
const PRO_CAP = PLANS.pro.monthlyLimit;

export default async function TermsPage() {
    const lang = await legalLang();
    const proPriceEs = PLANS.pro.priceEur.toFixed(2).replace('.', ',') + ' €';
    const proPriceEn = '€' + PLANS.pro.priceEur.toFixed(2);

    if (lang === 'es') {
        return (
            <LegalShell title="Condiciones de uso">
                <h2>1. Quiénes somos y qué ofrecemos</h2>
                <p>
                    {SITE.name} es un servicio de {SITE.owner.name} (ver <a href="/legal">Aviso legal</a>) que redacta
                    borradores de cartas de presentación con inteligencia artificial a partir de tu CV y de una oferta de
                    empleo. Al crear una cuenta aceptas estas condiciones.
                </p>

                <h2>2. Tu cuenta</h2>
                <ul>
                    <li>Debes tener 16 años o más y dar datos veraces.</li>
                    <li>Eres responsable de guardar tu contraseña y de lo que se haga con tu cuenta.</li>
                    <li>Solo puedes subir CV y datos propios, o de terceros si tienes su permiso.</li>
                </ul>

                <h2>3. Planes</h2>
                <ul>
                    <li>
                        <strong>Gratis:</strong> {FREE} cartas por mes natural. El contador se renueva el día 1 de cada mes
                        (hora UTC) y las cartas no usadas no se acumulan. Incluye anuncios, que nunca aparecen dentro del
                        editor ni en el PDF.
                    </li>
                    <li>
                        <strong>Pro:</strong> {proPriceEs} al mes (IVA incluido cuando corresponda), sin anuncios y con
                        cartas ilimitadas sujetas a un uso razonable de hasta {PRO_CAP} cartas al mes. La suscripción se
                        renueva cada mes de forma automática y puedes cancelarla cuando quieras: seguirás teniendo Pro
                        hasta el final del periodo pagado. Mientras el pago no esté disponible, el plan Pro aparece como
                        «Próximamente».
                    </li>
                    <li>Si una generación falla por un error nuestro, no cuenta para tu límite.</li>
                </ul>

                <h2>4. Derecho de desistimiento</h2>
                <p>
                    Como consumidor, tienes 14 días desde la contratación de Pro para desistir. Al contratar, pides que el
                    servicio empiece de inmediato; si ya has generado cartas con Pro durante esos días, el reembolso se
                    ajustará al servicio ya prestado, según la normativa de consumo. Para ejercerlo, escribe a{' '}
                    <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
                </p>

                <h2>5. Contenido generado con IA</h2>
                <ul>
                    <li>Las cartas son borradores. Pueden contener errores o datos imprecisos: revísalas siempre antes de enviarlas.</li>
                    <li>No garantizamos resultados en tus procesos de selección.</li>
                    <li>El texto generado es tuyo y puedes usarlo libremente.</li>
                </ul>

                <h2>6. Uso aceptable</h2>
                <p>No está permitido:</p>
                <ul>
                    <li>Automatizar peticiones, revender el servicio o intentar saltarse los límites del plan.</li>
                    <li>Subir contenido ilícito, engañoso o que vulnere derechos de terceros.</li>
                    <li>Usar el servicio para suplantar a otra persona.</li>
                </ul>
                <p>Podemos suspender cuentas que incumplan estas normas, avisando cuando sea posible.</p>

                <h2>7. Disponibilidad y responsabilidad</h2>
                <p>
                    Trabajamos para que el servicio esté disponible, pero puede haber interrupciones por mantenimiento o
                    por fallos de proveedores. Nuestra responsabilidad se limita, en la medida que permita la ley, al
                    importe que hayas pagado en los últimos 12 meses. Nada de esto limita tus derechos como consumidor.
                </p>

                <h2>8. Baja</h2>
                <p>
                    Puedes eliminar tu cuenta cuando quieras desde tu perfil en el panel. Se borrarán tus datos como
                    explica la <a href="/privacy">Política de privacidad</a>. Si tienes Pro activo, cancélalo antes.
                </p>

                <h2>9. Cambios</h2>
                <p>
                    Si cambiamos estas condiciones o los precios, te avisaremos con antelación razonable. Los cambios de
                    precio no afectan al periodo que ya hayas pagado.
                </p>

                <h2>10. Ley aplicable</h2>
                <p>
                    Estas condiciones se rigen por la ley española. Si eres consumidor, puedes acudir a los tribunales de
                    tu domicilio.
                </p>
            </LegalShell>
        );
    }

    return (
        <LegalShell title="Terms of use">
            <h2>1. Who we are and what we offer</h2>
            <p>
                {SITE.name} is a service provided by {SITE.owner.name} (see <a href="/legal">Legal notice</a>) that
                drafts cover letters with artificial intelligence from your CV and a job offer. By creating an account you
                accept these terms.
            </p>

            <h2>2. Your account</h2>
            <ul>
                <li>You must be 16 or older and provide accurate information.</li>
                <li>You are responsible for keeping your password safe and for activity on your account.</li>
                <li>Only upload your own CV and data, or third-party data you have permission to use.</li>
            </ul>

            <h2>3. Plans</h2>
            <ul>
                <li>
                    <strong>Free:</strong> {FREE} letters per calendar month. The counter resets on the 1st of each month
                    (UTC) and unused letters do not roll over. Includes ads, which never appear inside the editor or in
                    the PDF.
                </li>
                <li>
                    <strong>Pro:</strong> {proPriceEn} per month (VAT included where applicable), no ads and unlimited
                    letters subject to fair use of up to {PRO_CAP} letters per month. The subscription renews monthly and
                    you can cancel at any time: you keep Pro until the end of the paid period. While payments are not
                    available, Pro is shown as &quot;Coming soon&quot;.
                </li>
                <li>If a generation fails because of an error on our side, it does not count towards your limit.</li>
            </ul>

            <h2>4. Right of withdrawal</h2>
            <p>
                As a consumer, you have 14 days from purchasing Pro to withdraw. When you subscribe, you ask for the
                service to start immediately; if you have already generated letters with Pro during that period, any
                refund will be proportionate to the service already provided, as consumer law allows. To withdraw, email{' '}
                <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
            </p>

            <h2>5. AI-generated content</h2>
            <ul>
                <li>Letters are drafts. They may contain mistakes or inaccurate details: always review them before sending.</li>
                <li>We do not guarantee any outcome in your job applications.</li>
                <li>The generated text is yours to use freely.</li>
            </ul>

            <h2>6. Acceptable use</h2>
            <p>You may not:</p>
            <ul>
                <li>Automate requests, resell the service or try to bypass plan limits.</li>
                <li>Upload unlawful or misleading content, or content that infringes third-party rights.</li>
                <li>Use the service to impersonate someone else.</li>
            </ul>
            <p>We may suspend accounts that break these rules, with notice where possible.</p>

            <h2>7. Availability and liability</h2>
            <p>
                We work to keep the service available, but there may be interruptions for maintenance or provider
                failures. To the extent permitted by law, our liability is limited to the amount you paid in the last 12
                months. Nothing here limits your statutory consumer rights.
            </p>

            <h2>8. Closing your account</h2>
            <p>
                You can delete your account at any time from your profile in the dashboard. Your data will be deleted as
                described in the <a href="/privacy">Privacy policy</a>. If you have an active Pro plan, cancel it first.
            </p>

            <h2>9. Changes</h2>
            <p>
                If we change these terms or our prices, we will give you reasonable notice. Price changes do not affect a
                period you have already paid for.
            </p>

            <h2>10. Governing law</h2>
            <p>These terms are governed by Spanish law. If you are a consumer, you may go to the courts of your place of residence.</p>
        </LegalShell>
    );
}
