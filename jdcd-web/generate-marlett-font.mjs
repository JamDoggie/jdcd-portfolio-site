/**
 * generate-marlett-font.mjs
 *
 * Generates a minimal open-source TTF font ("MarlettOSS") that reproduces
 * the three glyph shapes used by the Windows Marlett font to render the
 * Win98-style title-bar buttons:
 *
 *   '0' (U+0030)  →  minimize  (horizontal bar at bottom)
 *   '1' (U+0031)  →  maximize  (box with thick title-bar stripe)
 *   'r' (U+0072)  →  close     (diagonal X)
 *
 * Output: public/assets/fonts/marlett-oss.ttf
 *
 * This font is original artwork licensed under MIT; it does NOT include any
 * Microsoft or third-party font data.
 */

import opentype from 'opentype.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Font metrics ────────────────────────────────────────────────────────────
const UPM = 1000;
const ASCENDER = 800;
const DESCENDER = -200;

const { Font, Path, Glyph } = opentype;

// ── Helper ──────────────────────────────────────────────────────────────────
function makeGlyph(name, unicode, advanceWidth, buildPath) {
  const path = new Path();
  buildPath(path);
  return new Glyph({ name, unicode, advanceWidth, path });
}

// ── .notdef (required by spec) ───────────────────────────────────────────────
const notdefGlyph = new Glyph({
  name: '.notdef',
  unicode: 0,
  advanceWidth: UPM,
  path: new Path(),
});

// ── Space ────────────────────────────────────────────────────────────────────
const spaceGlyph = new Glyph({
  name: 'space',
  unicode: 32,
  advanceWidth: UPM,
  path: new Path(),
});

// ── '0'  –  Minimize: horizontal bar in the lower third ─────────────────────
// At 9 px (1000 UPM), 100 units ≈ 0.9 px.  The bar sits near the baseline
// and is roughly the full em-width, mirroring Marlett's underscore-like shape.
const minimizeGlyph = makeGlyph('zero', 0x30, UPM, (p) => {
  // Rectangle: full-width bar, 150 units tall, just above baseline.
  // Outer contour goes clockwise (TrueType convention for exterior path).
  p.moveTo(100, 220);   // top-left
  p.lineTo(900, 220);   // top-right
  p.lineTo(900, 70);    // bottom-right
  p.lineTo(100, 70);    // bottom-left
  p.close();
});

// ── '1'  –  Maximize: frame with a thick title-bar stripe ───────────────────
// Two contours: outer rectangle (CW) + inner hole (CCW), producing a
// hollow box whose top strip is ~200 units thick (≈ 2 px at 9 px).
const maximizeGlyph = makeGlyph('one', 0x31, UPM, (p) => {
  // Outer rectangle – clockwise (y-up)
  p.moveTo(100, 800);   // TL
  p.lineTo(900, 800);   // TR
  p.lineTo(900, 100);   // BR
  p.lineTo(100, 100);   // BL
  p.close();

  // Inner hole – counterclockwise (y-up) → creates the hollow interior.
  // Top bar thickness = 800 − 600 = 200 units ≈ 2 px @ 9 px
  // Side/bottom wall = 90 units ≈ 1 px @ 9 px
  p.moveTo(190, 600);   // TL of hole
  p.lineTo(190, 190);   // BL of hole
  p.lineTo(810, 190);   // BR of hole
  p.lineTo(810, 600);   // TR of hole
  p.close();
});

// ── 'r'  –  Close: pixel-stepped X shape ───────────────────────────────────
// Built from 8×8 "pixel" cells (100 units each) inside the 100..900 box.
// This avoids long diagonal contour edges that can look rounded on iOS at 9px.
const closeGlyph = makeGlyph('r', 0x72, UPM, (p) => {
  const cell = 100;
  const originX = 100;
  const originTopY = 800;

  // 1 = filled cell. Rows are top→bottom.
  const bitmap = [
    '11000011',
    '01100110',
    '00111100',
    '00011000',
    '00011000',
    '00111100',
    '01100110',
    '11000011',
  ];

  for (let row = 0; row < bitmap.length; row += 1) {
    const rowPattern = bitmap[row];
    for (let col = 0; col < rowPattern.length; col += 1) {
      if (rowPattern[col] !== '1') {
        continue;
      }

      const left = originX + col * cell;
      const right = left + cell;
      const top = originTopY - row * cell;
      const bottom = top - cell;

      // Clockwise rectangle for each pixel cell.
      p.moveTo(left, top);
      p.lineTo(right, top);
      p.lineTo(right, bottom);
      p.lineTo(left, bottom);
      p.close();
    }
  }
});

// ── Assemble & write ─────────────────────────────────────────────────────────
const font = new Font({
  familyName: 'MarlettOSS',
  styleName: 'Regular',
  unitsPerEm: UPM,
  ascender: ASCENDER,
  descender: DESCENDER,
  glyphs: [notdefGlyph, spaceGlyph, minimizeGlyph, maximizeGlyph, closeGlyph],
});

const outputDir = join(__dirname, 'public', 'assets', 'fonts');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputPath = join(outputDir, 'marlett-oss.ttf');
const arrayBuffer = font.toArrayBuffer();
const buffer = Buffer.from(arrayBuffer);
writeFileSync(outputPath, buffer);

console.log(`✓  MarlettOSS font written → ${outputPath}  (${buffer.length} bytes)`);
