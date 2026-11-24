// Minimal static server for `out/` that mimics production routing:
// the CloudFront viewer-request function rewrites `/path` and `/path/` to
// `/path/index.html`, and unknown paths serve `/404.html` with status 404.
// Dev-only helper, no dependencies. Usage: npm run preview [-- --port 4000]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve("out");
const portFlag = process.argv.indexOf("--port");
const PORT = portFlag > -1 ? Number(process.argv[portFlag + 1]) : 4000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

/** Same logic as the CloudFront function. */
function rewrite(uri) {
  if (uri.endsWith("/")) return `${uri}index.html`;
  if (!extname(uri)) return `${uri}/index.html`;
  return uri;
}

async function tryRead(uri) {
  const file = normalize(join(ROOT, decodeURIComponent(uri)));
  if (!file.startsWith(ROOT + sep)) return null;
  try {
    if (!(await stat(file)).isFile()) return null;
    return { file, body: await readFile(file) };
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const uri = new URL(req.url ?? "/", "http://localhost").pathname;
  const hit = await tryRead(rewrite(uri));
  if (hit) {
    res.writeHead(200, { "content-type": TYPES[extname(hit.file)] ?? "application/octet-stream" });
    res.end(hit.body);
    return;
  }
  const notFound = await tryRead("/404.html");
  res.writeHead(404, { "content-type": TYPES[".html"] });
  res.end(notFound?.body ?? "Not found");
}).listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
});
