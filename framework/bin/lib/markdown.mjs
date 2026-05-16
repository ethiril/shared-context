// Markdown + HTML helpers. Pure functions — no I/O, no globals.
//
// The renderer reads markdown notes with YAML-ish frontmatter and emits HTML
// for the dashboard plus a markdown agent-index. Each helper here is small
// enough to reason about in isolation; what is shared across modules lives
// here so neither the HTML nor index renderer needs its own copy.

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const LIST_ITEM_PATTERN = /^\s*-\s/;
const KEY_VALUE_PATTERN = /^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/;
const SUMMARY_MAX_LENGTH = 200;

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Parses YAML-ish frontmatter at the head of a markdown document. Supports
// scalar values, inline `[a, b, c]` arrays, and indented `- item` lists under
// a parent key. Anything fancier is out of scope — the convention is kept
// deliberately small so a human can read a feature note without a parser.
export function parseFrontmatter(text) {
  if (!text) return { fm: {}, body: '' };
  const match = text.match(FRONTMATTER_PATTERN);
  if (!match) return { fm: {}, body: text };

  const fm = {};
  let currentKey = null;

  for (const line of match[1].split('\n')) {
    if (LIST_ITEM_PATTERN.test(line) && currentKey) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(line.replace(LIST_ITEM_PATTERN, '').trim());
      continue;
    }
    const keyValueMatch = line.match(KEY_VALUE_PATTERN);
    if (!keyValueMatch) continue;

    const key = keyValueMatch[1];
    const rawValue = keyValueMatch[2].trim();
    currentKey = key;

    if (rawValue === '') {
      fm[key] = [];
      continue;
    }
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      fm[key] = rawValue.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
      continue;
    }
    fm[key] = rawValue;
  }

  return { fm, body: match[2] };
}

// Returns the markdown beneath the named H2 heading (`## Heading`) up to the
// next H2 or EOF. Empty string if the heading isn't present.
export function extractSection(body, heading) {
  if (!body) return '';
  const lines = body.split('\n');
  const headingLower = `## ${heading.toLowerCase()}`;
  const startIndex = lines.findIndex(line => line.trim().toLowerCase() === headingLower);
  if (startIndex === -1) return '';
  const remainder = lines.slice(startIndex + 1);
  const nextHeadingIndex = remainder.findIndex(line => /^##\s/.test(line));
  const sectionLines = nextHeadingIndex === -1 ? remainder : remainder.slice(0, nextHeadingIndex);
  return sectionLines.join('\n').trim();
}

// Returns each top-level bullet from a markdown chunk as a single string,
// joining indented continuation lines. Blank lines terminate a bullet,
// empty bullets are silently dropped.
export function extractBullets(markdown) {
  if (!markdown) return [];
  const bullets = [];
  let current = null;

  for (const line of markdown.split('\n')) {
    if (LIST_ITEM_PATTERN.test(line)) {
      if (current) bullets.push(current);
      current = line.replace(LIST_ITEM_PATTERN, '').trim();
      continue;
    }
    if (line.trim() === '') {
      if (current) bullets.push(current);
      current = null;
      continue;
    }
    if (current) current += ' ' + line.trim();
  }
  if (current) bullets.push(current);
  return bullets;
}

// Best-effort single-sentence summary for browse rows + the agent index.
// Preference order: frontmatter `summary:`, then the first H1 title, then
// the first sentence of body prose (skipping headings and table rows).
export function extractSummary(item) {
  if (item.fm?.summary) return String(item.fm.summary).trim().slice(0, SUMMARY_MAX_LENGTH);

  const body = item.body || '';
  const firstHeading = body.match(/^#\s+(.+)$/m);
  if (firstHeading) return firstHeading[1].trim().slice(0, SUMMARY_MAX_LENGTH);

  for (const paragraph of body.split(/\n\s*\n/)) {
    const proseLines = paragraph
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (!trimmed.length) return false;
        if (/^#{1,6}\s/.test(trimmed)) return false;
        if (trimmed.startsWith('|')) return false;
        if (/^[-=]{3,}$/.test(trimmed)) return false;
        return true;
      });
    if (!proseLines.length) continue;

    const collapsed = proseLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!collapsed) continue;
    const sentenceMatch = collapsed.match(/^(.{10,200}?[.!?])(\s|$)/);
    const sentence = sentenceMatch ? sentenceMatch[1] : collapsed;
    return sentence.slice(0, SUMMARY_MAX_LENGTH).trim();
  }
  return '';
}

// Minimal inline markdown → HTML for bullets/paragraphs: bold, italic, inline
// code, links. Inline code is tokenised first so emphasis never reaches into
// it, and italic boundaries are conservative to avoid mangling identifiers
// like `max_redemptions`.
export function inlineMd(source) {
  let html = escapeHtml(source);

  const codeSpans = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    return ` CODE${codeSpans.length - 1} `;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `<a href="${url}">${text}</a>`);
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');

  return html.replace(/ CODE(\d+) /g, (_, index) => `<code>${codeSpans[parseInt(index, 10)]}</code>`);
}

// Minimal block markdown → HTML for snapshot section bodies. Handles
// paragraphs, bullet lists, and H1–H3 (mapped to h2–h4 so the dashboard's
// outer h1/h2/h3 hierarchy is preserved).
export function blockMd(markdown) {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const output = [];
  let paragraphBuffer = [];
  let isInsideList = false;

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    output.push(`<p>${inlineMd(paragraphBuffer.join(' '))}</p>`);
    paragraphBuffer = [];
  };
  const closeList = () => {
    if (!isInsideList) return;
    output.push('</ul>');
    isInsideList = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) { flushParagraph(); closeList(); continue; }

    if (LIST_ITEM_PATTERN.test(line)) {
      flushParagraph();
      if (!isInsideList) { output.push('<ul>'); isInsideList = true; }
      output.push(`<li>${inlineMd(line.replace(LIST_ITEM_PATTERN, ''))}</li>`);
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph(); closeList();
      const level = headingMatch[1].length + 1; // # → h2, ## → h3, ### → h4
      output.push(`<h${level}>${inlineMd(headingMatch[2])}</h${level}>`);
      continue;
    }

    paragraphBuffer.push(line);
  }
  flushParagraph();
  closeList();
  return output.join('\n');
}
