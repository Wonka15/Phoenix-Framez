/**
 * Dependency-free repository sanity check.
 * Detects duplicate HTML IDs, missing local assets, and broken relative ES imports.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
const failures = [];

if (duplicates.length) failures.push("Duplicate HTML IDs: " + [...new Set(duplicates)].join(", "));
if (!html.includes('<script type="module" src="assets/js/app.js"></script>')) {
  failures.push("index.html must load the ES module application entry point.");
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : path.endsWith(".js") ? [path] : [];
  });
}

for (const file of walk(join(root, "assets/js"))) {
  const source = readFileSync(file, "utf8");
  const importPaths = [...source.matchAll(/(?:from\s*|import\s*)["'](\.\.?\/[^"']+)["']/g)].map(match => match[1]);
  for (const importPath of importPaths) {
    const target = resolve(dirname(file), importPath);
    if (!existsSync(target)) failures.push("Missing module " + importPath + " imported by " + file.replace(root + "/", ""));
  }
}

for (const asset of ["assets/css/style.css", "assets/js/app.js", "docs/IMPLEMENTATION-PLAN.md"]) {
  if (!existsSync(join(root, asset))) failures.push("Missing required file: " + asset);
}

if (failures.length) {
  failures.forEach(message => console.error("FAIL:", message));
  process.exitCode = 1;
} else {
  console.log("PhoenixFrame HTML, module graph and required asset checks passed.");
}
