/** Planes de CoverCraft. Cambiar aquí los límites y el precio. */
export const PLANS = {
    free: { id: 'free', monthlyLimit: 3, priceEur: 0, showAds: true, ai: { match: 10, tailor: 0, import: 2, interview: 0, assist: 0 } },
    // "Ilimitado" para el usuario, con un tope interno para controlar el coste de la IA.
    pro: { id: 'pro', monthlyLimit: 100, priceEur: 4.99, showAds: false, ai: { match: 200, tailor: 100, import: 20, interview: 30, assist: 300 } },
} as const;

/** Candidaturas activas en el seguimiento (plan gratis). Pro: sin límite. También en la migración 006. */
export const FREE_APPLICATION_LIMIT = 15;

/** Funciones de IA del CV con cupo mensual propio (aparte de las cartas). */
export type AiKind = keyof (typeof PLANS)['free']['ai'];

export type PlanId = keyof typeof PLANS;

/** El cobro con Stripe se activa cuando haya titular dado de alta. */
export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';

/** Primer día del mes siguiente (UTC), cuando se renueva el cupo. */
export function nextResetDate(now = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
