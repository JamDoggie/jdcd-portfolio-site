/**
 * Build-time video thumbnail generator.
 *
 * Uses Puppeteer (headless Chromium) to load each video found under
 * content/projects/<slug>/media/, seek to 10 % of the duration,
 * capture the frame on a canvas, and save a JPEG thumbnail to
 * .generated/video-thumbnails/<sanitised-slug>--<filename>.jpg.
 *
 * A temporary local HTTP server is used to serve the video files so
 * the canvas is not tainted by cross-origin restrictions.
 *
 * Run:  node generate-video-thumbnails.mjs
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import puppeteer from 'puppeteer';

const WIDTH = 640;
const HEIGHT = 360;
const JPEG_QUALITY = 0.75;

const projectsRoot = join(import.meta.dirname, 'content', 'projects');
const outDir = join(import.meta.dirname, '.generated', 'video-thumbnails');

// ── naming convention (must match generate-content.mjs) ──────

export function videoThumbName(projectSlug, videoFilename) {
  const sanitised = projectSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const base = videoFilename.replace(/\.[^.]+$/, '');
  return `${sanitised}--${base}.jpg`;
}

// ── HTML page that renders a video frame to a canvas ─────────

function buildPage() {
  return `<!DOCTYPE html>
<html>
<head>
<style>html,body{margin:0;padding:0;background:#000;}</style>
</head>
<body>
<video id="v" muted playsinline preload="auto" crossorigin="anonymous" style="display:none;"></video>
<canvas id="c"></canvas>
<script>
window.__captureFrame = (srcUrl) => new Promise((resolve, reject) => {
  const video = document.getElementById('v');
  const canvas = document.getElementById('c');
  const timeout = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 30000);

  const cleanup = () => {
    clearTimeout(timeout);
    video.removeEventListener('error', onError);
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('loadedmetadata', onMeta);
    video.removeAttribute('src');
    video.load();
  };

  const onError = () => { cleanup(); reject(new Error('video load/seek error')); };

  const onSeeked = () => {
    canvas.width = video.videoWidth || ${WIDTH};
    canvas.height = video.videoHeight || ${HEIGHT};
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', ${JPEG_QUALITY});
    cleanup();
    resolve(dataUrl);
  };

  const onMeta = () => {
    video.currentTime = Math.min(1, video.duration * 0.1);
  };

  video.addEventListener('loadedmetadata', onMeta, { once: true });
  video.addEventListener('seeked', onSeeked, { once: true });
  video.addEventListener('error', onError, { once: true });

  video.src = srcUrl;
  video.load();
});

window.__ready = true;
</script>
</body>
</html>`;
}

// ── collect every video in content/projects ──────────────────

async function collectVideos() {
  const results = [];
  const slugs = (await readdir(projectsRoot, { withFileTypes: true }))
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();

  for (const slug of slugs) {
    const mediaDir = join(projectsRoot, slug, 'media');
    let files;
    try {
      files = (await readdir(mediaDir)).sort();
    } catch {
      continue;
    }

    for (const file of files) {
      if (/\.(mp4|webm|ogg)$/i.test(file)) {
        results.push({ slug, file, absPath: join(mediaDir, file) });
      }
    }
  }

  return results;
}

// ── local HTTP server for serving videos ─────────────────────

const MIME_TYPES = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg' };

function startServer(allowedPaths) {
  const pathSet = new Set(allowedPaths);
  const pageHtml = buildPage();
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent(req.url || '');

      // Serve the capture page at /
      if (url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(pageHtml);
        return;
      }

      // Serve video files at /video?path=<abs-path>
      if (url.startsWith('/video?path=')) {
        const absPath = url.slice('/video?path='.length);
        if (!pathSet.has(absPath)) {
          res.writeHead(404);
          res.end();
          return;
        }
        const mime = MIME_TYPES[extname(absPath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        createReadStream(absPath).pipe(res);
        return;
      }

      res.writeHead(404);
      res.end();
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

// ── main ─────────────────────────────────────────────────────

console.log('Generating video thumbnails…');

if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

const videos = await collectVideos();
if (videos.length === 0) {
  console.log('  No videos found.');
  process.exit(0);
}

// Start a local server to avoid tainted-canvas cross-origin issues
const { server, port } = await startServer(videos.map(v => v.absPath));

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT });

page.on('console', msg => { if (msg.type() === 'error') console.error('  [browser]', msg.text()); });
page.on('pageerror', err => console.error('  [page error]', err.message));

// Navigate to the capture page served by our local server
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0', timeout: 30_000 });
await page.waitForFunction('window.__ready === true', { timeout: 10_000 });

let generated = 0;

for (const { slug, file, absPath } of videos) {
  const outName = videoThumbName(slug, file);
  const videoUrl = `http://127.0.0.1:${port}/video?path=${encodeURIComponent(absPath)}`;
  try {
    const dataUrl = await page.evaluate(async (src) => await window.__captureFrame(src), videoUrl);

    const jpegBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    await writeFile(join(outDir, outName), Buffer.from(jpegBase64, 'base64'));
    generated++;
    console.log(`  ✓ ${slug}/${file}`);
  } catch (err) {
    console.error(`  ✗ ${slug}/${file}: ${err.message}`);
  }
}

await browser.close();
server.close();

console.log(`Video thumbnails: ${generated}/${videos.length} generated.`);
