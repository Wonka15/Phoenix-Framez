/**
 * Build the static GitHub Pages distribution.
 * Native ES modules are copied without bundling to keep the site dependency-free.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(root, "index.html"), join(output, "index.html"));
await cp(join(root, "assets"), join(output, "assets"), { recursive: true });
await writeFile(join(output, ".nojekyll"), "");

console.log("PhoenixFrame static site built successfully at dist/.");
