'use client';

/** Puntuación de encaje 0-100 en un anillo, con el color según el nivel. */
export default function ScoreBadge({ score, label, size = 72 }: { score: number; label?: string; size?: number }) {
    const color = score >= 85 ? 'var(--success, #22c55e)' : score >= 65 ? 'var(--accent-light, #60a5fa)' : score >= 40 ? 'var(--warning, #f59e0b)' : 'var(--error, #ef4444)';
    const r = size / 2 - 5;
    const c = 2 * Math.PI * r;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ? `${label}: ` : ''}${score}/100`}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(c * score) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
                <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 3.6} fontWeight="700" fill="currentColor">{score}</text>
            </svg>
            {label && <span style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '110px', lineHeight: 1.3 }}>{label}</span>}
        </div>
    );
}
