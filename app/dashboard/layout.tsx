import type { Metadata } from 'next';

// Páginas privadas: fuera de los buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
    return children;
}
