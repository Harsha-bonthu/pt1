const { test, expect } = require('@playwright/test');

test('basic flow: login and add to cart', async ({ page }) => {
  await page.goto('http://localhost:8081');
  // sign in
  await page.fill('input[name="username"]','demo');
  await page.fill('input[name="password"]','password123');
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector('#productGrid');
  // ensure products rendered
  const cards = await page.$$('[data-id]');
  // pick first add button
  const add = await page.$('button.add-btn');
  await expect(add).toBeTruthy();
  await add.click();
  // cart drawer opens automatically; wait for at least one cart item to appear
  await page.waitForSelector('.cart-item', { timeout: 5000 });
  const total = await page.textContent('#cartTotal');
  expect(total).toContain('Total');
});
