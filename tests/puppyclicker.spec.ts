import { test, expect, Page } from "@playwright/test";

test.beforeAll(async () => {
  test.setTimeout(60000);
});

export async function waitForOneOf(locators) {
  const res = await Promise.race([
    ...locators.map(async (locator, index) => {
      let timedOut = false;
      await locator
        .waitFor({ state: "visible" })
        .catch(() => (timedOut = true));
      return [timedOut ? -1 : index, locator];
    }),
  ]);
  if (res[0] === -1) {
    throw new Error("no locator visible before timeout");
  }
  return res;
}

export function getStoreCredentials(): { email: string; password: string } {
  const credentialsMap: { [key: string]: { email: string; password: string } } =
    {
      stunnly: {
        email: process.env.STUNNLY_DSERS_EMAIL!,
        password: process.env.STUNNLY_DSERS_PASSWORD!,
      },
      sunset: {
        email: process.env.SUNSET_DSERS_EMAIL!,
        password: process.env.SUNSET_DSERS_PASSWORD!,
      },
      spirit: {
        email: process.env.SPIRIT_DSERS_EMAIL!,
        password: process.env.SPIRIT_DSERS_PASSWORD!,
      },
    };

  const credentials = credentialsMap[process.env.STORE!];
  if (!credentials) {
    throw new Error("Invalid store");
  }

  return credentials;
}

async function applyNoPushedToStoreErrorTag(page: Page) {
  await page.waitForTimeout(500);
  await page.locator(".ant-checkbox-input").first().check();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Tag Management" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Apply DSers Tags" }).click();
  await page.waitForTimeout(500);
  await page
    .getByLabel("Apply DSers Tags")
    .getByLabel("", { exact: true })
    .check();
  await page.waitForTimeout(500);
  await page
    .getByLabel("Apply DSers Tags")
    .getByRole("button", { name: "OK" })
    .click();
  await page.waitForTimeout(2000);
  await page.locator(".ant-checkbox-input").first().uncheck();
  await page.waitForTimeout(2000);
}

test("Dsers Workflow", async ({ page }) => {
  const { email, password } = getStoreCredentials();
  // Go to the DSers login page and login
  await page.goto("https://accounts.dsers.com/accounts/login");
  await page.locator("#login_email").click();
  await page.locator("#login_email").fill(email);
  await page.locator("#login_password").click();
  await page.locator("#login_password").fill(password);
  await page.getByRole("button", { name: "LOG IN" }).click();

  // Wait for the page to navigate to the next page
  await page.waitForURL("https://www.dsers.com/application/find_suppliers");
  await page.waitForSelector("text=All Categories");

  await page.waitForTimeout(3000);

  // Wait for popups to appear
  const $closeModal1 = page.locator(".index_modalContentTitle__fJNO3 > img");
  if ((await $closeModal1.count()) > 0) {
    await $closeModal1.click();
    await page.waitForTimeout(500);
  }

  const $closeModal2 = page.getByLabel("Close", { exact: true });
  if ((await $closeModal2.count()) > 0) {
    await $closeModal2.click();
    await page.waitForTimeout(500);
  }

  await page.getByRole("menuitem", { name: "Import list" }).click();
  await page.waitForURL("https://www.dsers.com/application/import_list");

  // Set initial filters
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Filter" }).click();
  await page.waitForTimeout(500);
  await page.getByLabel("No pushed to Store(s)").check();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForTimeout(3000);

  // Select first product
  const checkboxes = page.locator(
    ".sc_above > .ant-checkbox-wrapper > .ant-checkbox > .ant-checkbox-input"
  );

  const count = await checkboxes.count();

  let hasMorePages = true;
  while (hasMorePages) {
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);

      await checkbox.click();

      await page.waitForTimeout(500);

      await page.getByRole("button", { name: "Bulk Edit Product" }).click();
      await page.waitForTimeout(500);
      await page.getByRole("tab", { name: "Images" }).click();
      await page.waitForTimeout(500);

      await page
        .locator(
          ".index_imgRibbonContainer__n8Axn > .index_RibbonContainer__3wa8U > .index_leftRibbon__T3Tgy > .ant-checkbox-wrapper > .ant-checkbox > .ant-checkbox-input"
        )
        .check();
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Save and Push" }).click();
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "PUSH TO STORES" }).click();
      await page.waitForTimeout(500);

      await page.waitForTimeout(3000);

      await page.getByRole("button", { name: "Close" }).click();

      await page.waitForTimeout(500);

      const [index] = await waitForOneOf([
        page.locator("text=Fail to be pushed 1 product(s)"),
        page.locator("text=Successfully pushed 1 product"),
      ]);

      if (index === 1) {
        console.log("Product was successfully pushed.");
        await page.waitForTimeout(2000);
      } else if (index === 0) {
        console.log("Failed to push product.");
        await page.waitForTimeout(2000);
        await page
          .locator(".sc_below_toolbarRibbon > span:nth-child(3) > svg")
          .nth(i)
          .click();
        await page.locator("div:nth-child(3) > div > .ant-btn").first().click();
        await page
          .getByLabel("Apply DSers Tags")
          .getByLabel("", { exact: true })
          .check();
        await page
          .getByLabel("Apply DSers Tags")
          .getByRole("button", { name: "OK" })
          .click();
        await page.waitForTimeout(2000);
      }
      await page.getByRole("alert").getByRole("button").click();
      await page.waitForTimeout(500);
    }

    const nextPageBtn = page.locator(
      ".index_btns__hTZVr > button:nth-child(2)"
    );
    if (await nextPageBtn.isDisabled()) {
      hasMorePages = false;
    } else {
      nextPageBtn.click();
      await page.waitForTimeout(3000);
    }
  }
});
