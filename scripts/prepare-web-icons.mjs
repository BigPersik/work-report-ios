import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const assetsDir = path.join(root, 'assets');
const indexHtmlPath = path.join(distDir, 'index.html');
const sourceIconPath = path.join(assetsDir, 'icon.png');
const appleIconPath = path.join(distDir, 'apple-touch-icon.png');

if (!fs.existsSync(indexHtmlPath)) {
  throw new Error(`Missing built HTML: ${indexHtmlPath}`);
}
if (!fs.existsSync(sourceIconPath)) {
  throw new Error(`Missing source icon: ${sourceIconPath}`);
}

fs.copyFileSync(sourceIconPath, appleIconPath);

const iconStat = fs.statSync(sourceIconPath);
const iconRev = process.env.ICON_REV ?? String(Math.floor(iconStat.mtimeMs));
const appleTouchHref = `/apple-touch-icon.png?v=${iconRev}`;

let html = fs.readFileSync(indexHtmlPath, 'utf8');
if (!html.includes('name="apple-mobile-web-app-capable"')) {
  html = html.replace(
    '</head>',
    `  <meta name="apple-mobile-web-app-capable" content="yes" />\n</head>`,
  );
}
if (!html.includes('name="apple-mobile-web-app-status-bar-style"')) {
  html = html.replace(
    '</head>',
    `  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n</head>`,
  );
}

const appleLinkTag = `<link rel="apple-touch-icon" href="${appleTouchHref}" />`;
if (html.includes('rel="apple-touch-icon"')) {
  html = html.replace(/<link rel="apple-touch-icon" href="[^"]*" \/>/g, appleLinkTag);
} else {
  html = html.replace('</head>', `  ${appleLinkTag}\n</head>`);
}

fs.writeFileSync(indexHtmlPath, html, 'utf8');
console.log(`Prepared iOS web icon: ${appleTouchHref}`);
