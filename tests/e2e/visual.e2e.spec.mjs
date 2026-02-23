import playwrightTest from "../../config/node_modules/@playwright/test/index.js";

const { expect, test } = playwrightTest;

async function openTerminal(page) {
  const icon = page.locator('.desktop-icon[data-command="terminal"]');
  await icon.click();
  await icon.press("Enter");
  await expect(page.locator("#terminal-input")).toBeVisible();
}

async function runCommand(page, command) {
  const input = page.locator("#terminal-input");
  await input.fill(command);
  await input.press("Enter");
}

async function stabilizeVisuals(page) {
  await page.addStyleTag({
    content: `
      #taskbar-clock,
      #custom-cursor,
      #pet-bubble { visibility: hidden !important; }
      #pet-mascot,
      #pet-mascot *,
      .pet-ascii { animation: none !important; transition: none !important; }
    `
  });
}

test("snapshot gui default", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#gui[aria-hidden="false"]')).toBeVisible();
  await stabilizeVisuals(page);
  await expect(page.locator("#app")).toHaveScreenshot("gui-default.png");
});

test("snapshot cli terminal", async ({ page }) => {
  await page.goto("/");
  await openTerminal(page);
  await runCommand(page, "clear");
  await stabilizeVisuals(page);
  await expect(page.locator("#terminal")).toHaveScreenshot("cli-terminal.png");
});

test("snapshot tema fire gui", async ({ page }) => {
  await page.goto("/");
  await openTerminal(page);
  await runCommand(page, "theme fire");
  await runCommand(page, "gui");
  await expect(page.locator('#gui[aria-hidden="false"]')).toBeVisible();
  await stabilizeVisuals(page);
  await expect(page.locator("#app")).toHaveScreenshot("theme-fire-gui.png", {
    mask: [page.locator(".matrix-canvas")]
  });
});
