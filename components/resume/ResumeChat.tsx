'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Lock, MessageCircle, Send, X } from 'lucide-react';
import type { ResumeData, ResumeLanguage } from '@/lib/resume';
import { MAX_CHAT_MESSAGES, MAX_CHAT_TEXT, type ChatChange, type ChatMessage } from '@/lib/resumeAssist';
import { AssistError, chatWithAssistant } from './assistApi';

interface Props {
    data: ResumeData;
    language: ResumeLanguage;
    plan: 'free' | 'pro';
    onApplyChange: (change: ChatChange) => void;
}

interface Entry extends ChatMessage {
    changes?: ChatChange[];
    applied?: boolean[];
    error?: boolean;
}

/** Vista previa corta del contenido de un cambio propuesto. */
function preview(c: ChatChange): string {
    switch (c.type) {
        case 'set_headline':
        case 'set_summary': return c.text;
        case 'add_experience': return [[c.experience.role, c.experience.company].filter(Boolean).join(', '), c.experience.bullets].filter(Boolean).join('\n');
        case 'update_experience': return Object.values(c.fields).filter((v) => typeof v === 'string').join('\n');
        case 'add_education': return [c.education.degree, c.education.school].filter(Boolean).join(', ');
        case 'add_skills': return c.skills.join(', ');
        case 'add_language': return [c.name, c.level].filter(Boolean).join(': ');
        case 'add_certification': return [c.name, c.issuer, c.year].filter(Boolean).join(', ');
        case 'add_section': return `${c.title}\n${c.content}`;
    }
}

/** Chat con la IA dentro del creador de CV (Pro): propone cambios que se aplican con un botón. */
export default function ResumeChat({ data, language, plan, onApplyChange }: Props) {
    const t = useTranslations('resume');
    const tc = useTranslations();
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [entries, busy]);

    useEffect(() => {
        if (open && plan === 'pro') inputRef.current?.focus();
    }, [open, plan]);

    async function send(text: string) {
        const message = text.trim().slice(0, MAX_CHAT_TEXT);
        if (!message || busy) return;
        const next: Entry[] = [...entries, { role: 'user', text: message }];
        setEntries(next);
        setInput('');
        setBusy(true);
        try {
            const history = next.filter((e) => !e.error).map(({ role, text: body }) => ({ role, text: body })).slice(-MAX_CHAT_MESSAGES);
            const result = await chatWithAssistant(data, language, locale, history);
            setEntries((list) => [...list, { role: 'assistant', text: result.reply || t('chat_changes_ready'), changes: result.changes, applied: result.changes.map(() => false) }]);
        } catch (err) {
            const e = err instanceof AssistError ? err : new AssistError(false, 'error');
            const text = e.known ? t(`assist_error_${e.code}`) : `${t('assist_error')} (${tc('common.error_code', { code: e.code })})`;
            setEntries((list) => [...list, { role: 'assistant', text, error: true }]);
        } finally {
            setBusy(false);
        }
    }

    function apply(entryIndex: number, changeIndex: number) {
        const entry = entries[entryIndex];
        const change = entry?.changes?.[changeIndex];
        if (!change || entry.applied?.[changeIndex]) return;
        onApplyChange(change);
        setEntries((list) => list.map((e, i) => (i === entryIndex ? { ...e, applied: e.applied?.map((a, j) => a || j === changeIndex) } : e)));
    }

    const starters = [t('chat_starter_experience'), t('chat_starter_summary'), t('chat_starter_skills')];

    return (
        <>
            {!open && (
                <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} id="btn-resume-chat"
                    style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 50, borderRadius: '999px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                    <MessageCircle size={18} /> {t('chat_open')}
                </button>
            )}
            {open && (
                <section role="dialog" aria-label={t('chat_title')} className="card"
                    style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 50, width: 'min(420px, calc(100vw - 32px))', height: 'min(620px, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.45)' }}>
                    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageCircle size={16} /> {t('chat_title')} <span className="badge badge-purple">Pro</span>
                        </h2>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label={t('chat_close')} title={t('chat_close')}><X size={16} /></button>
                    </header>

                    {plan !== 'pro' ? (
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('chat_locked')}</p>
                            <Link href="/pricing" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}><Lock size={14} /> {t('assist_see_plans')}</Link>
                        </div>
                    ) : (
                        <>
                            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }} aria-live="polite">
                                <div style={bubble('assistant')}>{t('chat_greeting')}</div>
                                {entries.length === 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {starters.map((s) => (
                                            <button key={s} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '12px' }} onClick={() => send(s)}>{s}</button>
                                        ))}
                                    </div>
                                )}
                                {entries.map((entry, i) => (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: entry.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ ...bubble(entry.role), ...(entry.error ? { color: 'var(--error, #ef4444)' } : {}) }}>{entry.text}</div>
                                        {entry.changes?.map((c, j) => (
                                            <div key={j} style={{ width: '100%', border: '1px solid rgba(139, 92, 246, 0.35)', borderRadius: '10px', padding: '10px 12px' }}>
                                                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-light)', marginBottom: '4px' }}>{c.label || t('chat_change')}</p>
                                                <p style={{ fontSize: '12.5px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.45, maxHeight: '140px', overflowY: 'auto' }}>{preview(c)}</p>
                                                <div style={{ marginTop: '8px' }}>
                                                    {entry.applied?.[j] ? (
                                                        <span style={{ fontSize: '12.5px', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13} /> {t('assist_applied')}</span>
                                                    ) : (
                                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => apply(i, j)}>{t('assist_apply')}</button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {busy && <div style={bubble('assistant')}><div className="spinner" /></div>}
                            </div>
                            <form
                                onSubmit={(e) => { e.preventDefault(); send(input); }}
                                style={{ display: 'flex', gap: '8px', padding: '10px', borderTop: '1px solid var(--border)', alignItems: 'flex-end' }}
                            >
                                <textarea
                                    ref={inputRef}
                                    className="input"
                                    value={input}
                                    maxLength={MAX_CHAT_TEXT}
                                    rows={2}
                                    placeholder={t('chat_placeholder')}
                                    aria-label={t('chat_placeholder')}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                                    style={{ flex: 1, resize: 'none', minHeight: '44px', maxHeight: '120px', fontSize: '14px' }}
                                />
                                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !input.trim()} aria-label={t('chat_send')} title={t('chat_send')} style={{ height: '44px' }}>
                                    <Send size={16} />
                                </button>
                            </form>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '0 12px 10px' }}>{t('chat_note')}</p>
                        </>
                    )}
                </section>
            )}
        </>
    );
}

function bubble(role: 'user' | 'assistant'): React.CSSProperties {
    return {
        maxWidth: '88%',
        padding: '9px 12px',
        borderRadius: '12px',
        fontSize: '13.5px',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
        background: role === 'user' ? 'var(--accent, #3b82f6)' : 'var(--bg-secondary, #111118)',
        color: role === 'user' ? '#fff' : 'var(--text-primary)',
        border: role === 'user' ? 'none' : '1px solid var(--border)',
    };
}
