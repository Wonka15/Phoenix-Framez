/**
 * Small dependency-free repository sanity check.
 * It catches duplicate HTML IDs and missing local assets before deployment.
 */
import { readFileSync, existsSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

if (duplicates.length) {
  console.error("Duplicate HTML IDs:", [...new Set(duplicates)].join(", "));
  process.exitCode = 1;
}

for (const asset of ["assets/css/style.css", "assets/js/app.js"]) {
  if (!existsSync(new URL("../" + asset, import.meta.url))) {
    console.error("Missing local asset:", asset);
    process.exitCode = 1;
  }
}

if (!process.exitCode) console.log("PhoenixFrame HTML and local asset checks passed.");
