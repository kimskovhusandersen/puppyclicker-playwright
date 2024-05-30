import { test } from "@playwright/test";

test.beforeAll(async () => {
  test.setTimeout(60000);
});

test("Dsers Workflow", async ({ page }) => {
  // Go to the DSers login page and login
  await page.goto("https://admin.shopify.com/store/c64c88/");
});
