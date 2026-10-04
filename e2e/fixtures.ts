import { test as base, expect } from '@playwright/test';

/**
 * Con PW_OFFLINE=1 se cortan las peticiones a dominios externos (fuentes, analítica),
 * útil en entornos sin red. En CI normal no hace falta.
 */
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (process.env.PW_OFFLINE) {
      await page.route('**/*', (route) => {
        const url = route.request().url();
        if (baseURL && url.startsWith(baseURL)) return route.continue();
        if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        return route.abort();
      });
    }
    await use(page);
  },
});

export { expect };
