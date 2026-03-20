import playwrightTest from "../../config/node_modules/@playwright/test/index.js";

const { expect, test } = playwrightTest;

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

test("tema fire expõe telemetria e reage ao clique com burst", async ({ page }) => {
  await page.goto("/");
  await openTerminal(page);
  await runCommand(page, "theme fire");

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const t = window.__FIRE_TELEMETRY__;
          return t && Number(t.fps) > 0 ? 1 : 0;
        }),
      { timeout: 12000 }
    )
    .toBe(1);

  const before = await page.evaluate(() => {
    const t = window.__FIRE_TELEMETRY__ || {};
    return Number(t.burstsTotal || 0);
  });

  const appBox = await page.locator("#app").boundingBox();
  if (!appBox) throw new Error("App bounds unavailable");
  await page.mouse.click(appBox.x + appBox.width * 0.5, appBox.y + appBox.height * 0.45);

  await expect
    .poll(
      () =>
        page.evaluate((previous) => {
          const t = window.__FIRE_TELEMETRY__ || {};
          return Number(t.burstsTotal || 0) > Number(previous) ? 1 : 0;
        }, before),
      { timeout: 6000 }
    )
    .toBe(1);

  const snapshot = await page.evaluate(() => window.__FIRE_TELEMETRY__);
  expect(snapshot).toBeTruthy();
  expect(Number(snapshot.fps)).toBeGreaterThan(0);
  expect(Number(snapshot.avgFrameMs)).toBeLessThan(90);
  expect(["high", "medium", "low"]).toContain(String(snapshot.tier));
});
