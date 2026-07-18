import { test, expect } from '@playwright/test';

// Estos tests ejercitan admin.js (cargado bajo demanda) de extremo a extremo.
// Solo corren si hay credenciales reales disponibles vía variable de entorno
// local (.env.test.local, nunca versionado — ver playwright.config.js).
test.describe('Panel de administración — flujos internos (admin.js)', () => {
  test.beforeEach(async ({ page }) => {
    const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
    test.skip(!password, 'PLAYWRIGHT_ADMIN_PASSWORD no configurada: se omiten los tests de admin.js');

    await page.goto('/');
    await page.evaluate(() => window.openAdmin && window.openAdmin());
    await page.locator('#admin-pass').fill(password);
    await page.locator('#admin-login button.admin-btn').click();
    await expect(page.locator('#admin-panel')).toBeVisible({ timeout: 10000 });
  });

  test('las pestañas del panel cambian correctamente (switchTab de admin.js)', async ({ page }) => {
    await page.locator('.admin-tab', { hasText: 'Herramientas' }).click();
    await expect(page.locator('#tab-tools')).toHaveClass(/active/);

    await page.locator('.admin-tab', { hasText: 'Configuración' }).click();
    await expect(page.locator('#tab-config')).toHaveClass(/active/);
  });

  test('el formulario de Textos se rellena con los datos actuales', async ({ page }) => {
    await page.locator('.admin-tab', { hasText: 'Configuración' }).click();
    await expect(page.locator('#txt-tagline')).not.toHaveValue('');
  });

  test('la galería de admin (Herramientas → Galería) renderiza sin errores de referencia', async ({ page }) => {
    const refErrors = [];
    // Solo nos interesan errores de referencia a funciones no definidas (el riesgo real
    // de la separación site.js/admin.js); ignoramos ruido de medios (video sin fuente, etc.)
    page.on('pageerror', err => {
      if(/is not defined|is not a function/.test(err.message)) refErrors.push(err.message);
    });

    await page.locator('.admin-tab', { hasText: 'Herramientas' }).click();
    await page.locator('#tab-tools .sec-menu-btn', { hasText: 'Galería' }).click();
    await expect(page.locator('#tool-galeria')).toBeVisible();
    await page.waitForTimeout(1000);

    expect(refErrors).toEqual([]);
  });

  test('Control de secciones → Galería redirige a Herramientas (sin IDs duplicados)', async ({ page }) => {
    await page.locator('.admin-tab', { hasText: 'Secciones' }).click();
    await page.locator('#tab-secciones .sec-menu-btn', { hasText: 'Galería' }).click();
    await page.locator('#sec-content a.admin-btn', { hasText: 'Ir a Herramientas' }).click();
    await expect(page.locator('#tab-tools')).toHaveClass(/active/);
  });
});
