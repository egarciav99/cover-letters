'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { ADSENSE_CLIENT, ADSENSE_SLOT } from '@/lib/site';

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

/**
 * Anuncio de AdSense. No pinta nada hasta que se configuren
 * NEXT_PUBLIC_ADSENSE_CLIENT y NEXT_PUBLIC_ADSENSE_SLOT.
 * Solo se usa en páginas públicas y en el panel del plan gratis, nunca en el editor.
 * El consentimiento (RGPD/TCF) lo gestiona el CMP de Google configurado en AdSense.
 */
export default function AdSlot({ slotKey, style }: { slotKey: string; style?: CSSProperties }) {
    const pushed = useRef(false);

    useEffect(() => {
        if (!ADSENSE_CLIENT || !ADSENSE_SLOT || pushed.current) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushed.current = true;
        } catch {
            // Bloqueadores de anuncios: se ignora.
        }
    }, []);

    if (!ADSENSE_CLIENT || !ADSENSE_SLOT) return null;

    return (
        <ins
            className="adsbygoogle ad-slot"
            style={{ display: 'block', ...style }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={ADSENSE_SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"
            data-slot-key={slotKey}
        />
    );
}
