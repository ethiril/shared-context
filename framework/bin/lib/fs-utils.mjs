// Filesystem helpers for the dashboard renderer. The renderer treats missing
// directories as empty — callers should never need to existsSync before asking.

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function listDirectoryNames(parentPath) {
  if (!existsSync(parentPath)) return [];
  const entries = await readdir(parentPath, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
    .map(entry => entry.name);
}

export async function listMarkdownFilenames(parentPath) {
  if (!existsSync(parentPath)) return [];
  const entries = await readdir(parentPath, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort();
}

// Lists files of any artefact-supported extension (md, dsl, positional).
// Used by folders that can mix legacy YAML and new compact-format artefacts
// (log, repos, contracts). Filenames are returned sorted; downstream callers
// dispatch on extension to pick a parser.
const ARTEFACT_EXTENSIONS = ['.md', '.dsl', '.positional'];

export async function listArtefactFilenames(parentPath) {
  if (!existsSync(parentPath)) return [];
  const entries = await readdir(parentPath, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile()
      && !entry.name.startsWith('.')
      && ARTEFACT_EXTENSIONS.some(ext => entry.name.endsWith(ext)))
    .map(entry => entry.name)
    .sort();
}

export async function latestMarkdownFilename(parentPath) {
  const filenames = await listMarkdownFilenames(parentPath);
  return filenames.length ? filenames[filenames.length - 1] : null;
}

export async function readFileIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return readFile(filePath, 'utf8');
}

export async function readLatestMarkdown(parentPath) {
  const filename = await latestMarkdownFilename(parentPath);
  if (!filename) return null;
  return { filename, content: await readFile(join(parentPath, filename), 'utf8') };
}
