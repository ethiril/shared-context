// HTML rendering for the dashboard's static doc pages. Each linked card on
// `index.html` lands on a page produced here (AGENTS.html, CONVENTIONS.html,
// per-command pages, folder indexes for commands/templates/examples). The
// chrome — sticky header + main + dashboard.css — matches `dashboard.html`
// so navigating between dashboard and docs feels continuous.

import { readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

import { escapeHtml, parseFrontmatter, blockMdDoc, inlineMd, rewriteMdLink } from './markdown.mjs';
import { listDirectoryNames, listMarkdownFilenames } from './fs-utils.mjs';

function docPage({ title, cssHref, breadcrumbs, badge, bodyHtml }) {
  const crumbHtml = breadcrumbs.map((crumb, idx) => {
    const isLast = idx === breadcrumbs.length - 1;
    if (isLast || !crumb.href) return `<span>${escapeHtml(crumb.label)}</span>`;
    return `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>`;
  }).join('<span class="crumb-sep"> · </span>');
  const badgeHtml = badge ? `<span class="meta">${badge}</span>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — shared-context</title>
  <link rel="stylesheet" href="${cssHref}">
</head>
<body>
  <header class="sticky">
    <h1>${crumbHtml}</h1>
    ${badgeHtml}
  </header>
  <main class="doc-main">
    <article class="doc-body">
${bodyHtml}
    </article>
  </main>
</body>
</html>
`;
}

// Pull a single-sentence description for a folder-index card. Frontmatter
// `description:` wins; otherwise we fall back to the first paragraph after
// the H1, stripped to a short blurb.
function describeDoc(fm, body) {
  if (fm?.description) return String(fm.description).trim();
  if (!body) return '';
  const stripped = body.replace(/^#\s+.+$/m, '').trim();
  const firstPara = stripped.split(/\n\s*\n/).find(chunk => chunk.trim() && !chunk.startsWith('#'));
  if (!firstPara) return '';
  return firstPara.replace(/\s+/g, ' ').trim().slice(0, 220);
}

// Title for a doc: frontmatter `title:` > first H1 > capitalised filename.
function titleOf(fm, body, fallback) {
  if (fm?.title) return String(fm.title).trim();
  const headingMatch = body?.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  return fallback;
}

// Build the breadcrumbs list, with the trail home pointing back at index.html
// via the supplied relative href.
function crumbsFor({ rootHref, trail }) {
  return [{ label: 'shared-context', href: rootHref }, ...trail];
}

// Render a single .md file to a styled HTML doc page. Returns the page HTML;
// caller decides where to write it. The relative `cssHref` and `rootHref` are
// what makes this work from arbitrary subfolders. `titleOverride` lets a
// caller use a friendlier breadcrumb label than the file's H1.
export async function renderDocFromFile({ filePath, cssHref, rootHref, trail, badge, titleOverride }) {
  const raw = await readFile(filePath, 'utf8');
  const { fm, body } = parseFrontmatter(raw);
  const fallback = basename(filePath).replace(/\.md$/, '');
  const title = titleOverride || titleOf(fm, body, fallback);

  // Drop the first H1 anywhere in the body — the title shows in the
  // breadcrumb. README.md keeps the H1 below a leading blockquote, so the
  // /m flag matters. Remaining headings keep their numeric level (## stays
  // h2 under our shift=0).
  const bodyWithoutTitle = body.replace(/^#\s+[^\n]*\n?/m, '');

  const bodyHtml = blockMdDoc(bodyWithoutTitle, { headingShift: 0 });
  return docPage({
    title,
    cssHref,
    breadcrumbs: crumbsFor({ rootHref, trail: [...trail, { label: title }] }),
    badge,
    bodyHtml,
  });
}

// Render a folder of .md files into a card-grid index page (mirrors the
// look of `index.html`'s entry cards). Each entry links to its rendered
// per-file HTML sibling.
export async function renderFolderIndex({ folderPath, cssHref, rootHref, trail, title, intro, entryHref }) {
  const names = await listMarkdownFilenames(folderPath);

  const cards = await Promise.all(names.map(async name => {
    const raw = await readFile(join(folderPath, name), 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    const stem = name.replace(/\.md$/, '');
    // Stem beats H1 for the card title — template H1s are placeholders
    // (`<title>`, `Mission Control — <feature-slug>`) and command files
    // have no H1 at all; the stem is what humans actually reference.
    const cardTitle = stem;
    const description = describeDoc(fm, body);
    const href = entryHref(stem);
    return `      <a class="entry-card" href="${href}">
        <div class="label"><h3>${escapeHtml(cardTitle)}</h3><span class="kind">${escapeHtml(stem)}.md</span></div>
        ${description ? `<p>${inlineMd(description, { linkRewrite: rewriteMdLink })}</p>` : ''}
        <span class="path">→ ${escapeHtml(href)}</span>
      </a>`;
  }));

  const bodyHtml = `      ${intro ? `<p class="doc-intro">${inlineMd(intro, { linkRewrite: rewriteMdLink })}</p>` : ''}
      <div class="card-grid">
${cards.join('\n')}
      </div>`;

  return docPage({
    title,
    cssHref,
    breadcrumbs: crumbsFor({ rootHref, trail: [...trail, { label: title }] }),
    badge: `<span class="muted">${names.length} ${names.length === 1 ? 'entry' : 'entries'}</span>`,
    bodyHtml,
  });
}

// Folder index for `framework/examples/`, which holds sub-folders rather
// than top-level .md files. Each subfolder's `README.md` (or any .md inside)
// provides the description.
export async function renderExamplesIndex({ folderPath, cssHref, rootHref, trail, title }) {
  const subfolders = await listDirectoryNames(folderPath);
  subfolders.sort();

  const cards = await Promise.all(subfolders.map(async sub => {
    const subPath = join(folderPath, sub);
    let description = '';
    let cardTitle = sub;
    try {
      const readmePath = join(subPath, 'README.md');
      const raw = await readFile(readmePath, 'utf8');
      const { fm, body } = parseFrontmatter(raw);
      cardTitle = titleOf(fm, body, sub);
      description = describeDoc(fm, body);
    } catch {
      // No README — fine, leave description empty.
    }
    const href = `${sub}/`;
    return `      <a class="entry-card" href="${href}">
        <div class="label"><h3>${escapeHtml(cardTitle)}</h3><span class="kind">folder</span></div>
        ${description ? `<p>${inlineMd(description, { linkRewrite: rewriteMdLink })}</p>` : ''}
        <span class="path">→ ${escapeHtml(href)}</span>
      </a>`;
  }));

  // Also surface any top-level README in the folder itself.
  let intro = '';
  try {
    const raw = await readFile(join(folderPath, 'README.md'), 'utf8');
    const { body } = parseFrontmatter(raw);
    intro = describeDoc(null, body);
  } catch { /* no top-level README */ }

  const bodyHtml = `      ${intro ? `<p class="doc-intro">${inlineMd(intro, { linkRewrite: rewriteMdLink })}</p>` : ''}
      <div class="card-grid">
${cards.join('\n')}
      </div>`;

  return docPage({
    title,
    cssHref,
    breadcrumbs: crumbsFor({ rootHref, trail: [...trail, { label: title }] }),
    badge: `<span class="muted">${subfolders.length} example${subfolders.length === 1 ? '' : 's'}</span>`,
    bodyHtml,
  });
}
