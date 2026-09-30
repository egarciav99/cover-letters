/**
 * Guía para un buen CV: 8 claves que se muestran en la página pública /cv-guide, en el creador
 * de CV (botón "?" de cada sección) y que sigue el asistente de IA. Los textos están en
 * messages/*.json, namespace `cv_guide`.
 */

export const CV_GUIDE_TIPS = ['headline', 'summary', 'titles', 'design', 'metrics', 'relevance', 'education', 'languages'] as const;
export type CvGuideTip = (typeof CV_GUIDE_TIPS)[number];

export interface CvGuideTipText {
    title: string;
    why: string;
    how: string[];
    bad: string;
    good: string;
}
