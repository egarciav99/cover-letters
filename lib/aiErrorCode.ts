/**
 * Código corto para acompañar un error de IA en pantalla, y poder buscarlo en los logs:
 * el motivo que da el servidor, o el estado HTTP si Vercel cortó la petición (respuesta sin JSON).
 */
export function aiErrorCode(status: number, body: { error?: string; reason?: string }): string {
    if (body.reason) return body.reason;
    if (!body.error) return `http_${status}`;
    return body.error === 'ai_failed' ? 'ai_failed' : '';
}
