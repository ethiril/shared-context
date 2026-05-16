// Domain model for a "feature" — a folder under `features/<slug>/` containing
// MISSION.md, snapshots, logs, decisions, contracts, repos, cursors, etc.
//
// Everything here is about *loading and classifying* a feature: status,
// staleness, attention items, the browse tree. The HTML and markdown
// renderers depend only on the shapes returned here.

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  listDirectoryNames,
  listMarkdownFilenames,
  latestMarkdownFilename,
  readFileIfExists,
  readLatestMarkdown,
} from './fs-utils.mjs';
import { parseFrontmatter, extractSection, extractBullets } from './markdown.mjs';

const MS_PER_DAY = 86_400_000;
const TOMBSTONE_VARIANTS = { SKIPPED: 'skipped' };
const STATUSES = { SUPERSEDED: 'superseded', SKIPPED: 'skipped', DONE: 'done', PAUSED: 'paused' };

// ISO timestamp embedded in canonical filenames like
// `2026-01-10T09-00-00-headline.md`. The colons are encoded as dashes for
// filesystem-safety; we reverse that here so downstream sorting compares
// real ISO strings.
export function timestampFromFilename(filename) {
  if (!filename) return null;
  const match = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
  if (!match) return null;
  return match[1].replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3') + 'Z';
}

export function pickLatestTimestamp(candidateValues) {
  const cleaned = candidateValues.filter(Boolean).map(value => String(value));
  if (!cleaned.length) return null;
  cleaned.sort();
  return cleaned[cleaned.length - 1];
}

export function relativeTime(isoTimestamp) {
  if (!isoTimestamp) return 'unknown';
  const epochMs = new Date(isoTimestamp).getTime();
  if (Number.isNaN(epochMs)) return isoTimestamp;

  const minutesAgo = Math.round((Date.now() - epochMs) / 60_000);
  if (minutesAgo < 1) return 'just now';
  if (minutesAgo < 60) return `${minutesAgo} min ago`;

  const hoursAgo = Math.round(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo} hr ago`;

  const daysAgo = Math.round(hoursAgo / 24);
  return `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
}

// Reads every markdown file in a folder, applies tombstone semantics
// (`.superseded.md` retires its sibling; `.skipped.md` is a standalone
// "discussed but not published" marker), and returns items newest-first.
async function loadFolderItems(folderPath) {
  const filenames = await listMarkdownFilenames(folderPath);
  const items = [];
  const supersedeTombstones = [];

  for (const filename of filenames) {
    const raw = await readFile(join(folderPath, filename), 'utf8');
    const { fm, body } = parseFrontmatter(raw);

    const isSkippedTombstone = /\.skipped\.md$/.test(filename) || fm.variant === TOMBSTONE_VARIANTS.SKIPPED;
    if (isSkippedTombstone) {
      fm.type = 'tombstone';
      fm.variant = TOMBSTONE_VARIANTS.SKIPPED;
      fm.status = STATUSES.SKIPPED;
      items.push({ filename, fm, body, ts: timestampFromFilename(filename) });
      continue;
    }

    const isSupersedeTombstone = fm.type === 'tombstone' || /\.superseded\.md$/.test(filename);
    if (isSupersedeTombstone) {
      const originalFilename = fm.original || filename.replace(/\.superseded\.md$/, '.md');
      supersedeTombstones.push({ original: originalFilename, superseded_by: fm.superseded_by, at: fm.at });
      continue;
    }

    items.push({ filename, fm, body, ts: timestampFromFilename(filename) });
  }

  for (const tombstone of supersedeTombstones) {
    const target = items.find(item => item.filename === tombstone.original);
    if (!target) continue;
    target.fm.status = STATUSES.SUPERSEDED;
    if (tombstone.superseded_by) target.fm.superseded_by = tombstone.superseded_by;
    if (tombstone.at) target.fm.superseded_at = tombstone.at;
  }

  return items.sort((a, b) => b.filename.localeCompare(a.filename));
}

async function loadSubfolderedItems(folderPath) {
  const subfolders = await listDirectoryNames(folderPath);
  const result = {};
  for (const subfolder of subfolders) {
    result[subfolder] = await loadFolderItems(join(folderPath, subfolder));
  }
  return result;
}

async function loadBrowseTree(featurePath) {
  return {
    overview: await loadFolderItems(join(featurePath, 'overview')),
    orchestrator: await loadFolderItems(join(featurePath, 'orchestrator')),
    digest: await loadFolderItems(join(featurePath, 'digest')),
    decisions: await loadFolderItems(join(featurePath, 'decisions')),
    log: await loadFolderItems(join(featurePath, 'log')),
    tickets: await loadFolderItems(join(featurePath, 'tickets')),
    contracts: await loadSubfolderedItems(join(featurePath, 'contracts')),
    repos: await loadSubfolderedItems(join(featurePath, 'repos')),
    cursors: await loadSubfolderedItems(join(featurePath, 'cursors')),
  };
}

async function parseLatestSnapshot(folderPath) {
  const latest = await readLatestMarkdown(folderPath);
  if (!latest) return null;
  return { filename: latest.filename, ...parseFrontmatter(latest.content) };
}

export async function loadFeature(featuresDir, slug) {
  const featurePath = join(featuresDir, slug);

  const missionRaw = await readFileIfExists(join(featurePath, 'MISSION.md'));
  const mission = parseFrontmatter(missionRaw);

  const orchestrator = await parseLatestSnapshot(join(featurePath, 'orchestrator'));
  const digest = await parseLatestSnapshot(join(featurePath, 'digest'));

  const repoDirs = await listDirectoryNames(join(featurePath, 'repos'));
  const repoStatuses = {};
  for (const repo of repoDirs) {
    const latest = await parseLatestSnapshot(join(featurePath, 'repos', repo));
    if (latest) repoStatuses[repo] = latest;
  }

  const counts = {
    log: (await listMarkdownFilenames(join(featurePath, 'log'))).length,
    decisions: (await listMarkdownFilenames(join(featurePath, 'decisions'))).length,
    digest: (await listMarkdownFilenames(join(featurePath, 'digest'))).length,
    orchestrator: (await listMarkdownFilenames(join(featurePath, 'orchestrator'))).length,
    contracts: (await listDirectoryNames(join(featurePath, 'contracts'))).length,
  };

  const latestLogFilename = await latestMarkdownFilename(join(featurePath, 'log'));
  const lastActivity = pickLatestTimestamp([
    orchestrator?.fm?.at,
    digest?.fm?.at,
    timestampFromFilename(latestLogFilename),
    ...Object.values(repoStatuses).map(status => status.fm?.at),
  ]);

  const browse = await loadBrowseTree(featurePath);

  return {
    slug,
    dir: featurePath,
    mission,
    orchestrator,
    digest,
    repoStatuses,
    repoDirs,
    counts,
    lastActivity,
    browse,
  };
}

export function statusOf(feature) {
  return feature.orchestrator?.fm?.status || feature.mission?.fm?.status || 'unknown';
}

export function isStale(feature, staleDays) {
  const status = statusOf(feature);
  if (status === STATUSES.DONE || status === STATUSES.PAUSED) return true;
  if (!feature.lastActivity) return true;

  const epochMs = new Date(feature.lastActivity).getTime();
  if (Number.isNaN(epochMs)) return true;

  const ageInDays = (Date.now() - epochMs) / MS_PER_DAY;
  return ageInDays >= staleDays;
}

export function staleReason(feature, staleDays) {
  const status = statusOf(feature);
  if (status === STATUSES.DONE) return 'marked done';
  if (status === STATUSES.PAUSED) return 'paused';
  if (!feature.lastActivity) return 'no activity recorded';
  return `${relativeTime(feature.lastActivity)} — past ${staleDays}-day threshold`;
}

// Aggregates "Open for the human" bullets across ACTIVE features. Stale or
// archived features don't surface here — they're not currently in play.
// Bullets reading "Nothing — we're heads-down." (and variants) are dropped.
export function attentionItems(features, staleDays) {
  const items = [];
  for (const feature of features) {
    if (isStale(feature, staleDays)) continue;
    const orchestratorBody = feature.orchestrator?.body;
    if (!orchestratorBody) continue;

    const section = extractSection(orchestratorBody, 'Open for the human');
    for (const bullet of extractBullets(section)) {
      // Convention: "Nothing — we're heads-down." (and variants) means the
      // feature has no human-blocking work. Drop these from the dashboard.
      if (bullet.toLowerCase().startsWith('nothing')) continue;
      items.push({ slug: feature.slug, text: bullet });
    }
  }
  return items;
}

// Row metadata (time, primary, secondary labels) for the browse list. Shared
// between the HTML browse rows and the markdown agent index, hence here in
// the domain layer rather than next to either renderer.
export function rowFor(folder, item) {
  const rawTimestamp = (typeof item.fm.at === 'string' ? item.fm.at : null) || item.ts || '';
  const time = rawTimestamp.replace('Z', '').replace('T', ' ').replace(/:\d{2}$/, '');

  switch (folder) {
    case 'log': {
      const recipients = Array.isArray(item.fm.to) ? item.fm.to.join(', ') : (item.fm.to || '');
      const sender = item.fm.from || '?';
      return {
        time,
        primary: item.fm.kind || 'log',
        secondary: `${sender}${recipients ? ` → ${recipients}` : ''}`,
      };
    }
    case 'decisions': {
      const bodyHeading = (item.body || '').match(/^#\s+(.+)$/m);
      const fallbackTitle = bodyHeading ? bodyHeading[1] : item.filename.replace(/\.md$/, '');
      return { time, primary: item.fm.title || fallbackTitle, secondary: item.fm.status || '' };
    }
    case 'digest':
      return { time, primary: 'digest', secondary: item.fm.author || '?' };
    case 'orchestrator':
      return { time, primary: item.fm.status || 'snapshot', secondary: item.fm.trigger || 'manual' };
    case 'overview':
      return { time, primary: 'overview', secondary: `${item.fm.author || '?'} · ${item.fm.status || ''}` };
    case 'cursors': {
      const readMark = item.fm.last_checkpoint_read;
      return { time, primary: 'cursor', secondary: readMark ? `synced to ${String(readMark).slice(0, 19)}` : '' };
    }
    case 'repos':
      return { time, primary: 'status', secondary: '' };
    case 'contracts': {
      if (item.fm.variant === TOMBSTONE_VARIANTS.SKIPPED) {
        const reason = item.fm.reason ? String(item.fm.reason).slice(0, 80) : '';
        return { time, primary: `v${item.fm.version || '?'} skipped`, secondary: reason };
      }
      const breakingSuffix = String(item.fm.breaking) === 'true' ? ' · BREAKING' : '';
      return {
        time,
        primary: `v${item.fm.version || '?'}`,
        secondary: `${item.fm.author || '?'}${breakingSuffix}`,
      };
    }
    case 'tickets': {
      const title = item.fm.title || item.fm.slug || item.filename.replace(/\.md$/, '');
      const assignee = Array.isArray(item.fm.assignee) ? item.fm.assignee.join(', ') : (item.fm.assignee || '?');
      return { time, primary: title, secondary: `${item.fm.status || 'open'} · assignee: ${assignee}` };
    }
  }
  return { time, primary: item.filename, secondary: '' };
}
