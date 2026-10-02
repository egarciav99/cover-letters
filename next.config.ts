import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    // Sin restringir scripts: Next.js y AdSense cargan scripts inline y de muchos dominios de Google.
    { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig: NextConfig = {
    async headers() {
        return [{ source: '/:path*', headers: securityHeaders }];
    },
};

export default withNextIntl(nextConfig);
