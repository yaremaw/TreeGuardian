#!/usr/bin/env node
/*
 * TreeGuardian PPTX generator.
 *
 * Бере markdown-файл (з заголовками рівня # як роздільниками слайдів) і робить PPTX
 * у тій самій папці. Використовує локальний pandoc (scripts/bin/pandoc).
 *
 * Запуск:
 *   node scripts/generate-pptx.mjs slides.md   ->  slides.pptx
 *   npm run pptx slides.md                     ->  те саме
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PANDOC = path.join(ROOT, 'scripts', 'bin', 'pandoc');

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node scripts/generate-pptx.mjs <input.md>');
  process.exit(1);
}

const inputPath = path.isAbsolute(inputArg) ? inputArg : path.resolve(process.cwd(), inputArg);
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}
if (!fs.existsSync(PANDOC)) {
  console.error(`Pandoc binary not found at ${PANDOC} — see scripts/bin/README.md`);
  process.exit(1);
}

const outputPath = inputPath.replace(/\.md$/i, '.pptx');

const args = [
  inputPath,
  '-o', outputPath,
  '--slide-level=1',
  '--resource-path=' + ROOT,
];

console.log(`Input:  ${inputPath}`);
console.log(`Output: ${outputPath}`);

const r = spawnSync(PANDOC, args, { stdio: 'inherit' });
if (r.status !== 0) {
  console.error(`pandoc exited with code ${r.status}`);
  process.exit(r.status ?? 1);
}

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`✓ ${outputPath} (${sizeKb} KB)`);
