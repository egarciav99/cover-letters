'use client';

import { useTranslations } from 'next-intl';

/** Opción "Ajustar a una página" del CV y estado del ajuste. */
export default function FitOnePage({ checked, onChange, density, fits, pageCount }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    density: number;
    fits: boolean | null;
    pageCount: number;
}) {
    const t = useTranslations('resume');
    const status = !checked ? null
        : fits === false ? t('fit_no', { count: pageCount })
        : fits && density > 0 ? t('fit_compacted')
        : fits ? t('fit_yes') : null;
    return (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} id="toggle-fit-one-page" />
                {t('fit_label')}
            </label>
            {status && (
                <p style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '6px', color: fits === false ? 'var(--warning)' : 'var(--text-muted)' }} role="status">
                    {status}
                </p>
            )}
        </div>
    );
}
