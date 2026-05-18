// Parsers for the compact artefact formats (DSL log entry, DSL contract,
// positional repo-status). Each parser returns a `{fm, body}` shape compatible
// with the YAML-frontmatter parser in markdown.mjs so the downstream renderer
// can treat them uniformly.

// DSL kind enum (single-letter -> canonical full word). Used by the renderer
// when displaying log entries; keeps the row label readable.
const KIND_EXPANSIONS = {
  cc: 'contract-change',
  q:  'question',
  a:  'answer',
  fy: 'fyi',
  bl: 'blocker',
  pv: 'pivot',
  ch: 'change',
  ak: 'ack',
  tk: 'ticket-update',
};

function expandKind(short) {
  return KIND_EXPANSIONS[short] || short;
}

// Parse a single DSL log line:
//   from > to [kind] @at: summary | refs: r1,r2 | body...
// `to` may be a single repo, `all`, or comma-separated `r1,r2`.
// `at` may also appear as a leading `[at]` prefix (legacy form) — both accepted.
// `refs:` is optional. For `kind: pv`, a labelled `supersedes: ...` section
// may appear between `summary` and `refs`/`body`.
// Returns `{fm, body}` shaped like the YAML parser.
//
// Per the per-event filename convention, a DSL log *file* contains exactly one
// such line. Use `parseDslLogEntry(text)` from the loader; this function is the
// underlying line-shape parser, also reused by the lint hook.
export function parseDslLogLine(line) {
  const fm = { type: 'log' };
  let body = '';

  const trimmed = line.trim();
  if (!trimmed) return { fm: null, body: '' };

  // Legacy [at] prefix — accepted but not required.
  const prefixAtMatch = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
  let rest = trimmed;
  if (prefixAtMatch) {
    fm.at = prefixAtMatch[1];
    rest = prefixAtMatch[2];
  }

  // from > to [kind] [@at]: summary
  const headerMatch = rest.match(/^(\S+)\s*>\s*([^\[]+)\s*\[([^\]]+)\]\s*(?:@(\S+)\s*)?:\s*(.*)$/);
  if (!headerMatch) return { fm: null, body: line };

  fm.from = headerMatch[1].trim();
  const toRaw = headerMatch[2].trim();
  fm.to = toRaw === 'all' ? ['all'] : toRaw.split(',').map(s => s.trim()).filter(Boolean);
  fm.kind = expandKind(headerMatch[3].trim());
  if (headerMatch[4] && !fm.at) fm.at = headerMatch[4].trim();

  // Remainder is summary + optional `| refs:` + optional `| supersedes:` + body.
  const segments = headerMatch[5].split(/\s*\|\s*/);
  fm.summary = segments.shift() || '';

  const bodyParts = [];
  for (const seg of segments) {
    const segTrim = seg.trim();
    const refsMatch = segTrim.match(/^refs:\s*(.+)$/i);
    const supersedesMatch = segTrim.match(/^supersedes:\s*(.+)$/i);
    if (refsMatch) {
      fm.refs = refsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    } else if (supersedesMatch) {
      const value = supersedesMatch[1].trim();
      fm.supersedes = value === 'all-prior' ? 'all-prior' : value.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      bodyParts.push(seg);
    }
  }
  body = bodyParts.join(' | ');

  return { fm, body };
}

// Parse a DSL contract file (whole file is one line):
//   name@version [status] @at by <author>: summary | queue: ... | payload: ... | ...
// `@at` is optional (filename usually contains the timestamp).
export function parseDslContract(text) {
  const fm = { type: 'contract' };
  const line = text.trim();
  if (!line) return { fm: null, body: '' };

  const headerMatch = line.match(/^([^@]+)@(\S+)\s+\[([^\]]+)\]\s+(?:@(\S+)\s+)?by\s+(\S+):\s*(.*)$/);
  if (!headerMatch) return { fm: null, body: text };

  fm.name = headerMatch[1].trim();
  fm.version = headerMatch[2].trim();
  fm.status = headerMatch[3].trim();
  if (headerMatch[4]) fm.at = headerMatch[4].trim();
  fm.author = headerMatch[5].trim();

  const segments = headerMatch[6].split(/\s*\|\s*/);
  fm.summary = segments.shift() || '';

  const sections = {};
  for (const seg of segments) {
    const m = seg.match(/^([a-z_]+):\s*(.*)$/i);
    if (!m) continue;
    sections[m[1].toLowerCase()] = m[2].trim();
  }
  if (sections.queue)     fm.queue = sections.queue;
  if (sections.payload)   fm.payload = sections.payload;
  if (sections.producer)  fm.producer = sections.producer;
  if (sections.consumer)  fm.consumer = sections.consumer;
  if (sections.coupling)  fm.coupling = sections.coupling;
  if (sections.consumers) fm.consumers = sections.consumers.split(',').map(s => s.trim()).filter(Boolean);
  if (sections.breaking)  fm.breaking = sections.breaking.toLowerCase() === 'true';

  return { fm, body: '' };
}

// Parse a positional repo-status file (whole file is one line):
//   repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
// Fields 5-7 are `~`-separated lists; 8-9 are inline JSON arrays.
const POSITIONAL_REPO_FIELDS = [
  'repo', 'at', 'summary', 'current_goal',
  'done', 'next', 'blocked_on',
  'contracts_in_play', 'open_questions',
];

const POSITIONAL_TILDE_LISTS = new Set(['done', 'next', 'blocked_on']);
const POSITIONAL_JSON_FIELDS = new Set(['contracts_in_play', 'open_questions']);

export function parsePositionalRepoStatus(text) {
  const fm = { type: 'status' };
  const line = text.trim();
  if (!line) return { fm: null, body: '' };

  // Split on `|` but respect escaped `\|`.
  const parts = splitEscaped(line, '|');
  if (parts.length < 3) return { fm: null, body: text };

  POSITIONAL_REPO_FIELDS.forEach((field, idx) => {
    const value = parts[idx] ?? '';
    if (!value && !POSITIONAL_TILDE_LISTS.has(field) && !POSITIONAL_JSON_FIELDS.has(field)) {
      return; // omit empty scalars
    }
    if (POSITIONAL_JSON_FIELDS.has(field)) {
      fm[field] = parseInlineJsonOrEmpty(value);
    } else if (POSITIONAL_TILDE_LISTS.has(field)) {
      fm[field] = value ? value.split('~').map(s => s.trim()).filter(Boolean) : [];
    } else {
      fm[field] = value;
    }
  });

  return { fm, body: '' };
}

function splitEscaped(input, delimiter) {
  const parts = [];
  let current = '';
  for (let i = 0; i < input.length; i += 1) {
    if (input[i] === '\\' && input[i + 1] === delimiter) {
      current += delimiter;
      i += 1;
      continue;
    }
    if (input[i] === delimiter) {
      parts.push(current);
      current = '';
      continue;
    }
    current += input[i];
  }
  parts.push(current);
  return parts;
}

function parseInlineJsonOrEmpty(value) {
  if (!value || !value.trim()) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

// Parse a per-event DSL log file. The whole file is a single event line
// (ignoring blank lines). Returns `{fm, body}` shaped like the YAML parser, or
// `{fm: null, body: text}` if the line is unparseable.
export function parseDslLogEntry(text) {
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim()) return parseDslLogLine(rawLine);
  }
  return { fm: null, body: '' };
}
