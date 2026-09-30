'use client';

import { useTranslations } from 'next-intl';
import { CircleQuestionMark } from 'lucide-react';
import type { CvGuideTip, CvGuideTipText } from '@/lib/cvGuide';

/** Botón "?" junto al título de una sección del CV: abre la clave de la guía que le corresponde. */
export default function TipButton({ tip, onOpen }: { tip: CvGuideTip; onOpen: (tip: CvGuideTip) => void }) {
    const t = useTranslations('cv_guide');
    const label = t('tip_help', { title: (t.raw(`tips.${tip}`) as CvGuideTipText).title.replace(/^\d+\.\s*/, '') });
    return (
        <button type="button" onClick={() => onOpen(tip)} aria-label={label} title={label}
            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
            <CircleQuestionMark size={16} />
        </button>
    );
}
