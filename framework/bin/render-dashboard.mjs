#!/usr/bin/env node
// Render Mission Control dashboard from features/*/ state.
// Zero deps — pure Node.js. Writes dashboard.html at repo root.

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listDirectoryNames, listMarkdownFilenames } from './lib/fs-utils.mjs';
import { loadFeature, isStale } from './lib/feature.mjs';
import { renderRootDashboard, renderFeatureStandalone, renderFeatureBody, renderBrowseFragment } from './lib/render-html.mjs';
import { renderIndex } from './lib/render-index.mjs';
import { renderDocFromFile, renderFolderIndex, renderExamplesIndex } from './lib/render-docs.mjs';

// Script lives at <repo-root>/framework/bin/render-dashboard.mjs.
const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const FEATURES_DIR = join(REPO_ROOT, 'features');
const DASHBOARD_PATH = join(REPO_ROOT, 'dashboard.html');

// Shared stylesheet — edit `framework/assets/dashboard.css` directly to
// tweak styling. Both the root and per-feature pages link to it.
const ROOT_CSS_HREF = 'framework/assets/dashboard.css';
const FEATURE_CSS_HREF = '../../framework/assets/dashboard.css';

// A feature is "stale" if it hasn't seen activity in this many days, or if
// its mission/orchestrator status is `done` or `paused`. Override via env.
const STALE_DAYS = Number(process.env.MISSION_STALE_DAYS || 7);

async function main() {
  const slugs = await listDirectoryNames(FEATURES_DIR);
  if (!slugs.length) {
    console.error(`No features found under ${FEATURES_DIR}`);
  }

  const features = await Promise.all(slugs.map(slug => loadFeature(FEATURES_DIR, slug)));

  await writeFile(DASHBOARD_PATH, renderRootDashboard(features, {
    staleDays: STALE_DAYS,
    cssHref: ROOT_CSS_HREF,
  }));

  // Per-feature artifacts written next to each feature folder:
  //   _index.md               — agent-targeted index (read by /catch-up)
  //   dashboard.html          — standalone, self-contained page (file:// viewable)
  //   dashboard-fragment.html — feature body innerHTML only; fetched by the root dashboard
  //   browse-fragment.html    — full "Browse history" tree; fetched lazily by both pages
  //
  // The standalone page's body uses an empty basePath so its inline browse
  // stub fetches `browse-fragment.html` relative to itself. The root
  // dashboard's body fragment uses `features/<slug>/` so the same stub,
  // once injected into the root document, points back into the feature dir.
  for (const feature of features) {
    const archived = isStale(feature, STALE_DAYS);
    await writeFile(join(feature.dir, '_index.md'), renderIndex(feature));
    await writeFile(join(feature.dir, 'dashboard.html'), renderFeatureStandalone(feature, {
      staleDays: STALE_DAYS,
      cssHref: FEATURE_CSS_HREF,
    }));
    await writeFile(join(feature.dir, 'dashboard-fragment.html'), renderFeatureBody(feature, {
      archived,
      staleDays: STALE_DAYS,
      basePath: `features/${feature.slug}/`,
    }));
    await writeFile(join(feature.dir, 'browse-fragment.html'), renderBrowseFragment(feature));
  }

  const docCount = await renderDocPages();

  const featureCount = features.length;
  console.log(`Wrote ${DASHBOARD_PATH} + ${featureCount} feature page${featureCount === 1 ? '' : 's'} (standalone + body + browse fragments + _index.md each) + ${docCount} doc page${docCount === 1 ? '' : 's'}`);
}

// Doc pages — the linked cards on `index.html` (Agents roster, Conventions,
// Slash commands, …). Each .md gets a styled HTML sibling that uses the same
// dashboard chrome, so clicking through from index.html doesn't drop you onto
// a raw markdown file.
//
// CSS hrefs are relative to wherever the generated page sits, so a doc deep
// inside `framework/commands/` still resolves `framework/assets/dashboard.css`
// correctly.
// `trail` is the breadcrumb segments BEFORE the page itself — the renderer
// appends the page's own title as the final (unlinked) crumb.
const DOC_PAGES = [
  { rel: 'AGENTS.md',                       depth: 0, trail: [], title: 'Agent roster',         badge: '<span class="muted">identities</span>' },
  { rel: 'README.md',                       depth: 0, trail: [], title: 'Human setup guide',    badge: '<span class="muted">onboarding</span>' },
  { rel: 'framework/README.md',             depth: 1, trail: [], title: 'Framework README',     badge: '<span class="muted">agent protocol</span>' },
  { rel: 'framework/CONVENTIONS.md',        depth: 1, trail: [{ label: 'Framework', href: 'README.html' }], badge: '<span class="muted">reference</span>' },
  { rel: 'framework/orchestrator/brief.md', depth: 2, trail: [{ label: 'Framework', href: '../README.html' }], badge: '<span class="muted">reference</span>' },
];

const FOLDER_INDEXES = [
  {
    rel: 'framework/commands',
    depth: 1,
    title: 'Slash commands',
    intro: '`/bootstrap`, `/join`, `/resume`, `/catch-up`, `/refresh`, `/pivot`, `/handoff`, `/audit`, `/close-project` — the verbs agents use to operate on a feature.',
    trail: [{ label: 'Framework', href: '../README.html' }],
    entryHref: stem => `${stem}.html`,
  },
  {
    rel: 'framework/templates',
    depth: 1,
    title: 'Templates',
    intro: 'Mission, log, decision, contract, digest templates. `/bootstrap` copies from here when scaffolding a new feature folder.',
    trail: [{ label: 'Framework', href: '../README.html' }],
    entryHref: stem => `${stem}.html`,
  },
];

const EXAMPLES_INDEX = {
  rel: 'framework/examples',
  depth: 1,
  title: 'Examples',
  trail: [{ label: 'Framework', href: '../README.html' }],
};

// `depth` is how many directory levels the page sits below the repo root:
// `AGENTS.html` is 0; `framework/CONVENTIONS.html` is 1; `framework/commands/foo.html` is 2.
// Root-level pages need the full path; everything inside `framework/` walks
// up to `framework/` then into `assets/`.
function cssHrefFor(depth) {
  if (depth === 0) return 'framework/assets/dashboard.css';
  return '../'.repeat(depth - 1) + 'assets/dashboard.css';
}

function rootHrefFor(depth) {
  if (depth === 0) return 'index.html';
  return '../'.repeat(depth) + 'index.html';
}

async function renderDocPages() {
  let written = 0;

  for (const doc of DOC_PAGES) {
    const filePath = join(REPO_ROOT, doc.rel);
    const outPath = filePath.replace(/\.md$/, '.html');
    const html = await renderDocFromFile({
      filePath,
      cssHref: cssHrefFor(doc.depth),
      rootHref: rootHrefFor(doc.depth),
      trail: doc.trail,
      badge: doc.badge,
      titleOverride: doc.title,
    });
    await writeFile(outPath, html);
    written++;
  }

  for (const folder of FOLDER_INDEXES) {
    const folderPath = join(REPO_ROOT, folder.rel);
    const cssHref = cssHrefFor(folder.depth + 1); // entries live one level deeper.
    const indexCss = cssHrefFor(folder.depth + 1); // folder index also one level in.
    const indexHtml = await renderFolderIndex({
      folderPath,
      cssHref: indexCss,
      rootHref: rootHrefFor(folder.depth + 1),
      trail: folder.trail,
      title: folder.title,
      intro: folder.intro,
      entryHref: folder.entryHref,
    });
    await writeFile(join(folderPath, 'index.html'), indexHtml);
    written++;

    // Render each .md inside the folder.
    const entries = await listMarkdownFilenames(folderPath);
    for (const entry of entries) {
      const entryPath = join(folderPath, entry);
      const stem = entry.replace(/\.md$/, '');
      const entryHtmlPath = join(folderPath, `${stem}.html`);
      const html = await renderDocFromFile({
        filePath: entryPath,
        cssHref,
        rootHref: rootHrefFor(folder.depth + 1),
        trail: [...folder.trail, { label: folder.title, href: 'index.html' }],
      });
      await writeFile(entryHtmlPath, html);
      written++;
    }
  }

  // Examples — folder of folders.
  const examplesPath = join(REPO_ROOT, EXAMPLES_INDEX.rel);
  const examplesHtml = await renderExamplesIndex({
    folderPath: examplesPath,
    cssHref: cssHrefFor(EXAMPLES_INDEX.depth + 1),
    rootHref: rootHrefFor(EXAMPLES_INDEX.depth + 1),
    trail: EXAMPLES_INDEX.trail,
    title: EXAMPLES_INDEX.title,
  });
  await writeFile(join(examplesPath, 'index.html'), examplesHtml);
  written++;

  return written;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
