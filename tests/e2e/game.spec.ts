import { expect, test } from '@playwright/test';

const toCoord = (
  box: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
) => ({
  x: box.x + (x / 960) * box.width,
  y: box.y + (y / 540) * box.height,
});

import type { Page } from '@playwright/test';

const getShotCounter = (page: Page) => page.locator('.hud div:has-text("Coups") strong');
const getLevelName = (page: Page) => page.locator('.level-card strong');
const getMessage = (page: Page) => page.locator('.controls p').first();
const capturePageErrors = (page: Page) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return pageErrors;
};
const waitForGameReady = async (page: Page) => {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.game-canvas')).toBeVisible();
  await expect(getShotCounter(page)).toHaveText('0');
  await expect(page.locator('.controls')).toBeVisible();
};

test('game loads and can perform a swing interaction', async ({ page }) => {
  const pageErrors = capturePageErrors(page);

  await page.goto('/');
  await waitForGameReady(page);
  const canvas = page.locator('canvas');
  const shots = getShotCounter(page);
  const message = getMessage(page);

  await expect(canvas).toBeVisible();
  await expect(message).not.toBeEmpty();
  await expect(shots).toHaveText('0');

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas bounding box is unavailable');
  }

  const start = toCoord(box, 230, 300);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 90, start.y - 50, { steps: 8 });
  await page.mouse.up();

  await expect(shots).toHaveText('1');
  await expect(message).not.toHaveText('Tire la boule pour charger ton swing.');
  expect(pageErrors).toHaveLength(0);
});

test('navigue entre les niveaux en boucle', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);

  const levelName = getLevelName(page);
  const skipButton = page.getByRole('button', { name: 'Skip niveau' });

  await expect(levelName).toHaveText('Swing 101');
  await skipButton.click();
  await expect(levelName).toHaveText('Le mur de briques');
  await skipButton.click();
  await expect(levelName).toHaveText('Portail nerveux');
  await skipButton.click();
  await expect(levelName).toHaveText('Swing 101');
});

test('reset + contrôles clavier', async ({ page }) => {
  const pageErrors = capturePageErrors(page);

  await page.goto('/');
  await waitForGameReady(page);

  const canvas = page.locator('canvas');
  const shots = getShotCounter(page);
  const resetButton = page.getByRole('button', { name: 'Reset' });

  await expect(shots).toHaveText('0');

  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(shots).toHaveText('1');

  await resetButton.click();
  await expect(shots).toHaveText('0');

  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(shots).toHaveText('1');
  expect(pageErrors).toHaveLength(0);
});
