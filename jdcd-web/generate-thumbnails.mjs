/**
 * Build-time thumbnail generator.
 *
 * Uses Puppeteer (headless Chromium) to load each .glb model with Three.js,
 * render a single frame, and save a transparent PNG thumbnail to
 * .generated/thumbnails/<slug>.png.
 *
 * Run:  node generate-thumbnails.mjs
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const WIDTH = 512;
const HEIGHT = 512;

const modelsRoot = join(import.meta.dirname, 'content', 'models');
const outDir = join(import.meta.dirname, '.generated', 'thumbnails');
const threeModulePath = join(import.meta.dirname, 'node_modules', 'three', 'build', 'three.module.js');
const gltfLoaderPath = join(import.meta.dirname, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js');

// ── HTML page served as data URI ─────────────────────────────

function buildPage(threeUrl, gltfLoaderUrl) {
  return `<!DOCTYPE html>
<html>
<head>
<style>html,body{margin:0;padding:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:transparent;}</style>
</head>
<body>
<canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas>
<script type="importmap">
{ "imports": { "three": "${threeUrl}" } }
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from '${gltfLoaderUrl}';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(${WIDTH}, ${HEIGHT}, false);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

window.__renderModel = async (base64Glb) => {
  const binary = atob(base64Glb);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const arrayBuffer = bytes.buffer;

  const scene = new THREE.Scene();
  scene.background = null;

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 6, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb6ff, 0.35);
  fill.position.set(-3, 2, -4);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => loader.parse(arrayBuffer, '', resolve, reject));
  const model = gltf.scene;

  model.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => { m.transparent = true; m.depthWrite = true; m.side = THREE.FrontSide; });
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const size = Math.max(...box.getSize(new THREE.Vector3()).toArray(), 0.001);
  camera.position.set(0, size * 0.37, size * 1.55);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  scene.add(model);
  renderer.render(scene, camera);

  // Dispose
  scene.remove(model);
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => {
        if (m) {
          Object.values(m).forEach(v => { if (v instanceof THREE.Texture) v.dispose(); });
          m.dispose();
        }
      });
    }
  });

  return canvas.toDataURL('image/png');
};

window.__ready = true;
</script>
</body>
</html>`;
}

// ── main ─────────────────────────────────────────────────────

console.log('Generating model thumbnails…');

if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

const threeUrl = pathToFileURL(threeModulePath).href;
const gltfLoaderUrl = pathToFileURL(gltfLoaderPath).href;
const html = buildPage(threeUrl, gltfLoaderUrl);

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--enable-webgl',
    '--use-angle=swiftshader-webgl',
    '--allow-file-access-from-files',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

// Log browser console errors for debugging
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('  [browser]', msg.text());
});
page.on('pageerror', (err) => console.error('  [page error]', err.message));

// Write the rendering page to a temp file so file:// imports work
const tempHtmlPath = join(import.meta.dirname, '.generated', '_thumb_render.html');
await writeFile(tempHtmlPath, html);

await page.goto(pathToFileURL(tempHtmlPath).href, { waitUntil: 'networkidle0', timeout: 30000 });

// Wait for Three.js to finish initialising
await page.waitForFunction('window.__ready === true', { timeout: 30000 });

const slugs = (await readdir(modelsRoot, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

let generated = 0;

for (const slug of slugs) {
  const dir = join(modelsRoot, slug);
  const files = await readdir(dir);
  const modelFile = files.find((f) => /\.(gltf|glb)$/i.test(f));
  if (!modelFile) continue;

  const filePath = join(dir, modelFile);

  try {
    const glbBuffer = await readFile(filePath);
    const base64 = glbBuffer.toString('base64');

    // Send the model data to the page and render
    const dataUrl = await page.evaluate(async (b64) => {
      return await window.__renderModel(b64);
    }, base64);

    // Decode data URL → PNG buffer
    const pngBase64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    await writeFile(join(outDir, `${slug}.png`), pngBuffer);

    generated++;
    console.log(`  ✓ ${slug}`);
  } catch (err) {
    console.error(`  ✗ ${slug}: ${err.message}`);
  }
}

await browser.close();

// Clean up temp HTML file
try { await unlink(tempHtmlPath); } catch {}

console.log(`Thumbnails: ${generated}/${slugs.length} generated.`);
