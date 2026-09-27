'use client';

import { useTranslations } from 'next-intl';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '@/lib/applications';

export type ApplicationDraft = Pick<Application, 'company' | 'position' | 'status' | 'url' | 'notes' | 'job_description' | 'applied_at'>;

export const EMPTY_DRAFT: ApplicationDraft = {
    company: '', position: '', status: 'applied', url: '', notes: '', job_description: '', applied_at: new Date().toISOString().slice(0, 10),
};

/** Normaliza el borrador antes de guardarlo (cadenas vacías como null). */
export function draftToRow(d: ApplicationDraft) {
    const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);
    return {
        company: d.company.trim().slice(0, 200),
        position: d.position.trim().slice(0, 200),
        status: d.status,
        url: clean(d.url)?.slice(0, 1000) ?? null,
        notes: clean(d.notes)?.slice(0, 5000) ?? null,
        job_description: clean(d.job_description)?.slice(0, 15000) ?? null,
        applied_at: d.applied_at || null,
    };
}

export default function ApplicationForm({ value, onChange }: { value: ApplicationDraft; onChange: (d: ApplicationDraft) => void }) {
    const t = useTranslations('applications');
    const set = (patch: Partial<ApplicationDraft>) => onChange({ ...value, ...patch });
    return (
        <>
            <div className="form-row">
                <div className="form-group">
                    <label className="input-label" htmlFor="app-company">{t('company')}</label>
                    <input id="app-company" className="input" value={value.company} onChange={(e) => set({ company: e.target.value })} required maxLength={200} />
                </div>
                <div className="form-group">
                    <label className="input-label" htmlFor="app-position">{t('position')}</label>
                    <input id="app-position" className="input" value={value.position} onChange={(e) => set({ position: e.target.value })} maxLength={200} />
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label className="input-label" htmlFor="app-status">{t('status')}</label>
                    <select id="app-status" className="input" value={value.status} onChange={(e) => set({ status: e.target.value as ApplicationStatus })}>
                        {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="input-label" htmlFor="app-date">{t('applied_at')}</label>
                    <input id="app-date" type="date" className="input" value={value.applied_at ?? ''} onChange={(e) => set({ applied_at: e.target.value })} />
                </div>
            </div>
            <div className="form-group">
                <label className="input-label" htmlFor="app-url">{t('url')}</label>
                <input id="app-url" type="url" className="input" value={value.url ?? ''} onChange={(e) => set({ url: e.target.value })} placeholder="https://" maxLength={1000} />
            </div>
            <div className="form-group">
                <label className="input-label" htmlFor="app-notes">{t('notes')}</label>
                <textarea id="app-notes" className="input" value={value.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder={t('notes_placeholder')} style={{ minHeight: '80px' }} maxLength={5000} />
            </div>
            <div className="form-group">
                <label className="input-label" htmlFor="app-desc">{t('job_description')}</label>
                <textarea id="app-desc" className="input" value={value.job_description ?? ''} onChange={(e) => set({ job_description: e.target.value })} placeholder={t('job_description_placeholder')} style={{ minHeight: '120px' }} maxLength={15000} />
            </div>
        </>
    );
}
