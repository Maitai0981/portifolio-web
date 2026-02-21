import { expect, test } from "@playwright/test";

async function openTerminal(page) {
  const icon = page.locator('.desktop-icon[data-command="terminal"]');
  await icon.click();
  await icon.press("Enter");
  await expect(page.locator("#terminal-input")).toBeVisible();
}

async function runCommand(page, command) {
  return runCommandUntil(page, command, () => true);
}

async function runCommandUntil(page, command, predicate, timeout = 12000) {
  const output = page.locator("#terminal-output");
  const input = page.locator("#terminal-input");
  const before = await output.innerText();

  await input.fill(command);
  await input.press("Enter");

  await expect
    .poll(async () => (await output.innerText()).length, { timeout })
    .toBeGreaterThan(before.length);
  await expect
    .poll(async () => {
      const text = await output.innerText();
      return Boolean(predicate(text));
    }, { timeout })
    .toBeTruthy();

  return output.innerText();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/me", async (route) => {
    const method = route.request().method();
    const origin = route.request().headerValue("origin");
    const headers = {
      "access-control-allow-origin": origin || "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    };

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }

    if (method === "POST") {
      await route.fulfill({
        status: 200,
        headers: { ...headers, "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          schema: "me.v1",
          answer:
            "Sou o assistente do portfolio.\nPosso resumir projetos, stack e links rapidamente.",
          sources: [
            {
              name: "portifolio-web",
              url: "https://github.com/Maitai0981/portifolio-web"
            }
          ]
        })
      });
      return;
    }

    await route.fulfill({ status: 405, headers });
  });
});

test("carrega GUI por padrao e mantém pet visível", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#gui[aria-hidden="false"]')).toBeVisible();
  await expect(page.locator("#taskbar")).toBeVisible();
  await expect(page.locator("#pet-mascot")).toBeVisible();
});

test("executa fluxo CLI com comandos e troca de tema", async ({ page }) => {
  await page.goto("/");
  await openTerminal(page);

  const helpOutput = await runCommandUntil(page, "help", (text) => /theme|tema/i.test(text));
  expect(helpOutput.toLowerCase()).toContain("help");
  expect(helpOutput.toLowerCase()).toMatch(/theme|tema/);

  await runCommand(page, "theme fire");
  await expect(page.locator("body")).toHaveClass(/theme-fire/);
});

test("comando me usa API e renderiza resposta formatada", async ({ page }) => {
  await page.goto("/");
  await openTerminal(page);

  const meOutput = await runCommandUntil(
    page,
    "me me fale dos projetos",
    (text) =>
      text.toLowerCase().includes("matheus ai") &&
      (text.toLowerCase().includes("answer") || text.toLowerCase().includes("resposta"))
  );
  expect(meOutput.toLowerCase()).toContain("matheus ai");
  expect(meOutput.toLowerCase()).toMatch(/answer|resposta/);
  expect(meOutput.toLowerCase()).toMatch(/projects|projetos/);
});
