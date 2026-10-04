import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

const PUBLIC_ROUTES = ['/', '/pricing', '/cv-guide', '/login', '/register', '/terms', '/privacy', '/cookies'];

/** Recoge errores de JS y respuestas locales con error mientras se usa la página. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // /_vercel/ solo existe en Vercel: en local su script de analítica devuelve 404 y el navegador lo rechaza.
    if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text()) && !m.text().includes('/_vercel/')) {
      problems.push(m.text());
    }
  });
  page.on('response', (r) => {
    const url = r.url();
    if (url.startsWith('http://127.0.0.1:4173') && r.status() >= 400 && !url.includes('/_vercel/')) {
      problems.push(`HTTP ${r.status()} ${url}`);
    }
  });
  return problems;
}

for (const route of PUBLIC_ROUTES) {
  test.describe(route, () => {
    test('carga sin errores y con un h1', async ({ page }) => {
      const problems = watch(page);
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
    });

    test('no hay scroll horizontal', async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}

test('las rutas privadas redirigen al login sin sesión', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/editor');
  await expect(page).toHaveURL(/\/login$/);
});

test('un CV online inexistente da 404', async ({ page }) => {
  const res = await page.goto('/cv/este-cv-no-existe');
  expect(res?.status()).toBe(404);
});

test('las APIs privadas rechazan peticiones sin sesión', async ({ request }) => {
  for (const path of ['/api/resume/public', '/api/usage']) {
    const res = await request.get(path);
    expect([401, 403]).toContain(res.status());
  }
});

test('la web envía las cabeceras de seguridad', async ({ request }) => {
  const res = await request.get('/');
  const headers = res.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toContain('frame-ancestors');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
});
