/** Datos públicos del sitio y del titular (aviso legal, privacidad, SEO). */
export const SITE = {
    name: 'CoverCraft',
    url: (process.env.NEXT_PUBLIC_APP_URL || 'https://coverletter2.vercel.app').replace(/\/+$/, ''),
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'elier.garcia@egsolutions.tech',
    /** Titular del servicio. NIF y domicilio se muestran cuando se configuran. */
    owner: {
        name: process.env.NEXT_PUBLIC_LEGAL_NAME || 'Elier García',
        taxId: process.env.NEXT_PUBLIC_LEGAL_TAX_ID || '',
        address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '',
    },
    /** Fecha de la última revisión de los textos legales. */
    legalUpdated: '2026-09-24',
};

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
export const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT || '';
