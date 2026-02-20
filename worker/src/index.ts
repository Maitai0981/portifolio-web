interface Env {
  AI: {
    run: (model: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  GITHUB_TOKEN?: string;
  GITHUB_USERNAME?: string;
  ALLOWED_ORIGIN?: string;
  INSPECTOR_PASSWORD_HASH?: string;
  METRICS_KEY?: string;
}

interface RepoSummary {
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  updatedAt: string;
  readme: string;
}

interface RepoCacheEntry {
  expiresAt: number;
  repos: RepoSummary[];
}

const REPO_CACHE_TTL_MS = 10 * 60 * 1000;
const README_CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_REPOS_FOR_CONTEXT = 7;
const MAX_README_CHARS = 2200;
const API_SCHEMA = "me.v1";

const repoCache = new Map<string, RepoCacheEntry>();
const readmeCache = new Map<string, { expiresAt: number; text: string }>();
const workerMetrics = {
  startedAt: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  meRequests: 0,
  meSuccess: 0,
  meFailure: 0,
  meLatencyTotalMs: 0,
  byStatus: {} as Record<string, number>,
  byErrorCode: {} as Record<string, number>
};

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

function normalizeOrigin(origin: string): string {
  return String(origin || "").trim().replace(/\/+$/, "");
}

function parseAllowedOrigins(envOrigin: string | undefined): string[] {
  const raw = String(envOrigin || "").trim();
  if (!raw) return [];
  if (raw === "*") return ["*"];
  return raw
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
}

function resolveAllowedOrigin(envOrigin: string | undefined, requestOrigin: string | null): string {
  const configuredOrigins = parseAllowedOrigins(envOrigin);
  if (!configuredOrigins.length || configuredOrigins.includes("*")) return "*";

  if (!requestOrigin) {
    return configuredOrigins[0];
  }

  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
  return configuredOrigins.includes(normalizedRequestOrigin) ? normalizedRequestOrigin : "null";
}

function jsonResponse(data: unknown, status: number, allowOrigin: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(allowOrigin)
    }
  });
}

function incCounter(counter: Record<string, number>, key: string): void {
  if (!key) return;
  counter[key] = (counter[key] || 0) + 1;
}

function recordMetrics(
  path: string,
  method: string,
  status: number,
  durationMs: number,
  errorCode = ""
): void {
  workerMetrics.totalRequests += 1;
  if (status >= 400) workerMetrics.totalErrors += 1;
  incCounter(workerMetrics.byStatus, String(status));
  if (errorCode) {
    incCounter(workerMetrics.byErrorCode, errorCode);
  }
  if (path === "/me" && method === "POST") {
    workerMetrics.meRequests += 1;
    workerMetrics.meLatencyTotalMs += Math.max(0, Number(durationMs) || 0);
    if (status >= 200 && status < 300) {
      workerMetrics.meSuccess += 1;
    } else {
      workerMetrics.meFailure += 1;
    }
  }
}

function metricsSnapshot() {
  const meRequests = Math.max(0, workerMetrics.meRequests);
  const avgMs = meRequests > 0 ? Math.round(workerMetrics.meLatencyTotalMs / meRequests) : 0;
  return {
    schema: "metrics.v1",
    startedAt: new Date(workerMetrics.startedAt).toISOString(),
    uptimeMs: Math.max(0, Date.now() - workerMetrics.startedAt),
    totalRequests: workerMetrics.totalRequests,
    totalErrors: workerMetrics.totalErrors,
    me: {
      requests: meRequests,
      success: workerMetrics.meSuccess,
      failure: workerMetrics.meFailure,
      avgLatencyMs: avgMs
    },
    byStatus: workerMetrics.byStatus,
    byErrorCode: workerMetrics.byErrorCode
  };
}

function timedJsonResponse(
  path: string,
  method: string,
  startedAt: number,
  data: unknown,
  status: number,
  allowOrigin: string,
  errorCode = ""
): Response {
  const durationMs = Math.max(0, Date.now() - startedAt);
  recordMetrics(path, method, status, durationMs, errorCode);
  return jsonResponse(data, status, allowOrigin);
}

function normalizeText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(value: string): string[] {
  return normalizeText(value).split(/[^a-z0-9]+/g).filter(Boolean);
}

function truncate(value: string, max: number): string {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function extractAiText(output: Record<string, unknown> | null | undefined): string {
  if (!output || typeof output !== "object") return "";
  const response = output.response;
  if (typeof response === "string") return response.trim();
  const result = output.result;
  if (typeof result === "string") return result.trim();
  if (Array.isArray(result)) {
    const joined = result.map((item) => String(item || "")).join("\n").trim();
    if (joined) return joined;
  }
  return "";
}

function sanitizePlainTextAnswer(value: string): string {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u0000/g, "")
    .replace(/\t/g, "  ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aa = String(a || "");
  const bb = String(b || "");
  if (aa.length !== bb.length) return false;
  let mismatch = 0;
  for (let i = 0; i < aa.length; i += 1) {
    mismatch |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  }
  return mismatch === 0;
}

function buildFallbackAnswer(question: string, repos: RepoSummary[], lang: string): string {
  const isPt = lang.startsWith("pt");
  if (!repos.length) {
    return isPt
      ? "Nao encontrei repositorios para responder agora. Tente novamente em instantes."
      : "I couldn't find repositories to answer right now. Please try again shortly.";
  }
  const top = repos.slice(0, 5);
  const lines = isPt
    ? [
        `Nao consegui usar o modelo agora. Com base na pergunta "${question}", estes repositorios sao os mais relevantes:`,
        ...top.map(
          (repo) => `- ${repo.name}: ${repo.description || "Sem descricao"} (${repo.url})`
        )
      ]
    : [
        `I could not use the model right now. Based on "${question}", these repositories are the most relevant:`,
        ...top.map(
          (repo) => `- ${repo.name}: ${repo.description || "No description"} (${repo.url})`
        )
      ];
  return lines.join("\n");
}

function scoreRepo(repo: RepoSummary, questionTokens: string[]): number {
  const haystack = normalizeText(
    `${repo.name} ${repo.description} ${repo.language} ${(repo.topics || []).join(" ")}`
  );
  let score = 0;

  questionTokens.forEach((token) => {
    if (repo.name.toLowerCase().includes(token)) score += 18;
    if (haystack.includes(token)) score += 6;
  });

  const updated = Date.parse(repo.updatedAt || "");
  const ageDays = Number.isFinite(updated) ? Math.max(0, (Date.now() - updated) / 86400000) : 9999;
  score += Math.max(0, 18 - ageDays / 7);
  score += Math.min(repo.stars || 0, 15) * 0.3;
  return score;
}

async function fetchGithubRepos(env: Env, username: string): Promise<RepoSummary[]> {
  const cacheKey = username.toLowerCase();
  const now = Date.now();
  const cached = repoCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.repos;
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-me-worker"
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const response = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`GitHub repositories request failed: ${response.status}`);
  }

  const raw = (await response.json()) as Record<string, unknown>[];
  const repos: RepoSummary[] = raw
    .filter((repo) => !Boolean(repo.fork))
    .map((repo) => ({
      name: String(repo.name || ""),
      fullName: String(repo.full_name || ""),
      url: String(repo.html_url || ""),
      description: String(repo.description || ""),
      language: String(repo.language || ""),
      topics: Array.isArray(repo.topics) ? repo.topics.map((item) => String(item)) : [],
      stars: Number(repo.stargazers_count || 0),
      updatedAt: String(repo.updated_at || ""),
      readme: ""
    }));

  repoCache.set(cacheKey, { expiresAt: now + REPO_CACHE_TTL_MS, repos });
  return repos;
}

async function fetchReadme(env: Env, fullName: string): Promise<string> {
  if (!fullName) return "";
  const now = Date.now();
  const cached = readmeCache.get(fullName);
  if (cached && cached.expiresAt > now) {
    return cached.text;
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
    "User-Agent": "portfolio-me-worker"
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(fullName)}/readme`,
    { headers }
  );
  if (!response.ok) {
    return "";
  }
  const text = truncate(await response.text(), MAX_README_CHARS);
  readmeCache.set(fullName, { expiresAt: now + README_CACHE_TTL_MS, text });
  return text;
}

function buildPrompt(question: string, lang: string, repos: RepoSummary[]): string {
  const isPt = lang.startsWith("pt");
  const header = isPt
    ? "Voce e um assistente tecnico do portfolio de Matheus. Responda apenas com informacoes presentes no contexto."
    : "You are a technical assistant for Matheus portfolio. Answer only with facts from context.";

  const reposContext = repos
    .map((repo, index) => {
      const readmeSnippet = repo.readme ? `README:\n${repo.readme}` : "README: (indisponivel)";
      return [
        `[#${index + 1}] ${repo.name}`,
        `URL: ${repo.url}`,
        `Descricao: ${repo.description || "(sem descricao)"}`,
        `Linguagem: ${repo.language || "(nao informada)"}`,
        `Topicos: ${(repo.topics || []).join(", ") || "(sem topicos)"}`,
        `Atualizado em: ${repo.updatedAt}`,
        readmeSnippet
      ].join("\n");
    })
    .join("\n\n");

  const answerGuide = isPt
    ? "Responda em portugues em TEXTO PLANO. Nao use markdown, JSON, HTML, tabelas ou blocos de codigo. Seja objetivo, cite stack, objetivo e resultados. Termine com 'Fontes:' e liste URLs usadas."
    : "Answer in English in PLAIN TEXT. Do not use markdown, JSON, HTML, tables, or code blocks. Be concise, include stack, objective and outcomes. End with 'Sources:' and list used URLs.";

  return `${header}\n\nPergunta: ${question}\n\nContexto de repositorios:\n${reposContext}\n\n${answerGuide}`;
}

async function runAssistant(env: Env, question: string, lang: string, repos: RepoSummary[]): Promise<string> {
  const prompt = buildPrompt(question, lang, repos);
  const aiOutput = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt,
    temperature: 0.2,
    max_tokens: 720
  });
  return sanitizePlainTextAnswer(extractAiText(aiOutput));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startedAt = Date.now();
    const method = String(request.method || "GET").toUpperCase();
    const requestOrigin = request.headers.get("Origin");
    const allowOrigin = resolveAllowedOrigin(env.ALLOWED_ORIGIN, requestOrigin);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (method === "OPTIONS") {
      recordMetrics(path, method, 204, Date.now() - startedAt, "");
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowOrigin)
      });
    }

    if (allowOrigin === "null") {
      return timedJsonResponse(
        path,
        method,
        startedAt,
        { error: "Origin not allowed", code: "origin_not_allowed" },
        403,
        "null",
        "origin_not_allowed"
      );
    }

    if (path === "/metrics") {
      const expectedKey = String(env.METRICS_KEY || "").trim();
      const providedKey = String(request.headers.get("x-metrics-key") || "").trim();
      if (expectedKey && !timingSafeEqual(expectedKey, providedKey)) {
        return timedJsonResponse(
          path,
          method,
          startedAt,
          { error: "Metrics key required", code: "metrics_key_required" },
          403,
          allowOrigin,
          "metrics_key_required"
        );
      }
      return timedJsonResponse(path, method, startedAt, metricsSnapshot(), 200, allowOrigin);
    }

    if (path === "/inspector-auth") {
      if (method !== "POST") {
        return timedJsonResponse(
          path,
          method,
          startedAt,
          { error: "Use POST /inspector-auth", code: "method_not_allowed" },
          405,
          allowOrigin,
          "method_not_allowed"
        );
      }
      const expectedHash = String(env.INSPECTOR_PASSWORD_HASH || "").trim().toLowerCase();
      if (!expectedHash) {
        return timedJsonResponse(
          path,
          method,
          startedAt,
          { error: "Inspector auth is not configured", code: "auth_not_configured" },
          503,
          allowOrigin,
          "auth_not_configured"
        );
      }
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const password = String(body.password || "").trim();
      if (!password) {
        return timedJsonResponse(
          path,
          method,
          startedAt,
          { error: "Password is required", code: "password_required" },
          400,
          allowOrigin,
          "password_required"
        );
      }
      const givenHash = await sha256Hex(password);
      if (!timingSafeEqual(givenHash, expectedHash)) {
        return timedJsonResponse(
          path,
          method,
          startedAt,
          { error: "Invalid credentials", code: "invalid_credentials" },
          401,
          allowOrigin,
          "invalid_credentials"
        );
      }
      return timedJsonResponse(
        path,
        method,
        startedAt,
        { ok: true, mode: "worker_password" },
        200,
        allowOrigin
      );
    }

    if (path === "/") {
      return timedJsonResponse(
        path,
        method,
        startedAt,
        {
          ok: true,
          service: "portfolio-me-api",
          endpoints: {
            health: "GET /health",
            me: "POST /me",
            inspectorAuth: "POST /inspector-auth",
            metrics: "GET /metrics"
          }
        },
        200,
        allowOrigin
      );
    }

    if (path === "/health") {
      return timedJsonResponse(
        path,
        method,
        startedAt,
        { ok: true, service: "portfolio-me-api", schema: API_SCHEMA },
        200,
        allowOrigin
      );
    }

    if (path === "/me" && method !== "POST") {
      return timedJsonResponse(
        path,
        method,
        startedAt,
        { error: "Use POST /me", code: "method_not_allowed" },
        405,
        allowOrigin,
        "method_not_allowed"
      );
    }

    if (path !== "/me" || method !== "POST") {
      return timedJsonResponse(
        path,
        method,
        startedAt,
        { error: "Not found", code: "not_found" },
        404,
        allowOrigin,
        "not_found"
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const question = String(body.question || "").trim();
    const lang = String(body.lang || "pt").toLowerCase();
    const username = String(env.GITHUB_USERNAME || "").trim();

    if (!username) {
      return timedJsonResponse(
        path,
        method,
        startedAt,
        { error: "Missing GITHUB_USERNAME variable", code: "missing_username" },
        500,
        allowOrigin,
        "missing_username"
      );
    }
    if (!question) {
      return timedJsonResponse(
        path,
        method,
        startedAt,
        { error: "Question is required", code: "question_required" },
        400,
        allowOrigin,
        "question_required"
      );
    }

    try {
      const repos = await fetchGithubRepos(env, username);
      const tokens = tokenize(question);
      const ranked = repos
        .map((repo) => ({ repo, score: scoreRepo(repo, tokens) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_REPOS_FOR_CONTEXT)
        .map((item) => item.repo);

      const withReadme = await Promise.all(
        ranked.map(async (repo) => ({
          ...repo,
          readme: await fetchReadme(env, repo.fullName)
        }))
      );

      let answer = "";
      try {
        answer = await runAssistant(env, question, lang, withReadme);
      } catch {
        answer = "";
      }
      if (!answer) {
        answer = buildFallbackAnswer(question, withReadme, lang);
      }
      answer = sanitizePlainTextAnswer(answer);

      return timedJsonResponse(
        path,
        method,
        startedAt,
        {
          answer,
          sources: withReadme.map((repo) => ({
            name: repo.name,
            url: repo.url,
            description: repo.description,
            updatedAt: repo.updatedAt
          })),
          meta: {
            schema: API_SCHEMA,
            generatedAt: new Date().toISOString(),
            sourceCount: withReadme.length
          }
        },
        200,
        allowOrigin
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected worker error";
      return timedJsonResponse(
        path,
        method,
        startedAt,
        { error: message, code: "worker_error" },
        500,
        allowOrigin,
        "worker_error"
      );
    }
  }
};
