import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SITE } from '@/lib/site';
import CookieSettingsLink from '@/components/CookieSettingsLink';

export default function SiteFooter() {
    const t = useTranslations('footer');
    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <span>{SITE.name} © {new Date().getFullYear()}</span>
                <nav aria-label={t('aria')}>
                    <Link href="/pricing">{t('pricing')}</Link>
                    <Link href="/terms">{t('terms')}</Link>
                    <Link href="/privacy">{t('privacy')}</Link>
                    <Link href="/cookies">{t('cookies')}</Link>
                    <CookieSettingsLink label={t('cookie_settings')} />
                    <Link href="/legal">{t('legal')}</Link>
                    <a href={`mailto:${SITE.contactEmail}`}>{t('contact')}</a>
                </nav>
            </div>
        </footer>
    );
}
