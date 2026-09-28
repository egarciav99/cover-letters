import { aiErrorCode } from '@/lib/aiErrorCode';
import type { ResumeData, ResumeLanguage } from '@/lib/resume';
import type { AssistReview, ImproveField } from '@/lib/resumeAssist';

/** Error del asistente: `code` es una clave conocida (resume.assist_error_*) o un código para mostrar. */
export class AssistError extends Error {
    constructor(public known: boolean, public code: string) { super(code); }
}

const KNOWN = ['pro_only', 'quota_exceeded', 'ai_not_configured'];

async function call<T>(payload: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
        res = await fetch('/api/resume/assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(65000),
        });
    } catch (err) {
        const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
        throw new AssistError(false, timedOut ? 'client_timeout' : 'network');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (KNOWN.includes(body.error)) throw new AssistError(true, body.error);
        throw new AssistError(false, aiErrorCode(res.status, body) || body.error || `http_${res.status}`);
    }
    return body as T;
}

export function reviewResume(data: ResumeData, language: ResumeLanguage, locale: string): Promise<AssistReview> {
    return call<AssistReview>({ action: 'review', data, language, locale });
}

export async function improveResumeField(data: ResumeData, language: ResumeLanguage, field: ImproveField, itemId: string | null): Promise<string> {
    return (await call<{ text: string }>({ action: 'improve', field, item_id: itemId, data, language })).text;
}
