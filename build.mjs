// build.mjs  (원본 HTML을 제자리에서 include 치환)
import { readFile, writeFile } from "fs/promises";
import posthtml from "posthtml";
import include from "posthtml-include";
import { globby } from "globby";

const htmlFiles = await globby([
  "**/*.html",
  "!partials/**",
  "!node_modules/**",
]);

for (const file of htmlFiles) {
  const src = await readFile(file, "utf8");
  const result = await posthtml([
    include({ root: process.cwd() }) // 프로젝트 루트 기준
  ]).process(src);
  await writeFile(file, result.html, "utf8");
  console.log("built:", file);
}

// build.mjs (no-op)
console.log("build skipped (no-op)");