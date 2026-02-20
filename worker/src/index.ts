interface Env {
  AI: {
    run: (model: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  GITHUB_TOKEN?: string;
  GITHUB_USERNAME?: string;
  ALLOWED_ORIGIN?: string;
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

const repoCache = new Map<string, RepoCacheEntry>();
const readmeCache = new Map<string, { expiresAt: number; text: string }>();

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
    const requestOrigin = request.headers.get("Origin");
    const allowOrigin = resolveAllowedOrigin(env.ALLOWED_ORIGIN, requestOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowOrigin)
      });
    }

    if (allowOrigin === "null") {
      return jsonResponse({ error: "Origin not allowed" }, 403, "null");
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/") {
      return jsonResponse(
        {
          ok: true,
          service: "portfolio-me-api",
          endpoints: {
            health: "GET /health",
            me: "POST /me"
          }
        },
        200,
        allowOrigin
      );
    }

    if (path === "/health") {
      return jsonResponse({ ok: true, service: "portfolio-me-api" }, 200, allowOrigin);
    }

    if (path === "/me" && request.method !== "POST") {
      return jsonResponse({ error: "Use POST /me" }, 405, allowOrigin);
    }

    if (path !== "/me" || request.method !== "POST") {
      return jsonResponse({ error: "Not found" }, 404, allowOrigin);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const question = String(body.question || "").trim();
    const lang = String(body.lang || "pt").toLowerCase();
    const username = String(env.GITHUB_USERNAME || "").trim();

    if (!username) {
      return jsonResponse({ error: "Missing GITHUB_USERNAME variable" }, 500, allowOrigin);
    }
    if (!question) {
      return jsonResponse({ error: "Question is required" }, 400, allowOrigin);
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

      return jsonResponse(
        {
          answer,
          sources: withReadme.map((repo) => ({
            name: repo.name,
            url: repo.url,
            description: repo.description,
            updatedAt: repo.updatedAt
          }))
        },
        200,
        allowOrigin
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected worker error";
      return jsonResponse({ error: message }, 500, allowOrigin);
    }
  }
};
