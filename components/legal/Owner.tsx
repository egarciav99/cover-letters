import { SITE } from '@/lib/site';
import type { LegalLang } from './LegalShell';

/** Datos identificativos del titular. NIF y domicilio solo aparecen cuando están configurados. */
export default function Owner({ lang }: { lang: LegalLang }) {
    const L = lang === 'es'
        ? { owner: 'Titular', tax: 'NIF', address: 'Domicilio', email: 'Correo de contacto' }
        : { owner: 'Owner', tax: 'Tax ID', address: 'Address', email: 'Contact email' };
    return (
        <ul>
            <li><strong>{L.owner}:</strong> {SITE.owner.name}</li>
            {SITE.owner.taxId && <li><strong>{L.tax}:</strong> {SITE.owner.taxId}</li>}
            {SITE.owner.address && <li><strong>{L.address}:</strong> {SITE.owner.address}</li>}
            <li><strong>{L.email}:</strong> <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></li>
        </ul>
    );
}
