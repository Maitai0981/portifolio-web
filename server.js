const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function logRequest(req, res, statusCode, filePath) {
  const timestamp = new Date().toISOString().replace("T", " ").replace("Z", "");
  const line = `[${timestamp}] ${req.method} ${req.url} ${statusCode} ${filePath}`;
  console.log(line);
}

function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    sendError(res, 403, "Forbidden");
    logRequest(req, res, 403, "BLOCKED");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendError(res, 404, "Not Found");
      logRequest(req, res, 404, filePath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      sendError(res, 500, "Internal Server Error");
      logRequest(req, res, 500, filePath);
    });

    stream.on("end", () => {
      logRequest(req, res, 200, filePath);
    });

    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log("Logs de requisicao serao exibidos aqui.");
});
