'use client';

import { ADSENSE_CLIENT } from '@/lib/site';

declare global {
    interface Window {
        googlefc?: { callbackQueue?: unknown[]; showRevocationMessage?: () => void };
    }
}

/**
 * Reabre el mensaje de consentimiento del CMP de Google (AdSense → Privacidad y mensajes).
 * Solo se muestra cuando los anuncios están activados.
 */
export default function CookieSettingsLink({ label }: { label: string }) {
    if (!ADSENSE_CLIENT) return null;
    return (
        <a
            href="#"
            onClick={(e) => {
                e.preventDefault();
                window.googlefc = window.googlefc || {};
                window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
                window.googlefc.callbackQueue.push(() => window.googlefc?.showRevocationMessage?.());
            }}
        >
            {label}
        </a>
    );
}
