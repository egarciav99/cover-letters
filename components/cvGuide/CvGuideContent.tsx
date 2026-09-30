import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { CV_GUIDE_TIPS, type CvGuideTip, type CvGuideTipText } from '@/lib/cvGuide';

/** Las 8 claves de la guía de CV. Se usa en la página pública y en el creador de CV. */
export default function CvGuideContent({ highlight }: { highlight?: CvGuideTip | null }) {
    const t = useTranslations('cv_guide');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {CV_GUIDE_TIPS.map((id) => {
                const tip = t.raw(`tips.${id}`) as CvGuideTipText;
                return (
                    <section
                        key={id}
                        id={`tip-${id}`}
                        className="card"
                        style={{ padding: '18px 20px', scrollMarginTop: '16px', ...(highlight === id ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } : {}) }}
                    >
                        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{tip.title}</h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '10px' }}>{tip.why}</p>
                        <ul style={{ paddingLeft: '18px', fontSize: '14px', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                            {tip.how.map((h) => <li key={h}>{h}</li>)}
                        </ul>
                        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                            <p style={{ fontSize: '13px', lineHeight: 1.45, padding: '8px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--error, #ef4444)' }}><X size={13} /> {t('bad')}:</strong> {tip.bad}
                            </p>
                            <p style={{ fontSize: '13px', lineHeight: 1.45, padding: '8px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}><Check size={13} /> {t('good')}:</strong> {tip.good}
                            </p>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
