/**
 * Build-time content generator.
 *
 * Reads the content/ directory (projects, models, skills) and produces
 * static JSON files under .generated/api/ that the Angular app fetches
 * at runtime.  Media / model / image files are served directly from the
 * content/ directory via the Angular asset glob in angular.json.
 *
 * Run:  node generate-content.mjs
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { marked } from 'marked';
import matter from 'gray-matter';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const purify = DOMPurify(new JSDOM('').window);

const contentRoot = join(import.meta.dirname, 'content');
const projectsRoot = join(contentRoot, 'projects');
const modelsRoot = join(contentRoot, 'models');
const skillsRoot = join(contentRoot, 'skills');
const outDir = join(import.meta.dirname, '.generated', 'api');

// Must match the naming convention in generate-video-thumbnails.mjs
function videoThumbName(projectSlug, videoFilename) {
  const sanitised = projectSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const base = videoFilename.replace(/\.[^.]+$/, '');
  return `${sanitised}--${base}.jpg`;
}

// ── helpers ──────────────────────────────────────────────────

async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function dirs(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
}

// ── projects ─────────────────────────────────────────────────

async function generateProjects() {
  const slugs = await dirs(projectsRoot);
  const projects = [];

  for (const slug of slugs) {
    const dir = join(projectsRoot, slug);
    const mdPath = join(dir, 'contents.md');
    const metaPath = join(dir, 'meta.json');
    const mediaDir = join(dir, 'media');

    if (!existsSync(mdPath)) continue;

    const md = await readFile(mdPath, 'utf-8');
    const html = purify.sanitize(await marked.parse(md));

    let mediaFiles = [];
    try {
      mediaFiles = (await readdir(mediaDir)).sort();
    } catch { /* no media dir */ }

    const mediaUrls = mediaFiles.map(f => `content/projects/${slug}/media/${f}`);

    const posters = {};
    for (const f of mediaFiles) {
      if (/\.(mp4|webm|ogg)$/i.test(f)) {
        const url = `content/projects/${slug}/media/${f}`;
        posters[url] = `video-thumbnails/${videoThumbName(slug, f)}`;
      }
    }

    let title = slug;
    let subtitle = '';
    let skills = [];
    let order = 999;

    try {
      const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
      if (typeof meta.title === 'string') title = meta.title;
      if (typeof meta.subtitle === 'string') subtitle = meta.subtitle;
      if (typeof meta.order === 'number') order = meta.order;
      if (Array.isArray(meta.skills)) skills = meta.skills.filter(s => typeof s === 'string');
    } catch { /* meta.json is optional */ }

    projects.push({ slug, title, subtitle, html, media: mediaUrls, posters, skills, order });
  }

  projects.sort((a, b) => a.order !== b.order ? a.order - b.order : a.slug.localeCompare(b.slug));

  const payload = projects.map(({ order, ...rest }) => rest);
  await writeFile(join(outDir, 'projects.json'), JSON.stringify({ projects: payload }));
  console.log(`  projects: ${payload.length} entries`);
}

// ── models ───────────────────────────────────────────────────

async function generateModels() {
  const slugs = await dirs(modelsRoot);
  const models = [];

  for (const slug of slugs) {
    const dir = join(modelsRoot, slug);
    const metaPath = join(dir, 'model.json');

    let meta;
    try {
      meta = JSON.parse(await readFile(metaPath, 'utf-8'));
    } catch { continue; }

    const files = await readdir(dir);
    const modelFile = files.find(f => /\.(gltf|glb)$/i.test(f));
    if (!modelFile) continue;

    models.push({
      slug,
      title: typeof meta.title === 'string' ? meta.title : slug,
      description: typeof meta.description === 'string' ? meta.description : '',
      thumbnailUrl: `thumbnails/${slug}.png`,
      modelUrl: `content/models/${slug}/${modelFile}`,
      skills: Array.isArray(meta.skills) ? meta.skills.filter(s => typeof s === 'string') : [],
      order: typeof meta.order === 'number' ? meta.order : 999,
      spanX: typeof meta.spanX === 'number' ? meta.spanX : 1,
      spanY: typeof meta.spanY === 'number' ? meta.spanY : 1,
    });
  }

  models.sort((a, b) => a.order !== b.order ? a.order - b.order : a.slug.localeCompare(b.slug));

  const payload = models.map(({ order, ...rest }) => rest);
  await writeFile(join(outDir, 'models.json'), JSON.stringify({ models: payload }));
  console.log(`  models:   ${payload.length} entries`);
}

// ── skills ───────────────────────────────────────────────────

async function generateSkills() {
  const slugs = await dirs(skillsRoot);
  const skills = [];

  for (const slug of slugs) {
    const mdPath = join(skillsRoot, slug, 'skill.md');
    if (!existsSync(mdPath)) continue;

    const raw = await readFile(mdPath, 'utf-8');
    const { data, content } = matter(raw);

    const html = purify.sanitize(await marked.parse(content));

    let iconUrl = '';
    try {
      const imageDir = join(skillsRoot, slug, 'image');
      const imageFiles = await readdir(imageDir);
      const first = imageFiles.find(f => /\.(svg|png|jpg|jpeg|gif|webp)$/i.test(f));
      if (first) iconUrl = `content/skills/${slug}/image/${first}`;
    } catch { /* no image dir */ }

    skills.push({
      slug,
      title: typeof data['title'] === 'string' ? data['title'] : slug,
      order: typeof data['order'] === 'number' ? data['order'] : 999,
      invert: data['invert'] === true,
      html,
      iconUrl,
    });
  }

  skills.sort((a, b) => a.order - b.order);
  await writeFile(join(outDir, 'skills.json'), JSON.stringify({ skills }));
  console.log(`  skills:   ${skills.length} entries`);
}

// ── main ─────────────────────────────────────────────────────

console.log('Generating static content…');
await rm(join(import.meta.dirname, '.generated'), { recursive: true, force: true });
await ensureDir(outDir);
await Promise.all([generateProjects(), generateModels(), generateSkills()]);
console.log('Done.');
