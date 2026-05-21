// Agent-facing per-project index. Rendered as plain markdown to
// `globals/<project>/_index.md` so an agent on bootstrap/join/resume can
// load one cheap file and decide which specific entries (if any) to pull.
//
// The whole point is to keep entry bodies OUT of context by default. This
// index lists slugs, keywords, and one-line summaries — nothing more.

import { extractSummary } from './markdown.mjs';
import { activeEntries } from './globals.mjs';

const CATEGORY_ORDER = ['architecture', 'conventions', 'glossary'];
const CATEGORY_HEADINGS = {
  architecture: 'Architecture',
  conventions: 'Conventions',
  glossary: 'Glossary',
};

export function renderGlobalIndex(project, linkedFeatures) {
  const generatedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const lines = [];

  lines.push(`# ${project.id} — agent index`);
  lines.push('');
  lines.push(`Generated ${generatedAt}. **Auto-regenerated on every globals write — do not edit by hand.**`);
  lines.push('');
  lines.push(`Project root: [\`PROJECT.md\`](PROJECT.md) — read this first for mission, owners, north star.`);
  lines.push('');
  lines.push('**How to use this file.** This is the cheap entry point. Find a slug whose keywords match your task, then read that single file. Do not bulk-load entries.');
  lines.push('');

  appendProjectSummary(lines, project);
  appendLinkedFeatures(lines, linkedFeatures);

  for (const category of CATEGORY_ORDER) {
    appendCategorySection(lines, category, project.entriesByCategory[category] || []);
  }

  appendRetiredSection(lines, project);

  return lines.join('\n');
}

function appendProjectSummary(lines, project) {
  const summary = project.project?.fm?.summary;
  if (!summary) return;
  lines.push('## Project summary');
  lines.push(`> ${summary}`);
  lines.push('');
}

function appendLinkedFeatures(lines, linkedFeatures) {
  if (!linkedFeatures || !linkedFeatures.length) return;
  lines.push('## Active features under this project');
  for (const feature of linkedFeatures) {
    const goalLine = featureGoalOneLiner(feature);
    const statusBadge = feature.mission?.fm?.status ? ` · \`${feature.mission.fm.status}\`` : '';
    lines.push(`- [${feature.slug}](../../features/${feature.slug}/MISSION.md)${statusBadge}${goalLine ? ` — ${goalLine}` : ''}`);
  }
  lines.push('');
}

function featureGoalOneLiner(feature) {
  const body = feature.mission?.body || '';
  const match = body.match(/^##\s+Goal\s*\n+([^\n]+)/m);
  if (!match) return '';
  const sentence = match[1].split(/(?<=[.!?])\s+/)[0] || match[1];
  return sentence.length > 160 ? sentence.slice(0, 157) + '…' : sentence;
}

function appendCategorySection(lines, category, entries) {
  const active = activeEntries(entries);
  if (!active.length) return;

  lines.push(`## ${CATEGORY_HEADINGS[category] || category}`);
  lines.push('');
  lines.push('| slug | keywords | summary |');
  lines.push('|------|----------|---------|');
  for (const entry of active) {
    const slug = entry.fm.slug || entry.filename.replace(/\.md$/, '');
    const keywords = Array.isArray(entry.fm.keywords)
      ? entry.fm.keywords.join(', ')
      : (entry.fm.keywords || '');
    const summary = entry.fm.summary || extractSummary(entry) || '';
    const cleanSummary = summary.replace(/\|/g, '\\|').replace(/\n+/g, ' ');
    lines.push(`| [\`${slug}\`](${category}/${entry.filename}) | ${keywords} | ${cleanSummary} |`);
  }
  lines.push('');
}

function appendRetiredSection(lines, project) {
  const retired = [];
  for (const category of CATEGORY_ORDER) {
    const all = project.entriesByCategory[category] || [];
    for (const entry of all) {
      const status = entry.fm?.status;
      if (status === 'superseded' || status === 'retired') {
        retired.push({ category, entry });
      }
    }
  }
  if (!retired.length) return;

  lines.push('## Retired entries (skip in default reads)');
  lines.push('');
  for (const { category, entry } of retired) {
    const slug = entry.fm.slug || entry.filename.replace(/\.md$/, '');
    const note = entry.fm.status === 'superseded'
      ? `superseded`
      : `retired`;
    lines.push(`- \`${category}/${entry.filename}\` · ${slug} — ${note}`);
  }
  lines.push('');
}
