// Domain model for a "global project" — a folder under `globals/<project-id>/`
// containing PROJECT.md and category subfolders (architecture/, conventions/,
// glossary/) with .md entries.
//
// Features opt in by declaring `project: <project-id>` in their MISSION.md
// frontmatter. This module knows nothing about features — pairing happens in
// the render layer.

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { listDirectoryNames, listMarkdownFilenames, readFileIfExists } from './fs-utils.mjs';
import { parseFrontmatter } from './markdown.mjs';

const CATEGORY_DIRS = ['architecture', 'conventions', 'glossary'];
const SUPERSEDED = 'superseded';
const RETIRED = 'retired';

async function loadCategory(folderPath) {
  const filenames = await listMarkdownFilenames(folderPath);
  const items = [];
  for (const filename of filenames) {
    const raw = await readFile(join(folderPath, filename), 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    items.push({ filename, fm, body });
  }
  // Apply supersede semantics: if entry's `slug` appears as another entry's
  // `supersedes:`, mark the earlier one retired.
  const supersededSlugs = new Set(
    items.map(i => i.fm.supersedes).filter(Boolean),
  );
  for (const item of items) {
    if (item.fm.slug && supersededSlugs.has(item.fm.slug)) {
      item.fm.status = SUPERSEDED;
    }
  }
  return items.sort((a, b) => (a.fm.slug || a.filename).localeCompare(b.fm.slug || b.filename));
}

export async function loadProject(globalsDir, projectId) {
  const projectPath = join(globalsDir, projectId);

  const projectMdRaw = await readFileIfExists(join(projectPath, 'PROJECT.md'));
  const project = parseFrontmatter(projectMdRaw);

  const entriesByCategory = {};
  for (const category of CATEGORY_DIRS) {
    entriesByCategory[category] = await loadCategory(join(projectPath, category));
  }

  return {
    id: projectId,
    dir: projectPath,
    project,
    entriesByCategory,
  };
}

export async function discoverProjects(globalsDir) {
  const ids = await listDirectoryNames(globalsDir);
  return Promise.all(ids.map(id => loadProject(globalsDir, id)));
}

export function activeEntries(category) {
  return (category || []).filter(item => {
    const status = item.fm?.status;
    return status !== SUPERSEDED && status !== RETIRED;
  });
}
