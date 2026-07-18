import { test, expect } from '@playwright/test';

test.describe('Sitio público', () => {
  test('la home carga en español', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Andrea/i);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('#hero')).toBeVisible();
  });

  test('la home carga en inglés', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#hero')).toBeVisible();
  });

  test('el selector de idioma navega entre ES y EN', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/en"]').click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await page.locator('a[href="/"]').click();
    await expect(page).toHaveURL(/\/$|\/index\.html$/);
  });

  test('la sección de galería existe y contiene la rejilla de fotos', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#galeria')).toBeVisible();
    await expect(page.locator('#galleryGrid')).toBeVisible();
  });

  test('el formulario de contacto exige nombre y email', async ({ page }) => {
    await page.goto('/');
    await page.locator('#contacto').scrollIntoViewIfNeeded();
    const submit = page.locator('.contacto-form button[type="submit"]');
    await submit.click();
    const nameInput = page.locator('.contacto-form input[name="from_name"]');
    await expect(nameInput).toHaveJSProperty('validationMessage', await nameInput.evaluate(el => el.validationMessage));
    const isInvalid = await nameInput.evaluate(el => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('el formulario de contacto acepta datos válidos sin bloquear el envío del navegador', async ({ page }) => {
    await page.goto('/');
    await page.locator('.contacto-form input[name="from_name"]').fill('Test Usuario');
    await page.locator('.contacto-form input[name="reply_to"]').fill('test@example.com');
    const valid = await page.locator('.contacto-form').evaluate(form => form.checkValidity());
    expect(valid).toBe(true);
  });

  test('no hay contraseña de admin filtrada en localStorage tras cargar la home', async ({ page }) => {
    await page.goto('/');
    const leaked = await page.evaluate(() => localStorage.getItem('alr_pass'));
    expect(leaked).toBeNull();
  });
});

test.describe('Panel de administración', () => {
  test('el overlay de admin se puede abrir y una contraseña incorrecta muestra error', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.openAdmin && window.openAdmin());
    const passInput = page.locator('#admin-pass');
    await expect(passInput).toBeVisible();
    await passInput.fill('contraseña-incorrecta-de-prueba');
    await page.locator('#admin-login button.admin-btn').click();
    await expect(page.locator('#admin-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#admin-panel')).toBeHidden();
  });

  test('login de admin con credenciales reales (solo si se proveen por variables de entorno)', async ({ page }) => {
    const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
    test.skip(!password, 'PLAYWRIGHT_ADMIN_PASSWORD no configurada: se omite el login real');

    await page.goto('/');
    await page.evaluate(() => window.openAdmin && window.openAdmin());
    await page.locator('#admin-pass').fill(password);
    await page.locator('#admin-login button.admin-btn').click();
    await expect(page.locator('#admin-panel')).toBeVisible({ timeout: 10000 });
  });
});
