/**
 * Convierte un nombre en algo seguro para rutas de Supabase Storage y nombres de descarga:
 * sin tildes, sin espacios ni símbolos (Storage rechaza esas claves con "Invalid key").
 */
export function fileSlug(name: string, fallback = 'cv'): string {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80) || fallback;
}

/** Nombre de archivo PDF seguro para Storage a partir del nombre original ("Mi CV (2026).pdf" → "mi-cv-2026.pdf"). */
export function storagePdfName(originalName: string): string {
    return `${fileSlug(originalName.replace(/\.pdf$/i, ''))}.pdf`;
}
