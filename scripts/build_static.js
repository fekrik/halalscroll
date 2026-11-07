const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const esbuild = require('esbuild');
const { SEED_CARDS } = require('../server/seed');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OG_DIR = path.join(DOCS_DIR, 'api', 'og');
const PUBLIC_OG_DIR = path.join(ROOT, 'public', 'og');

fs.mkdirSync(OG_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_OG_DIR, { recursive: true });

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderOgSvg(card) {
  const title = escapeXml(card.source_title);
  const badge = escapeXml(card.authenticity_grade || card.revelation_place || 'Verified Canonical');
  const arabic = escapeXml(card.arabic_text_uthmani.slice(0, 140));
  const english = escapeXml(card.translation_en_clear.slice(0, 180) + (card.translation_en_clear.length > 180 ? '…' : ''));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090A0F"/>
      <stop offset="55%" stop-color="#12151E"/>
      <stop offset="100%" stop-color="#172026"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#090A0F" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="48" y="42" width="1104" height="546" rx="28" fill="none" stroke="#D4AF37" stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="96" y="105" fill="#D4AF37" font-family="system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="1">${title}</text>
  <text x="1104" y="105" text-anchor="end" fill="#10B981" font-family="system-ui, sans-serif" font-size="18" font-weight="600">${badge}</text>
  <text x="600" y="255" text-anchor="middle" fill="#F4F1EA" font-family="serif" font-size="44" direction="rtl">${arabic}</text>
  <text x="600" y="385" text-anchor="middle" fill="#E6E1D6" font-family="Georgia, serif" font-size="26" font-style="italic">“${english}”</text>
  <text x="96" y="535" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="18">Halal Scroll: Quran &amp; Sunnah • Daily Ayah, Hadith &amp; Tadabbur</text>
  <text x="1104" y="535" text-anchor="end" fill="#D4AF37" font-family="system-ui, sans-serif" font-size="18" font-weight="600">halalscroll.app/c/${escapeXml(card.share_slug)}</text>
</svg>`;
}

async function buildStaticSite() {
  // 1. Bundle React + TypeScript app into docs/app.js and public/app.js
  const entry = path.join(ROOT, 'src', 'main.tsx');
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    outfile: path.join(DOCS_DIR, 'app.js'),
    format: 'iife',
    target: ['es2020'],
    jsx: 'automatic',
    minify: true,
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });
  fs.copyFileSync(path.join(DOCS_DIR, 'app.js'), path.join(ROOT, 'public', 'app.js'));

  // 2. Copy CSS
  const css = fs.readFileSync(path.join(ROOT, 'public', 'app.css'), 'utf8');
  fs.writeFileSync(path.join(DOCS_DIR, 'app.css'), css);

  // 3. Write HTML & 404.html with relative paths and cache-busting query param for GitHub Pages / mobile browsers
  const ver = Date.now();
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Halal Scroll: Quran &amp; Sunnah — Daily Ayah, Hadith &amp; Tadabbur</title>
  <meta name="description" content="Replace mindless social media doom-scrolling with a serene, tactile vertical feed of the Quran, Sahih Hadith, Prophetic Duas, and Seerah reflections." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Halal Scroll" />
  <meta property="og:title" content="Halal Scroll: Quran &amp; Sunnah — Daily Ayah, Hadith &amp; Tadabbur" />
  <meta property="og:description" content="Replace mindless social media doom-scrolling with a serene, tactile vertical feed of the Quran, Sahih Hadith, Prophetic Duas, and Seerah reflections." />
  <meta property="og:image" content="https://fekrik.github.io/halalscroll/api/og/ash-sharh-5-6.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Halal Scroll: Quran &amp; Sunnah — Daily Ayah, Hadith &amp; Tadabbur" />
  <meta name="twitter:description" content="Replace mindless social media doom-scrolling with a serene, tactile vertical feed of the Quran, Sahih Hadith, Prophetic Duas, and Seerah reflections." />
  <meta name="twitter:image" content="https://fekrik.github.io/halalscroll/api/og/ash-sharh-5-6.jpg" />
  <link rel="stylesheet" href="./app.css?v=${ver}" />
</head>
<body>
  <div id="root"></div>
  <script src="./app.js?v=${ver}"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html);
  fs.writeFileSync(path.join(DOCS_DIR, '404.html'), html);
  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '');

  // 4. Pre-render OpenGraph SVGs & raster JPEGs for all 16 cards
  const hasSips = fs.existsSync('/usr/bin/sips');
  for (const card of SEED_CARDS) {
    const svgContent = renderOgSvg(card);
    const svgPath = path.join(OG_DIR, `${card.share_slug}.svg`);
    const pubSvgPath = path.join(PUBLIC_OG_DIR, `${card.share_slug}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    fs.writeFileSync(pubSvgPath, svgContent);

    if (hasSips) {
      const jpgPath = path.join(OG_DIR, `${card.share_slug}.jpg`);
      const pubJpgPath = path.join(PUBLIC_OG_DIR, `${card.share_slug}.jpg`);
      execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '90', svgPath, '--out', jpgPath], { stdio: 'ignore' });
      fs.copyFileSync(jpgPath, pubJpgPath);
    }
  }

  console.log(`Built static deployment bundle in ${DOCS_DIR} (${SEED_CARDS.length} OpenGraph SVG + JPG cards generated).`);
}

buildStaticSite().catch((err) => {
  console.error(err);
  process.exit(1);
});
