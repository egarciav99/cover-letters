/**
 * Llamadas a Gemini desde el servidor. Siempre con respuesta JSON validada por esquema.
 * Configuración: GEMINI_API_KEY (obligatoria) y GEMINI_MODEL (opcional).
 */

import { ApiError, GoogleGenAI, type Part } from '@google/genai';

/** Modelo por defecto. Se puede cambiar sin tocar el código con la variable GEMINI_MODEL. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

/** Motivo corto del fallo, para mostrarlo al usuario y buscarlo en los logs. */
export type AiFailReason = 'truncated' | 'timeout' | 'invalid_json' | 'empty' | 'blocked' | `http_${number}` | 'network';

export class AiError extends Error {
    constructor(public code: 'not_configured' | 'unavailable' | 'bad_output', message: string, public reason: AiFailReason = 'network') {
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

type Mode = 'schema' | 'json' | 'plain';
const MODES: Mode[] = ['schema', 'json', 'plain'];
/**
 * Primer modo que se prueba. gemini-3.8-flash rechaza el esquema estricto con un 400 genérico
 * ("invalid argument") y funciona en modo JSON, así que se empieza ahí. Con GEMINI_STRICT_SCHEMA=true
 * se prueba antes el esquema (útil con otros modelos). Si un modo da 400 se pasa al siguiente y se
 * recuerda mientras la instancia del servidor siga viva.
 */
let startMode = process.env.GEMINI_STRICT_SCHEMA === 'true' ? 0 : 1;

/** El JSON de la respuesta, aunque venga dentro de un bloque de código o con texto alrededor. */
function extractJson(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = (fenced ? fenced[1] : text).trim();
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

export async function generateJson<T>(opts: {
    system: string;
    prompt: string;
    /** Archivo adjunto (p. ej. un CV en PDF), antes del texto. */
    file?: { mimeType: string; base64: string };
    schema: Record<string, unknown>;
    maxOutputTokens?: number;
    timeoutMs?: number;
}): Promise<T> {
    const ai = getClient();
    const signal = AbortSignal.timeout(opts.timeoutMs ?? 50_000);
    const schemaText = `Answer with a single JSON object that follows this JSON Schema, and nothing else:\n${JSON.stringify(opts.schema)}`;
    let lastError: AiError | null = null;

    for (let m = startMode; m < MODES.length; m++) {
        const mode = MODES[m];
        const prompt = mode === 'schema' ? opts.prompt : `${opts.prompt}\n\n${schemaText}`;
        let text: string | undefined;
        let finish: string | undefined;
        try {
            const response = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: opts.file
                    ? [{ inlineData: { mimeType: opts.file.mimeType, data: opts.file.base64 } } satisfies Part, { text: prompt }]
                    : prompt,
                config: {
                    systemInstruction: opts.system,
                    ...(mode !== 'plain' ? { responseMimeType: 'application/json' } : {}),
                    ...(mode === 'schema' ? { responseJsonSchema: opts.schema, temperature: 0.4 } : {}),
                    // Los modelos que "piensan" gastan de este mismo límite antes de responder: margen amplio.
                    maxOutputTokens: opts.maxOutputTokens ?? 32768,
                    abortSignal: signal,
                },
            });
            text = response.text;
            finish = response.candidates?.[0]?.finishReason;
            const usage = response.usageMetadata;
            if (finish && finish !== 'STOP') {
                console.error(`Gemini finish=${finish} model=${GEMINI_MODEL} mode=${mode} thoughts=${usage?.thoughtsTokenCount ?? '?'} output=${usage?.candidatesTokenCount ?? '?'}`);
            }
        } catch (err) {
            if (err instanceof ApiError) {
                lastError = new AiError('unavailable', `Gemini ${err.status} (mode=${mode}): ${err.message}`, `http_${err.status}`);
                if (err.status === 400 && m < MODES.length - 1) {
                    console.error(`Gemini rejected mode=${mode} for model=${GEMINI_MODEL}; retrying with mode=${MODES[m + 1]}. ${err.message}`);
                    continue;
                }
                throw lastError;
            }
            const aborted = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
            throw new AiError('unavailable', String(err), aborted ? 'timeout' : 'network');
        }
        if (m !== startMode) {
            console.error(`Gemini model=${GEMINI_MODEL} works with mode=${mode}; using it from now on.`);
            startMode = m;
        }
        if (finish === 'MAX_TOKENS') throw new AiError('bad_output', 'Gemini response was cut off (MAX_TOKENS)', 'truncated');
        if (!text) throw new AiError('bad_output', `Empty response from Gemini (finish=${finish ?? '?'})`, finish && finish !== 'STOP' ? 'blocked' : 'empty');
        try {
            return JSON.parse(mode === 'schema' ? text : extractJson(text)) as T;
        } catch {
            throw new AiError('bad_output', `Gemini returned invalid JSON (finish=${finish ?? '?'}, mode=${mode}, ${text.length} chars)`, 'invalid_json');
        }
    }
    throw lastError ?? new AiError('unavailable', 'Gemini: no request mode accepted', 'http_400');
}
