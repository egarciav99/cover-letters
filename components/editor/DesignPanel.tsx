'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Eye, EyeOff, Palette } from 'lucide-react';
import { ACCENTS, FONTS, TEMPLATES, fontsHref, type FontId, type LetterStyle, type TemplateId } from '@/lib/letterTemplates';

interface DesignPanelProps {
    value: LetterStyle;
    onChange: (style: LetterStyle) => void;
    /** HTML de la carta con el estilo actual (el mismo que va al PDF). */
    previewHtml: string;
}

const PAGE_W = 794;
const PAGE_H = 1123;

/** Miniatura esquemática de cada plantilla. */
function Thumb({ id, accent }: { id: TemplateId; accent: string }) {
    const line = (w: string, extra: React.CSSProperties = {}) => (
        <div style={{ height: 3, width: w, background: '#d1d5db', borderRadius: 2, marginBottom: 3, ...extra }} />
    );
    const lines = <>{line('90%')}{line('100%')}{line('80%')}{line('95%')}{line('60%')}</>;
    const box: React.CSSProperties = { width: '100%', aspectRatio: '0.707', background: '#fff', borderRadius: 4, overflow: 'hidden', position: 'relative' };
    if (id === 'executive') return <div style={box}><div style={{ height: '24%', background: accent }} /><div style={{ padding: 6 }}>{lines}</div></div>;
    if (id === 'classic') return (
        <div style={box}><div style={{ padding: 6 }}>
            {line('50%', { margin: '2px auto 3px', background: accent })}
            <div style={{ height: 1, background: accent, margin: '4px 0 6px' }} />{lines}
        </div></div>
    );
    if (id === 'modern') return <div style={{ ...box, display: 'flex' }}><div style={{ width: '32%', background: accent }} /><div style={{ flex: 1, padding: 6 }}>{lines}</div></div>;
    return <div style={box}><div style={{ padding: 6 }}>{line('60%', { height: 5, background: '#111827' })}{line('20%', { background: accent })}<div style={{ height: 6 }} />{lines}</div></div>;
}

export default function DesignPanel({ value, onChange, previewHtml }: DesignPanelProps) {
    const t = useTranslations('design');
    const [showPreview, setShowPreview] = useState(true);
    const boxRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const update = () => setScale(el.clientWidth / PAGE_W);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [showPreview]);

    const set = (patch: Partial<LetterStyle>) => onChange({ ...value, ...patch });

    const srcDoc = `<!doctype html><html><head><meta charset="utf-8" /><link rel="stylesheet" href="${fontsHref(value.font)}" />
        <style>html,body{margin:0;background:#fff;}</style></head><body>${previewHtml}</body></html>`;

    const chip = (active: boolean): React.CSSProperties => ({
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 12px',
        fontSize: '13px',
        cursor: 'pointer',
    });

    return (
        <section className="card design-panel" aria-labelledby="design-title" style={{ padding: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <h2 id="design-title" style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={16} /> {t('title')}
                </h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPreview(!showPreview)} id="btn-toggle-preview">
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />} {showPreview ? t('hide_preview') : t('show_preview')}
                </button>
            </div>

            <div className="design-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                        <div className="input-label">{t('template')}</div>
                        <div className="template-grid" role="radiogroup" aria-label={t('template')}>
                            {TEMPLATES.map((tpl) => {
                                const active = value.template === tpl.id;
                                return (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        id={`template-${tpl.id}`}
                                        onClick={() => set({ template: tpl.id, font: tpl.defaultFont })}
                                        style={{ ...chip(active), padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}
                                    >
                                        <Thumb id={tpl.id} accent={value.accent} />
                                        <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'center', gap: '4px', alignItems: 'center' }}>
                                            {active && <Check size={12} />} {t(`tpl_${tpl.id}`)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="input-label">{t('color')}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {ACCENTS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    aria-label={`${t('color')} ${c}`}
                                    aria-pressed={value.accent.toLowerCase() === c.toLowerCase()}
                                    onClick={() => set({ accent: c })}
                                    style={{
                                        width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                                        border: value.accent.toLowerCase() === c.toLowerCase() ? '3px solid var(--text-primary)' : '2px solid var(--border)',
                                    }}
                                />
                            ))}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <input
                                    type="color"
                                    value={value.accent}
                                    onChange={(e) => set({ accent: e.target.value })}
                                    style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                                    aria-label={t('custom_color')}
                                />
                                {t('custom_color')}
                            </label>
                        </div>
                    </div>

                    <div>
                        <div className="input-label">{t('font')}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {(Object.keys(FONTS) as FontId[]).map((f) => (
                                <button key={f} type="button" id={`font-${f}`} aria-pressed={value.font === f} onClick={() => set({ font: f })} style={chip(value.font === f)}>
                                    {t(`font_${f}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={value.showPhoto} onChange={(e) => set({ showPhoto: e.target.checked })} id="toggle-photo" />
                        {t('show_photo')}
                    </label>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '-8px' }}>{t('photo_hint')}</p>
                </div>

                {showPreview && (
                    <div ref={boxRef} style={{ width: '100%', height: PAGE_H * scale, overflow: 'hidden', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#fff' }}>
                        <iframe
                            title={t('preview')}
                            srcDoc={srcDoc}
                            sandbox=""
                            style={{ width: PAGE_W, height: PAGE_H, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}
