// Agent-facing per-feature index. Rendered as plain markdown to
// `_index.md` so an agent running /catch-up can read a single file
// instead of opening N raw notes. Entries marked superseded are
// segregated so the default read skips them.

import { extractSummary, extractSection, extractBullets } from './markdown.mjs';
import { rowFor } from './feature.mjs';

const CLOSED_TICKET_STATUSES = new Set(['done', 'cancelled']);
const SUPERSEDED = 'superseded';
const SKIPPED = 'skipped';
const RECENT_LOG_LIMIT = 15;
const RECENT_DIGEST_LIMIT = 5;
const RECENT_DECISION_LIMIT = 5;

export function renderIndex(feature) {
  const generatedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const lines = [];

  lines.push(`# ${feature.slug} — agent index`);
  lines.push('');
  lines.push(`Generated ${generatedAt}. **Auto-regenerated on every feature write — do not edit by hand.**`);
  lines.push('');
  lines.push('This is the entry point for /catch-up. Entries marked **superseded** are skipped by default; full audit reads them.');
  lines.push('');

  appendMissionSection(lines, feature);
  appendLatestCheckpointSection(lines, feature);
  appendDecisionsSections(lines, feature);
  appendContractsSections(lines, feature);
  appendTicketsSections(lines, feature);
  appendRecentLogSection(lines, feature);
  appendRecentDigestsSection(lines, feature);
  appendRepoStatusesSection(lines, feature);

  return lines.join('\n');
}

function appendMissionSection(lines, feature) {
  lines.push('## Mission');
  if (feature.mission?.fm) {
    const summary = extractSummary({ fm: feature.mission.fm, body: feature.mission.body });
    lines.push(`- Status: \`${feature.mission.fm.status || 'unknown'}\``);
    if (summary) lines.push(`- ${summary}`);
  } else {
    lines.push('- (no MISSION.md)');
  }
  lines.push('');
}

function appendLatestCheckpointSection(lines, feature) {
  lines.push('## Latest checkpoint — read this first');
  if (feature.orchestrator) {
    const { fm, body, filename } = feature.orchestrator;
    const summary = extractSummary({ fm, body });
    const status = fm.status || '?';
    const at = fm.at || '?';
    lines.push(`- \`orchestrator/${filename}\` · ${at} · ${status}`);
    if (summary) lines.push(`  - ${summary}`);

    // Inline the most actionable snapshot sections so /catch-up doesn't need
    // to open the snapshot file on the fast path. Keep tight — full snapshot
    // is always one file-open away if needed. Order matches the canonical
    // snapshot template (Headline → Where each repo stands → Open for the
    // human → Next up).
    const headline = (extractSection(body, 'Headline') || '').trim();
    if (headline) {
      lines.push('');
      lines.push('  **Headline (from latest snapshot):**');
      for (const line of headline.split('\n').map(l => l.trim()).filter(Boolean)) {
        lines.push(`  > ${line}`);
      }
    }

    const whereStands = extractSection(body, 'Where each repo stands');
    if (whereStands) {
      const bullets = extractBullets(whereStands);
      if (bullets.length) {
        lines.push('');
        lines.push('  **Where each repo stands (from latest snapshot):**');
        for (const bullet of bullets) {
          // Truncate each repo bullet to its first sentence to bound _index growth.
          const firstSentence = bullet.split(/(?<=[.!?])\s+/)[0] || bullet;
          lines.push(`  - ${firstSentence.trim()}`);
        }
      }
    }

    const openForHuman = extractSection(body, 'Open for the human');
    if (openForHuman) {
      const bullets = extractBullets(openForHuman)
        .filter(b => !b.toLowerCase().startsWith('nothing'));
      if (bullets.length) {
        lines.push('');
        lines.push('  **Open for the human (from latest snapshot):**');
        for (const bullet of bullets) {
          lines.push(`  - ${bullet}`);
        }
      }
    }

    const nextUp = extractSection(body, 'Next up');
    if (nextUp) {
      const bullets = extractBullets(nextUp);
      if (bullets.length) {
        lines.push('');
        lines.push('  **Next up (from latest snapshot):**');
        for (const bullet of bullets) {
          lines.push(`  - ${bullet}`);
        }
      }
    }
  } else if (feature.digest) {
    lines.push(`- (no orchestrator snapshot yet — fall back to digest \`digest/${feature.digest.filename}\`)`);
  } else {
    lines.push('- (no checkpoint at all — bootstrap the feature)');
  }
  lines.push('');
}

function appendDecisionsSections(lines, feature) {
  const decisions = feature.browse?.decisions || [];
  const active = decisions.filter(d => d.fm.status !== SUPERSEDED);
  const superseded = decisions.filter(d => d.fm.status === SUPERSEDED);

  if (active.length) {
    const shown = active.slice(0, RECENT_DECISION_LIMIT);
    const hidden = active.length - shown.length;
    const heading = hidden > 0
      ? `## Recent active decisions (last ${shown.length}, newest first)`
      : '## Active decisions';
    lines.push(heading);
    for (const decision of shown) {
      const summary = extractSummary(decision);
      const title = decision.fm.title || rowFor('decisions', decision).primary;
      lines.push(`- \`decisions/${decision.filename}\` · ${decision.fm.at || decision.ts || '?'} · ${title}`);
      if (summary && summary !== title) lines.push(`  - ${summary}`);
    }
    if (hidden > 0) {
      lines.push(`- _… ${hidden} older active decision${hidden === 1 ? '' : 's'} not shown; see \`decisions/\` for full list._`);
    }
    lines.push('');
  }

  if (superseded.length) {
    lines.push('## Superseded decisions (skip in default reads)');
    for (const decision of superseded) {
      const title = decision.fm.title || rowFor('decisions', decision).primary;
      lines.push(`- \`decisions/${decision.filename}\` · ${title} — superseded by \`${decision.fm.superseded_by || '?'}\``);
    }
    lines.push('');
  }
}

function appendContractsSections(lines, feature) {
  const subfolderTree = feature.browse?.contracts || {};
  const apis = Object.keys(subfolderTree).sort();

  const active = [];
  const superseded = [];
  const skipped = [];

  for (const api of apis) {
    for (const contract of subfolderTree[api]) {
      const enriched = { api, ...contract };
      if (contract.fm.status === SKIPPED) skipped.push(enriched);
      else if (contract.fm.status === SUPERSEDED) superseded.push(enriched);
      else active.push(enriched);
    }
  }

  if (active.length) {
    lines.push('## Active contracts');
    for (const contract of active) {
      const summary = extractSummary(contract);
      const breakingSuffix = String(contract.fm.breaking) === 'true' ? ' · BREAKING' : '';
      lines.push(`- \`contracts/${contract.api}/${contract.filename}\` · ${contract.api} v${contract.fm.version || '?'} · ${contract.fm.author || '?'}${breakingSuffix}`);
      if (summary) lines.push(`  - ${summary}`);
    }
    lines.push('');
  }

  if (superseded.length) {
    lines.push('## Superseded contract versions (skip in default reads)');
    for (const contract of superseded) {
      lines.push(`- \`contracts/${contract.api}/${contract.filename}\` · ${contract.api} v${contract.fm.version || '?'} — superseded by \`${contract.fm.superseded_by || '?'}\``);
    }
    lines.push('');
  }

  if (skipped.length) {
    lines.push('## Skipped contract versions (discussed, not published)');
    for (const contract of skipped) {
      const reason = contract.fm.reason ? ` — ${contract.fm.reason}` : '';
      const declinedBy = contract.fm.declined_by ? ` · declined by \`${contract.fm.declined_by}\`` : '';
      lines.push(`- \`contracts/${contract.api}/${contract.filename}\` · ${contract.api} v${contract.fm.version || '?'}${reason}${declinedBy}`);
    }
    lines.push('');
  }
}

function appendTicketsSections(lines, feature) {
  const tickets = feature.browse?.tickets || [];
  if (!tickets.length) return;

  const open = tickets.filter(t => !CLOSED_TICKET_STATUSES.has(String(t.fm.status)));
  const closed = tickets.filter(t => CLOSED_TICKET_STATUSES.has(String(t.fm.status)));

  if (open.length) {
    lines.push('## Open tickets');
    for (const ticket of open) {
      const assignee = Array.isArray(ticket.fm.assignee) ? ticket.fm.assignee.join(', ') : (ticket.fm.assignee || '?');
      const summary = extractSummary(ticket);
      const lastUpdated = ticket.fm.last_updated || ticket.fm.at || '?';
      lines.push(`- \`tickets/${ticket.filename}\` · ${ticket.fm.status || 'open'} · ${assignee} · last updated ${lastUpdated}`);
      if (summary) lines.push(`  - ${summary}`);
    }
    lines.push('');
  }

  if (closed.length) {
    lines.push('## Closed tickets (skip in default reads)');
    for (const ticket of closed) {
      const title = ticket.fm.title || ticket.fm.slug || ticket.filename;
      lines.push(`- \`tickets/${ticket.filename}\` · ${ticket.fm.status} · ${title}`);
    }
    lines.push('');
  }
}

function appendRecentLogSection(lines, feature) {
  const logs = (feature.browse?.log || []).slice(0, RECENT_LOG_LIMIT);
  if (!logs.length) return;

  lines.push(`## Recent log (last ${logs.length}, newest first)`);
  for (const entry of logs) {
    const summary = extractSummary(entry);
    const recipients = Array.isArray(entry.fm.to) ? entry.fm.to.join(',') : (entry.fm.to || '?');
    const sender = entry.fm.from || '?';
    const at = entry.fm.at || entry.ts || '?';
    lines.push(`- \`log/${entry.filename}\` · ${at} · ${entry.fm.kind || 'log'} · ${sender} → ${recipients}`);
    if (summary) lines.push(`  - ${summary}`);
  }
  lines.push('');
}

function appendRecentDigestsSection(lines, feature) {
  const digests = (feature.browse?.digest || []).slice(0, RECENT_DIGEST_LIMIT);
  if (!digests.length) return;

  lines.push(`## Recent digests (last ${digests.length}, newest first)`);
  for (const digest of digests) {
    const summary = extractSummary(digest);
    const at = digest.fm.at || digest.ts || '?';
    lines.push(`- \`digest/${digest.filename}\` · ${at} · ${digest.fm.author || '?'}`);
    if (summary) lines.push(`  - ${summary}`);
  }
  lines.push('');
}

function appendRepoStatusesSection(lines, feature) {
  const repos = feature.browse?.repos || {};
  const repoKeys = Object.keys(repos).sort();
  if (!repoKeys.length) return;

  lines.push('## Repo statuses (latest per repo)');
  for (const repo of repoKeys) {
    const latest = repos[repo][0]; // newest first from loadFolder
    if (!latest) continue;
    const summary = extractSummary(latest);
    const at = latest.fm.at || latest.ts || '?';
    lines.push(`- **${repo}**: \`repos/${repo}/${latest.filename}\` · ${at}`);
    if (summary) lines.push(`  - ${summary}`);
  }
  lines.push('');
}
