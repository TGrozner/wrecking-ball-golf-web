import { expect, test } from '@playwright/test';

const firstShotText = (levelHint: string) => levelHint;

const toCoord = (box: { x: number; y: number; width: number; height: number }, x: number, y: number) => ({
  x: box.x + (x / 960) * box.width,
  y: box.y + (y / 540) * box.height,
});

test('game loads and can perform a swing interaction', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const message = page.locator('.controls p').first();
  const shots = page.locator('.hud div:has-text("Coups") strong');

  await expect(message).not.toBeEmpty();
  await expect(shots).toHaveText('0');

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas box is not available');
  }

  const start = toCoord(box, 230, 300);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 90, start.y - 50, { steps: 8 });
  await page.mouse.up();

  await expect(shots).toHaveText('1');
  await expect(message).not.toHaveText(firstShotText('Tire la boule pour charger ton swing.'));
  expect(consoleErrors).toHaveLength(0);
});

test('navigation and controls are usable', async ({ page }) => {
  await page.goto('/');
  const levelName = page.locator('.level-card strong');

  await expect(levelName).toHaveText('Swing 101');

  await page.getByRole('button', { name: 'Skip niveau' }).click();
  await expect(levelName).toHaveText('Le mur de briques');

  const resetButton = page.getByRole('button', { name: 'Reset' });
  await resetButton.click();
  await expect(page.locator('.game-canvas')).toBeVisible();

  const canvas = page.locator('canvas');
  await canvas.click();
  await page.keyboard.press('Space');

  const shots = page.locator('.hud div:has-text("Coups") strong');
  await expect(shots).toHaveText('0');

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(shots).toHaveText('1');
});
