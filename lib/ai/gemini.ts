/**
 * Llamadas a Gemini desde el servidor. Siempre con respuesta JSON validada por esquema.
 * Configuración: GEMINI_API_KEY (obligatoria) y GEMINI_MODEL (opcional).
 */

import { ApiError, GoogleGenAI } from '@google/genai';

/** Alias que Google mantiene apuntando a su Flash más reciente. Se puede fijar con GEMINI_MODEL. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

export class AiError extends Error {
    constructor(public code: 'not_configured' | 'unavailable' | 'bad_output', message: string) {
        super(message);
    }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AiError('not_configured', 'GEMINI_API_KEY is not set');
    client ??= new GoogleGenAI({ apiKey });
    return client;
}

export function isAiConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
}

export async function generateJson<T>(opts: {
    system: string;
    prompt: string;
    schema: Record<string, unknown>;
    maxOutputTokens?: number;
    timeoutMs?: number;
}): Promise<T> {
    const ai = getClient();
    let text: string | undefined;
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: opts.prompt,
            config: {
                systemInstruction: opts.system,
                responseMimeType: 'application/json',
                responseJsonSchema: opts.schema,
                temperature: 0.4,
                maxOutputTokens: opts.maxOutputTokens ?? 8192,
                abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 50_000),
            },
        });
        text = response.text;
    } catch (err) {
        const detail = err instanceof ApiError ? `Gemini ${err.status}: ${err.message}` : String(err);
        throw new AiError('unavailable', detail);
    }
    if (!text) throw new AiError('bad_output', 'Empty response from Gemini');
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new AiError('bad_output', 'Gemini returned invalid JSON');
    }
}
