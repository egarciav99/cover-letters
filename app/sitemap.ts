import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

const PUBLIC_PATHS = ['', '/pricing', '/register', '/login', '/terms', '/privacy', '/cookies', '/legal'];

export default function sitemap(): MetadataRoute.Sitemap {
    return PUBLIC_PATHS.map((path) => ({
        url: `${SITE.url}${path}`,
        changeFrequency: path === '' || path === '/pricing' ? 'weekly' : 'monthly',
        priority: path === '' ? 1 : path === '/pricing' ? 0.8 : 0.4,
    }));
}
