import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadBundledModule } from "./helpers/loadBundledModule.mjs";

const workerModule = await loadBundledModule("worker/src/index.ts");
const worker = workerModule.default;

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

test("GET /health returns 200 and schema", async () => {
  const env = {
    AI: { run: async () => ({ response: "ok" }) },
    ALLOWED_ORIGIN: "http://localhost:8080",
    GITHUB_USERNAME: "demo"
  };
  const request = new Request("https://example.workers.dev/health", {
    method: "GET",
    headers: { Origin: "http://localhost:8080" }
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.schema, "me.v1");
});

test("OPTIONS preflight returns 204 with CORS headers", async () => {
  const env = {
    AI: { run: async () => ({ response: "ok" }) },
    ALLOWED_ORIGIN: "http://localhost:8080",
    GITHUB_USERNAME: "demo"
  };
  const request = new Request("https://example.workers.dev/me", {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:8080" }
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:8080");
  assert.match(String(response.headers.get("Access-Control-Allow-Methods") || ""), /POST/i);
});

test("disallowed origin returns 403 on protected routes", async () => {
  const env = {
    AI: { run: async () => ({ response: "ok" }) },
    ALLOWED_ORIGIN: "https://allowed.example",
    GITHUB_USERNAME: "demo"
  };
  const request = new Request("https://example.workers.dev/me", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:8080" },
    body: JSON.stringify({ question: "oi", lang: "pt" })
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 403);
  const payload = await response.json();
  assert.equal(payload.code, "origin_not_allowed");
});

test("POST /me rejects oversized question payload", async () => {
  const env = {
    AI: { run: async () => ({ response: "ok" }) },
    ALLOWED_ORIGIN: "http://localhost:8080",
    GITHUB_USERNAME: "demo"
  };
  const hugeQuestion = "x".repeat(1400);
  const request = new Request("https://example.workers.dev/me", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:8080" },
    body: JSON.stringify({ question: hugeQuestion, lang: "pt" })
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 413);
  const payload = await response.json();
  assert.equal(payload.code, "question_too_long");
  assert.equal(payload.maxQuestionChars, 1200);
});

test("POST /inspector-auth validates password hash", async () => {
  const env = {
    AI: { run: async () => ({ response: "ok" }) },
    ALLOWED_ORIGIN: "http://localhost:8080",
    GITHUB_USERNAME: "demo",
    INSPECTOR_PASSWORD_HASH: sha256("senha-forte-123")
  };

  const failRequest = new Request("https://example.workers.dev/inspector-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:8080" },
    body: JSON.stringify({ password: "errada" })
  });
  const failResponse = await worker.fetch(failRequest, env);
  assert.equal(failResponse.status, 401);

  const okRequest = new Request("https://example.workers.dev/inspector-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:8080" },
    body: JSON.stringify({ password: "senha-forte-123" })
  });
  const okResponse = await worker.fetch(okRequest, env);
  assert.equal(okResponse.status, 200);
});

test("POST /me returns contract me.v1", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/users/demo/repos")) {
      return new Response(
        JSON.stringify([
          {
            name: "portfolio",
            full_name: "demo/portfolio",
            html_url: "https://github.com/demo/portfolio",
            description: "Portfolio app",
            language: "JavaScript",
            topics: ["portfolio", "terminal"],
            stargazers_count: 3,
            updated_at: "2026-02-20T00:00:00Z",
            fork: false
          }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("/repos/demo%2Fportfolio/readme")) {
      return new Response("README do projeto portfolio", { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };

  const env = {
    AI: { run: async () => ({ response: "Projeto portfolio em JavaScript." }) },
    ALLOWED_ORIGIN: "http://localhost:8080",
    GITHUB_USERNAME: "demo"
  };
  const request = new Request("https://example.workers.dev/me", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:8080" },
    body: JSON.stringify({ question: "fale do portfolio", lang: "pt" })
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(typeof payload.answer, "string");
  assert.equal(payload.meta.schema, "me.v1");
  assert.equal(Array.isArray(payload.sources), true);
});

test("GET /metrics can require x-metrics-key", async () => {
  const env = {
    AI: { run: async () => ({ response: "ok" }) },
    ALLOWED_ORIGIN: "http://localhost:8080",
    GITHUB_USERNAME: "demo",
    METRICS_KEY: "abc123"
  };
  const forbidden = await worker.fetch(
    new Request("https://example.workers.dev/metrics", {
      method: "GET",
      headers: { Origin: "http://localhost:8080" }
    }),
    env
  );
  assert.equal(forbidden.status, 403);

  const ok = await worker.fetch(
    new Request("https://example.workers.dev/metrics", {
      method: "GET",
      headers: { Origin: "http://localhost:8080", "x-metrics-key": "abc123" }
    }),
    env
  );
  assert.equal(ok.status, 200);
});

test("GET / returns service endpoints and /me GET returns 405", async () => {
  const env = {
    AI: { run: async () => ({ response: "ok" }) },
    ALLOWED_ORIGIN: "http://localhost:8080",
    GITHUB_USERNAME: "demo"
  };

  const rootResponse = await worker.fetch(
    new Request("https://example.workers.dev/", {
      method: "GET",
      headers: { Origin: "http://localhost:8080" }
    }),
    env
  );
  assert.equal(rootResponse.status, 200);
  const rootPayload = await rootResponse.json();
  assert.equal(rootPayload.ok, true);
  assert.equal(typeof rootPayload.endpoints?.me, "string");

  const meGetResponse = await worker.fetch(
    new Request("https://example.workers.dev/me", {
      method: "GET",
      headers: { Origin: "http://localhost:8080" }
    }),
    env
  );
  assert.equal(meGetResponse.status, 405);
  const meGetPayload = await meGetResponse.json();
  assert.equal(meGetPayload.code, "method_not_allowed");
});
