'use client';

import { useTranslations } from 'next-intl';
import { Lightbulb } from 'lucide-react';
import type { HintKey } from '@/lib/resumeAssist';

/** Consejo rápido bajo un campo del CV (sin IA). */
export default function Hint({ hint }: { hint?: HintKey }) {
    const t = useTranslations('resume');
    if (!hint) return null;
    return (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start', lineHeight: 1.45 }}>
            <Lightbulb size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--warning, #f59e0b)' }} /> {t(hint)}
        </p>
    );
}
