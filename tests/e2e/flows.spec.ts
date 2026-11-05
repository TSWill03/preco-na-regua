import { test, expect } from '@playwright/test';

async function fillOffers(page: import('@playwright/test').Page) {
  await page.locator('#a-product').fill('Arroz');
  await page.locator('#a-price').fill('10,00');
  await page.locator('#a-quantity').fill('500');
  await page.locator('#a-unit').selectOption('g');
  await page.locator('#b-product').fill('Arroz');
  await page.locator('#b-price').fill('18,00');
  await page.locator('#b-quantity').fill('1');
  await page.locator('#b-unit').selectOption('kg');
}

test('compara ofertas em etiquetas, gráfico e cupom e salva histórico', async ({ page }) => {
  await page.goto('/');
  await fillOffers(page);
  await expect(page.getByText('A oferta B rende mais.')).toBeVisible();
  await expect(page.getByText('10,00% menos')).toBeVisible();
  await page.getByRole('button', { name: 'Analítico' }).click();
  await expect(page.getByText('Quanto custa cada kg?')).toBeVisible();
  await page.getByRole('button', { name: 'Cupom' }).click();
  await expect(page.getByText('COMPROVANTE DE COMPARAÇÃO')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar no histórico' }).click();
  await expect(page.getByText('As duas ofertas foram salvas no histórico deste navegador.')).toBeVisible();
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page.getByText('Seu caderno de preços')).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await page.getByPlaceholder('Buscar produto, marca ou mercado...').fill('arroz');
  await expect(page.locator('.history-row')).toHaveCount(2);
});

test('bloqueia categorias de unidades incompatíveis', async ({ page }) => {
  await page.goto('/');
  await fillOffers(page);
  await page.locator('#b-unit').selectOption('l');
  await expect(page.getByText('Você está comparando medidas diferentes.')).toBeVisible();
  await expect(page.getByText('Essas medidas não são compatíveis.')).toBeVisible();
});

test('compartilha o estado e restaura as ofertas por fragmento sem gravar no histórico', async ({ page }) => {
  await page.goto('/');
  await fillOffers(page);
  await page.getByRole('button', { name: 'Compartilhar comparação' }).click();
  await expect(page.getByRole('heading', { name: 'Espalhe uma boa escolha.' })).toBeVisible();
  const link = await page.locator('#share-link').inputValue();
  expect(new URL(link).hash).toMatch(/^#c=/);
  await page.goto(link);
  await expect(page.getByText('Você abriu uma comparação compartilhada.')).toBeVisible();
  await expect(page.locator('#a-price')).toHaveValue('10,00');
  await expect(page.locator('#b-price')).toHaveValue('18,00');
  await expect(page.getByText('A oferta B rende mais.')).toBeVisible();
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(0);
});

test('funciona offline depois do primeiro carregamento e mantém o histórico', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service Worker testado no Chromium.');
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await fillOffers(page);
  await page.getByRole('button', { name: 'Salvar no histórico' }).click();
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Você está offline.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'O menor preço' })).toBeVisible();
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(2);
});
