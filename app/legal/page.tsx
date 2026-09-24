import type { Metadata } from 'next';
import LegalShell, { legalLang } from '@/components/legal/LegalShell';
import Owner from '@/components/legal/Owner';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Aviso legal · Legal notice', alternates: { canonical: '/legal' } };

export default async function LegalNoticePage() {
    const lang = await legalLang();

    if (lang === 'es') {
        return (
            <LegalShell title="Aviso legal">
                <h2>1. Datos del titular</h2>
                <p>
                    En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de
                    Comercio Electrónico (LSSI-CE), se informa de los datos del titular de {SITE.name} ({SITE.url}):
                </p>
                <Owner lang="es" />

                <h2>2. Objeto</h2>
                <p>
                    {SITE.name} es una aplicación web que ayuda a redactar cartas de presentación a partir del CV de la
                    persona usuaria y de la descripción de una oferta de empleo, usando inteligencia artificial. El uso del
                    servicio se rige por las <a href="/terms">Condiciones de uso</a> y la{' '}
                    <a href="/privacy">Política de privacidad</a>.
                </p>

                <h2>3. Propiedad intelectual</h2>
                <p>
                    El diseño, el código y los textos propios de {SITE.name} pertenecen a su titular. Las cartas que
                    generas y los documentos que subes son tuyos: puedes usarlos libremente.
                </p>

                <h2>4. Responsabilidad</h2>
                <p>
                    El contenido generado por IA puede contener errores. Revisa siempre cada carta antes de enviarla. El
                    titular no responde de las decisiones que tomen terceros a partir de las cartas ni de las
                    interrupciones del servicio ajenas a su control. Los enlaces a sitios de terceros se ofrecen solo a
                    título informativo.
                </p>

                <h2>5. Legislación aplicable</h2>
                <p>
                    Este sitio se rige por la legislación española. Si eres consumidor, podrás acudir a los juzgados de tu
                    domicilio.
                </p>
            </LegalShell>
        );
    }

    return (
        <LegalShell title="Legal notice">
            <h2>1. Owner</h2>
            <p>
                In accordance with Article 10 of Spanish Law 34/2002 on Information Society Services and Electronic
                Commerce (LSSI-CE), the owner of {SITE.name} ({SITE.url}) is:
            </p>
            <Owner lang="en" />

            <h2>2. Purpose</h2>
            <p>
                {SITE.name} is a web application that helps you write cover letters from your CV and a job description,
                using artificial intelligence. Use of the service is governed by the <a href="/terms">Terms of use</a>{' '}
                and the <a href="/privacy">Privacy policy</a>.
            </p>

            <h2>3. Intellectual property</h2>
            <p>
                The design, code and original texts of {SITE.name} belong to its owner. The letters you generate and the
                documents you upload are yours to use freely.
            </p>

            <h2>4. Liability</h2>
            <p>
                AI-generated content may contain mistakes. Always review each letter before sending it. The owner is not
                liable for decisions made by third parties based on the letters, or for service interruptions beyond its
                control. Links to third-party sites are provided for information only.
            </p>

            <h2>5. Governing law</h2>
            <p>
                This site is governed by Spanish law. If you are a consumer, you may bring proceedings in the courts of
                your place of residence.
            </p>
        </LegalShell>
    );
}
