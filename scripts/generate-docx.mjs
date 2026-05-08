#!/usr/bin/env node
/*
 * TreeGuardian DOCX generator.
 *
 * Бере markdown файл і робить DOCX у тій самій папці. Використовує локальний
 * pandoc binary (scripts/bin/pandoc) і успадковує стилі з reference-документа
 * (vozniak_proekt.docx — минулорічний шаблон Яреми).
 *
 * Запуск:
 *   node scripts/generate-docx.mjs paper.md   ->  paper.docx
 *   npm run docx paper.md                     ->  те саме
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PANDOC = path.join(ROOT, 'scripts', 'bin', 'pandoc');
const REFERENCE = path.join(ROOT, 'vozniak_proekt.docx');

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node scripts/generate-docx.mjs <input.md>');
  process.exit(1);
}

const inputPath = path.isAbsolute(inputArg) ? inputArg : path.resolve(process.cwd(), inputArg);
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}
if (!fs.existsSync(PANDOC)) {
  console.error(`Pandoc binary not found at ${PANDOC}`);
  console.error('Run: see README — pandoc has to be downloaded into scripts/bin/');
  process.exit(1);
}

const outputPath = inputPath.replace(/\.md$/i, '.docx');

const args = [inputPath, '-o', outputPath];
if (fs.existsSync(REFERENCE)) {
  args.push('--reference-doc=' + REFERENCE);
}

console.log(`Input:     ${inputPath}`);
console.log(`Output:    ${outputPath}`);
console.log(`Reference: ${fs.existsSync(REFERENCE) ? REFERENCE : '(none)'}`);

const r = spawnSync(PANDOC, args, { stdio: 'inherit' });
if (r.status !== 0) {
  console.error(`pandoc exited with code ${r.status}`);
  process.exit(r.status ?? 1);
}

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`✓ ${outputPath} (${sizeKb} KB)`);
