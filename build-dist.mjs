// build-dist.mjs
import { rm, mkdir, cp, readFile, writeFile } from "fs/promises";
import { globby } from "globby";
import posthtml from "posthtml";
import include from "posthtml-include";

const ROOT = process.cwd();
const DIST = "dist";

// 1) dist 초기화
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

// 2) 전체 프로젝트를 dist로 복사 (node_modules, dist, 빌드 스크립트, 개발 파일 등 제외)
// 단, index.html은 최상위에서만 관리하고 dist에는 복사하지 않음 (dist/index.html은 빌드 후 생성)
const entries = await globby([
  "**/*", 
  "!node_modules/**", 
  "!dist/**", 
  "!.git/**",
  "!build-dist.mjs",
  "!build.mjs",
  "!package.json",
  "!package-lock.json",
  "!check-dns.sh",
  "!index.html"  // 최상위 index.html은 복사하지 않음
]);
for (const entry of entries) {
  await cp(entry, `${DIST}/${entry}`, { recursive: true });
}

// index.html과 sitemap.xml은 최상위에서 dist로 직접 복사 (include 처리 전)
await cp("index.html", `${DIST}/index.html`);
await cp("sitemap.xml", `${DIST}/sitemap.xml`);

// 3) dist 내부의 HTML에서 <include> 치환 (partials는 제외)
const htmlFiles = await globby([`${DIST}/**/*.html`, `!${DIST}/partials/**`]);

for (const file of htmlFiles) {
  const src = await readFile(file, "utf8");
  // include root는 dist 기준 (dist/partials/head.html 경로를 찾게 함)
  const result = await posthtml([include({ root: `${ROOT}/${DIST}` })]).process(src);
  await writeFile(file, result.html, "utf8");
  console.log("built:", file);
}

console.log("✅ dist build complete");
