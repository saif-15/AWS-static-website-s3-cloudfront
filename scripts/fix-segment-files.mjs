// Post-build fix for a Next.js static-export bug on Windows.
//
// Next writes per-segment prefetch files with
//   `__next${segmentPath.replace(/\//g, ".")}.txt`
// but on Windows the collected segment path uses backslashes, so instead of the
// flat file the client router requests (e.g. `__next.bookmarks.__PAGE__.txt`)
// it creates nested folders (`__next.bookmarks\__PAGE__.txt`), and prefetches 404.
//
// This script flattens any `__next.*` directory in `out/` into the dot-joined
// filenames the router expects. On Linux/macOS builds it finds nothing to do.
import { readdir, rename, rm, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const OUT = "out";
let moved = 0;

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walkFiles(p)));
    else files.push(p);
  }
  return files;
}

async function visit(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = join(dir, e.name);
    if (e.name.startsWith("__next.")) {
      for (const file of await walkFiles(p)) {
        const flat = `${e.name}.${relative(p, file).split(sep).join(".")}`;
        await rename(file, join(dir, flat));
        moved++;
      }
      await rm(p, { recursive: true, force: true });
    } else if (e.name !== "_next") {
      await visit(p);
    }
  }
}

try {
  await stat(OUT);
} catch {
  console.error(`fix-segment-files: "${OUT}/" not found — run next build first.`);
  process.exit(1);
}
await visit(OUT);
console.log(`fix-segment-files: flattened ${moved} segment prefetch file(s).`);
