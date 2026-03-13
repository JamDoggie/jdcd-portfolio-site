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

const modelsRoot = (() => {
  const cwdPath = join(process.cwd(), 'content', 'models');
  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  return join(import.meta.dirname, '../../../content/models');
})();

const app = express();
const angularApp = new AngularNodeAppEngine();
const shouldUseContentCache = process.env['NODE_ENV'] === 'production';

function isInputValid(input : string)
{
  return /^[a-zA-Z0-9- ]+$/.test(input);
}

type ProjectPayload = {
  slug: string;
  title: string;
  subtitle: string;
  html: string;
  media: string[];
  skills: string[];
  order: number;
};

type ModelPayload = {
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  modelUrl: string;
  skills: string[];
  order: number;
  spanX: number;
  spanY: number;
};

type SkillPayload = {
  slug: string;
  title: string;
  order: number;
  invert: boolean;
  html: string;
  iconUrl: string;
};

let cachedProjectsPayload: Array<Omit<ProjectPayload, 'order'>> | null = null;
let cachedProjectsPromise: Promise<Array<Omit<ProjectPayload, 'order'>>> | null = null;
let cachedModelsPayload: Array<Omit<ModelPayload, 'order'>> | null = null;
let cachedModelsPromise: Promise<Array<Omit<ModelPayload, 'order'>>> | null = null;
let cachedSkillsPayload: SkillPayload[] | null = null;
let cachedSkillsPromise: Promise<SkillPayload[]> | null = null;
let cachedSkillsExpiresAt = 0;

const skillsCacheTtlMs = 5000;

async function loadAllModels(): Promise<Array<Omit<ModelPayload, 'order'>>> {
  if (shouldUseContentCache && cachedModelsPayload) {
    return cachedModelsPayload;
  }

  if (shouldUseContentCache && cachedModelsPromise) {
    return cachedModelsPromise;
  }

  cachedModelsPromise = (async () => {
    const entries = await readdir(modelsRoot, { withFileTypes: true });
    const slugs = entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b));

    const models = [];

    for (const slug of slugs) {
      const modelDir = join(modelsRoot, slug);
      const modelJsonPath = join(modelDir, 'model.json');

      let title = slug;
      let description = '';
      let thumbnailUrl = '';
      let skills: string[] = [];
      let order = 999;
      let spanX = 1;
      let spanY = 1;

      try {
        const metaRaw = await readFile(modelJsonPath, 'utf-8');
        const meta = JSON.parse(metaRaw);
        title = typeof meta.title === 'string' ? meta.title : slug;
        description = typeof meta.description === 'string' ? meta.description : '';
        thumbnailUrl = typeof meta.thumbnailUrl === 'string' ? meta.thumbnailUrl : '';
        if (Array.isArray(meta.skills)) {
          skills = meta.skills.filter((s: unknown): s is string => typeof s === 'string');
        }
        order = typeof meta.order === 'number' ? meta.order : 999;
        spanX = typeof meta.spanX === 'number' ? meta.spanX : 1;
        spanY = typeof meta.spanY === 'number' ? meta.spanY : 1;
      } catch {
        // model.json is required for model metadata; skip invalid entries.
        continue;
      }

      const modelFiles = await readdir(modelDir);
      const modelFile = modelFiles.find(f => /\.(gltf|glb)$/i.test(f));
      if (!modelFile) {
        continue;
      }

      models.push({
        slug,
        title,
        description,
        thumbnailUrl,
        modelUrl: `/api/models/${slug}/file/${modelFile}`,
        skills,
        order,
        spanX,
        spanY,
      });
    }

    models.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.slug.localeCompare(b.slug);
    });

    const payload = models.map(({ order, ...model }) => model);
    if (shouldUseContentCache) {
      cachedModelsPayload = payload;
    }
    return payload;
  })();

  try {
    return await cachedModelsPromise;
  } finally {
    if (!shouldUseContentCache) {
      cachedModelsPromise = null;
    }
  }
}

async function loadAllProjects(): Promise<Array<Omit<ProjectPayload, 'order'>>> {
  if (shouldUseContentCache && cachedProjectsPayload) {
    return cachedProjectsPayload;
  }

  if (shouldUseContentCache && cachedProjectsPromise) {
    return cachedProjectsPromise;
  }

  cachedProjectsPromise = (async () => {
    const entries = await readdir(projectsRoot, { withFileTypes: true });
    const slugs = entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b));

    const DOMPurify = (await import('isomorphic-dompurify')).default;
    const projects = await Promise.all(slugs.map(slug => loadProject(slug, DOMPurify)));

    projects.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.slug.localeCompare(b.slug);
    });

    const payload = projects.map(({ order, ...project }) => project);
    if (shouldUseContentCache) {
      cachedProjectsPayload = payload;
    }
    return payload;
  })();

  try {
    return await cachedProjectsPromise;
  } finally {
    if (!shouldUseContentCache) {
      cachedProjectsPromise = null;
    }
  }
}

async function loadAllSkills(): Promise<SkillPayload[]> {
  const now = Date.now();

  if (cachedSkillsPayload && now < cachedSkillsExpiresAt) {
    return cachedSkillsPayload;
  }

  if (cachedSkillsPromise) {
    return cachedSkillsPromise;
  }

  cachedSkillsPromise = (async () => {
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    const DOMPurify = (await import('isomorphic-dompurify')).default;

    const skills: SkillPayload[] = [];
    for (const slug of dirs) {
      const mdPath = join(skillsRoot, slug, 'skill.md');
      if (!existsSync(mdPath)) continue;
      const raw = await readFile(mdPath, 'utf-8');
      const { data, content } = matter(raw);

      const unsafeHtml = await marked.parse(content);
      const sanitizedHtml = DOMPurify.sanitize(unsafeHtml);

      let iconUrl = '';
      try {
        const imageDirPath = join(skillsRoot, slug, 'image');
        const imageFiles = await readdir(imageDirPath);
        const first = imageFiles.find(f => /\.(svg|png|jpg|jpeg|gif|webp)$/i.test(f));
        if (first) {
          iconUrl = `/api/skills/${slug}/image/${first}`;
        }
      } catch {
        // no image dir – leave iconUrl empty
      }

      skills.push({
        slug,
        title: typeof data['title'] === 'string' ? data['title'] : slug,
        order: typeof data['order'] === 'number' ? data['order'] : 999,
        invert: data['invert'] === true,
        html: sanitizedHtml,
        iconUrl,
      });
    }

    skills.sort((a, b) => a.order - b.order);
    cachedSkillsPayload = skills;
    cachedSkillsExpiresAt = Date.now() + skillsCacheTtlMs;
    return skills;
  })();

  try {
    return await cachedSkillsPromise;
  } finally {
    cachedSkillsPromise = null;
  }
}

async function loadProject(slug: string, DOMPurify: { sanitize: (input: string) => string }): Promise<ProjectPayload> {
  const mediaPath = join(projectsRoot, slug, 'media');
  const markdownPath = join(projectsRoot, slug, 'contents.md');
  const metaPath = join(projectsRoot, slug, 'meta.json');

  const markdown: string = await readFile(markdownPath, 'utf-8');
  const unsafeHtml: string = await marked.parse(markdown);
  const sanitizedHtml = DOMPurify.sanitize(unsafeHtml);

  const mediaFiles = (await readdir(mediaPath)).sort((a, b) => a.localeCompare(b));
  const mediaUrls = mediaFiles.map(file => `/api/projects/${slug}/media/${file}`);

  let title: string = slug;
  let subtitle: string = '';
  let skills: string[] = [];
  let order = 999;

  try {
    const metaRaw = await readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaRaw);
    title = typeof meta.title === 'string' ? meta.title : slug;
    subtitle = typeof meta.subtitle === 'string' ? meta.subtitle : '';
    order = typeof meta.order === 'number' ? meta.order : 999;
    if (Array.isArray(meta.skills)) {
      skills = meta.skills.filter((s: unknown): s is string => typeof s === 'string');
    }
  } catch {
    // meta.json is optional; fall back to defaults
  }

  return { slug, title, subtitle, html: sanitizedHtml, media: mediaUrls, skills, order };
}

app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await loadAllProjects();
    res.json({ projects });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

app.get('/api/models', async (_req, res) => {
  try {
    const models = await loadAllModels();
    res.json({ models });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load models' });
  }
});

app.get('/api/models/:slug/file/:filename', async (req, res) => {
  const { slug, filename } = req.params;

  if (!isInputValid(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }

  if (filename !== basename(filename)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = normalize(join(modelsRoot, slug, filename));
  const expectedRoot = normalize(join(modelsRoot, slug) + '/');
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

app.get('/api/projects/:slug', async (req, res) => {
  const slug = req.params.slug;
  // Sanitize: only allow alphanumeric and hyphens
  if (!isInputValid(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }

  try {
    const DOMPurify = (await import('isomorphic-dompurify')).default;
    const project = await loadProject(slug, DOMPurify);
    const { order, ...payload } = project;
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(404).json({ error: 'Not found' });
  }
});

// ── Skills API ────────────────────────────────────────────────

app.get('/api/skills', async (_req, res) => {
  try {
    const skills = await loadAllSkills();
    res.json({ skills });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list skills' });
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
