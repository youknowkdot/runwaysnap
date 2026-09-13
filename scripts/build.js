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

console.log("Built static site → dist/");
console.log("Deploy the dist/ folder to Netlify, Cloudflare Pages, or GitHub Pages.");
