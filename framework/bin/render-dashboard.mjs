#!/usr/bin/env node
// Render Mission Control dashboard from features/*/ state.
// Zero deps — pure Node.js. Writes dashboard.html at repo root.

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listDirectoryNames } from './lib/fs-utils.mjs';
import { loadFeature, isStale } from './lib/feature.mjs';
import { renderRootDashboard, renderFeatureStandalone, renderFeatureBody, renderBrowseFragment } from './lib/render-html.mjs';
import { renderIndex } from './lib/render-index.mjs';

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

  const featureCount = features.length;
  console.log(`Wrote ${DASHBOARD_PATH} + ${featureCount} feature page${featureCount === 1 ? '' : 's'} (standalone + body + browse fragments + _index.md each)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
