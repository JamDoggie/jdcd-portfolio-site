import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { marked } from 'marked';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

function isInputValid(input : string)
{
  return /^[a-z0-9-]+$/.test(input);
}

app.get('/api/projects/:slug', async (req, res) => {
  const slug = req.params.slug;
  // Sanitize: only allow alphanumeric and hyphens
  if (!isInputValid(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }

  /*const filePath = join(import.meta.dirname, '../content/projects', `${slug}.md`);
  try {
    const markdown = await readFile(filePath, 'utf-8');
    const { marked } = await import('marked');
    const html = await marked(markdown);
    res.json({ slug, html });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }*/

  const mediaPath = '../content/projects/' + slug + '/images/';
  const markdownPath = '../content/projects/' + slug + '/' + 'contents.md';

  try {
    const markdown = await readFile(markdownPath, 'utf-8');


  } catch {
    res.status(404).json({ error: 'Not found' });
  }
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
