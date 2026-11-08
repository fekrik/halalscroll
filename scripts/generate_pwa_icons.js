const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(ICONS_DIR, { recursive: true });

// High-fidelity Islamic Icon Master SVG (512x512)
// Designed with a 20% safe-zone margin for Android maskable adaptive icon specs
function generateMasterSvg(maskable = false) {
  const bgFill = maskable ? '#030712' : 'url(#bgGrad)';
  const borderMarkup = maskable ? '' : `
    <rect x="24" y="24" width="464" height="464" rx="108" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-opacity="0.35"/>
    <circle cx="256" cy="256" r="218" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.2" stroke-dasharray="4 6"/>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020408"/>
      <stop offset="50%" stop-color="#06131A"/>
      <stop offset="100%" stop-color="#041F18"/>
    </linearGradient>

    <!-- Emerald Glow -->
    <radialGradient id="emeraldGlow" cx="50%" cy="48%" r="48%">
      <stop offset="0%" stop-color="#059669" stop-opacity="0.38"/>
      <stop offset="55%" stop-color="#047857" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#020408" stop-opacity="0"/>
    </radialGradient>

    <!-- Radiant Gold Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB"/>
      <stop offset="25%" stop-color="#FCD34D"/>
      <stop offset="60%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>

    <!-- Soft Gold Gradient for inner book leaves -->
    <linearGradient id="goldLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF3C7"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>

    <!-- Drop Shadow Filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.65"/>
      <feDropShadow dx="0" dy="0" stdDeviation="16" flood-color="#F59E0B" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Base Background -->
  <rect width="512" height="512" rx="${maskable ? 0 : 116}" fill="${bgFill}"/>
  <circle cx="256" cy="256" r="236" fill="url(#emeraldGlow)"/>

  ${borderMarkup}

  <!-- Emblem Group with Shadow -->
  <g filter="url(#shadow)">
    <!-- Crescent Moon (Left & Lower Arch) -->
    <path d="M 275 120 
             A 135 135 0 1 0 355 350 
             A 115 115 0 1 1 275 120 Z" 
          fill="url(#goldGrad)" />

    <!-- Open Quran / Book Silhouette -->
    <!-- Left Leaf -->
    <path d="M 256 312 
             C 230 300 195 298 160 308
             C 155 260 162 216 168 198
             C 200 190 234 192 256 206
             Z"
          fill="url(#goldLight)"
          opacity="0.95"/>

    <!-- Right Leaf -->
    <path d="M 256 312 
             C 282 300 317 298 352 308
             C 357 260 350 216 344 198
             C 312 190 278 192 256 206
             Z"
          fill="url(#goldGrad)"
          opacity="0.95"/>

    <!-- Center Book Spine / Ray of Light -->
    <path d="M 256 195 L 256 322" stroke="#FFFBEB" stroke-width="3" stroke-linecap="round" opacity="0.85"/>

    <!-- 8-Pointed Star (Rub el Hizb) Floating Above Book -->
    <!-- Center (256, 155), Outer R = 24, Inner R = 17 -->
    <g transform="translate(256, 150)">
      <rect x="-16" y="-16" width="32" height="32" rx="4" fill="url(#goldGrad)"/>
      <rect x="-16" y="-16" width="32" height="32" rx="4" fill="url(#goldGrad)" transform="rotate(45)"/>
      <circle cx="0" cy="0" r="4.5" fill="#020408"/>
      <circle cx="0" cy="0" r="2" fill="#FFFBEB"/>
    </g>

    <!-- Subtle Arabic / Bookmark Ribbon underneath -->
    <path d="M 256 315 L 256 360 L 265 350 L 274 360 L 274 316 Z" fill="#10B981" opacity="0.9"/>
  </g>
</svg>`;
}

const masterSvg = generateMasterSvg(false);
const maskableSvg = generateMasterSvg(true);

const masterSvgPath = path.join(ICONS_DIR, 'icon.svg');
const maskableSvgPath = path.join(ICONS_DIR, 'icon-maskable.svg');
fs.writeFileSync(masterSvgPath, masterSvg);
fs.writeFileSync(maskableSvgPath, maskableSvg);
console.log('Saved SVG icons to public/icons/');

// Convert to PNGs using macOS sips tool
const targets = [
  { file: 'icon-512.png', src: masterSvgPath, size: 512 },
  { file: 'icon-192.png', src: masterSvgPath, size: 192 },
  { file: 'icon-180.png', src: masterSvgPath, size: 180 },
  { file: 'icon-maskable-512.png', src: maskableSvgPath, size: 512 },
  { file: 'favicon.png', src: masterSvgPath, size: 64 },
];

for (const t of targets) {
  const dest = path.join(ICONS_DIR, t.file);
  execFileSync('/usr/bin/sips', [
    '-s', 'format', 'png',
    '--resampleHeightWidth', String(t.size), String(t.size),
    t.src,
    '--out', dest
  ], { stdio: 'inherit' });
  console.log(`Generated ${t.file} (${t.size}x${t.size})`);
}

// Copy favicon.png to public/favicon.ico / public/favicon.png for universal browser support
fs.copyFileSync(path.join(ICONS_DIR, 'favicon.png'), path.join(__dirname, '..', 'public', 'favicon.png'));
fs.copyFileSync(path.join(ICONS_DIR, 'favicon.png'), path.join(__dirname, '..', 'public', 'favicon.ico'));
console.log('Favicons generated.');

