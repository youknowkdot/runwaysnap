#!/usr/bin/env node
/**
 * Copy static site into dist/ for Netlify / Cloudflare Pages / GitHub Pages.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (["dist", "node_modules", ".git", "scripts", "public"].includes(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

rmrf(dist);
fs.mkdirSync(dist, { recursive: true });

for (const name of [
  "index.html",
  "app.html",
  "css",
  "js",
  "samples",
  "README.md",
  "package.json",
  "netlify.toml",
  "_headers",
]) {
  const from = path.join(root, name);
  if (!fs.existsSync(from)) continue;
  const to = path.join(dist, name);
  const stat = fs.statSync(from);
  if (stat.isDirectory()) copyDir(from, to);
  else fs.copyFileSync(from, to);
}

fs.writeFileSync(
  path.join(dist, "_redirects"),
  "# Static site\n"
);


// cache-bust CSS/JS hrefs in dist HTML (GitHub Pages max-age sticky caches)
const { execSync } = require("child_process");
let assetV = Date.now().toString(36);
try {
  assetV = execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
} catch (_) {}
for (const htmlName of ["index.html", "app.html"]) {
  const htmlPath = path.join(dist, htmlName);
  if (!fs.existsSync(htmlPath)) continue;
  let html = fs.readFileSync(htmlPath, "utf8");
  html = html.replace(
    /(href="css\/styles\.css)(?:\?[^"]*)?(")/g,
    `$1?v=${assetV}$2`
  );
  html = html.replace(
    /(src="js\/(?:config|storage|calc|chart|app)\.js)(?:\?[^"]*)?(")/g,
    `$1?v=${assetV}$2`
  );
  fs.writeFileSync(htmlPath, html);
}
console.log("Asset cache-bust v=" + assetV);

console.log("Built static site → dist/");
console.log("Deploy the dist/ folder to Netlify, Cloudflare Pages, or GitHub Pages.");
