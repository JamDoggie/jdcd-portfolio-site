import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { basename, join, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { marked } from 'marked';
import matter from 'gray-matter';

const browserDistFolder = join(import.meta.dirname, '../browser');

// In ng serve SSR, import.meta.dirname points inside .angular cache.
// Prefer current working directory (project root), then fall back for built server output.
const projectsRoot = (() => {
  const cwdPath = join(process.cwd(), 'content', 'projects');
  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  return join(import.meta.dirname, '../../../content/projects');
})();

const skillsRoot = (() => {
  const cwdPath = join(process.cwd(), 'content', 'skills');
  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  return join(import.meta.dirname, '../../../content/skills');
})();

const app = express();
const angularApp = new AngularNodeAppEngine();

function isInputValid(input : string)
{
  return /^[a-zA-Z0-9- ]+$/.test(input);
}

app.get('/api/projects', async (_req, res) => {
  try {
    const entries = await readdir(projectsRoot, { withFileTypes: true });
    const slugs = entries.filter(e => e.isDirectory()).map(e => e.name);
    res.json({ projects: slugs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

app.get('/api/projects/:slug', async (req, res) => {
  const slug = req.params.slug;
  // Sanitize: only allow alphanumeric and hyphens
  if (!isInputValid(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }

  const mediaPath = join(projectsRoot, slug, 'media');
  const markdownPath = join(projectsRoot, slug, 'contents.md');
  const metaPath = join(projectsRoot, slug, 'meta.json');

  try {
    const markdown : string = await readFile(markdownPath, 'utf-8');
    
    const unsafeHtml : string = await marked.parse(markdown);
    const DOMPurify = (await import('isomorphic-dompurify')).default;
    const sanitizedHtml = DOMPurify.sanitize(unsafeHtml);

    const mediaFiles = await readdir(mediaPath);
    const mediaUrls = mediaFiles.map(file => `/api/projects/${slug}/media/${file}`);

    let title: string = slug;
    let subtitle: string = '';
    let skills: string[] = [];
    try {
      const metaRaw = await readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaRaw);
      title = typeof meta.title === 'string' ? meta.title : slug;
      subtitle = typeof meta.subtitle === 'string' ? meta.subtitle : '';
      if (Array.isArray(meta.skills)) {
        skills = meta.skills.filter((s: unknown): s is string => typeof s === 'string');
      }
    } catch {
      // meta.json is optional; fall back to slug
    }

    res.json({ slug, title, subtitle, html: sanitizedHtml, media: mediaUrls, skills });
  } catch (e) {
    console.error(e);
    res.status(404).json({ error: 'Not found' });
  }
});

// ── Skills API ────────────────────────────────────────────────

app.get('/api/skills', async (_req, res) => {
  try {
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    const skills = [];
    for (const slug of dirs) {
      const mdPath = join(skillsRoot, slug, 'skill.md');
      if (!existsSync(mdPath)) continue;
      const raw = await readFile(mdPath, 'utf-8');
      const { data } = matter(raw);
      skills.push({
        slug,
        title: typeof data['title'] === 'string' ? data['title'] : slug,
        order: typeof data['order'] === 'number' ? data['order'] : 999,
      });
    }

    skills.sort((a, b) => a.order - b.order);
    res.json({ skills });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

app.get('/api/skills/:slug', async (req, res) => {
  const slug = req.params.slug;
  if (!isInputValid(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }

  const mdPath = join(skillsRoot, slug, 'skill.md');
  const imageDirPath = join(skillsRoot, slug, 'image');

  try {
    const raw = await readFile(mdPath, 'utf-8');
    const { data, content } = matter(raw);

    const unsafeHtml = await marked.parse(content);
    const DOMPurify = (await import('isomorphic-dompurify')).default;
    const sanitizedHtml = DOMPurify.sanitize(unsafeHtml);

    let iconUrl = '';
    try {
      const imageFiles = await readdir(imageDirPath);
      const first = imageFiles.find(f => /\.(svg|png|jpg|jpeg|gif|webp)$/i.test(f));
      if (first) {
        iconUrl = `/api/skills/${slug}/image/${first}`;
      }
    } catch {
      // no image dir – leave iconUrl empty
    }

    res.json({
      slug,
      title: typeof data['title'] === 'string' ? data['title'] : slug,
      order: typeof data['order'] === 'number' ? data['order'] : 999,
      invert: data['invert'] === true,
      html: sanitizedHtml,
      iconUrl,
    });
  } catch (e) {
    console.error(e);
    res.status(404).json({ error: 'Not found' });
  }
});

app.get('/api/skills/:slug/image/:filename', async (req, res) => {
  const { slug, filename } = req.params;

  if (!isInputValid(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }

  if (filename !== basename(filename)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = normalize(join(skillsRoot, slug, 'image', filename));
  const expectedRoot = normalize(join(skillsRoot, slug, 'image') + '/');
  if (!filePath.startsWith(expectedRoot)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  res.sendFile(filePath, (error) => {
    if (error) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// ── Projects Media ───────────────────────────────────────────

app.get('/api/projects/:slug/media/:filename', async (req, res) => {
  const { slug, filename } = req.params;

  if (!isInputValid(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }

  // Prevent path traversal and nested paths in the filename segment.
  if (filename !== basename(filename)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = normalize(join(projectsRoot, slug, 'media', filename));
  const expectedRoot = normalize(join(projectsRoot, slug, 'media') + '/');
  if (!filePath.startsWith(expectedRoot)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  res.sendFile(filePath, (error) => {
    if (error) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
