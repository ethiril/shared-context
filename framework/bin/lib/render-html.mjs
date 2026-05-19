// HTML rendering — root dashboard, per-feature standalone pages, and the
// fragment used for lazy-loading feature bodies. The renderer is plain
// string templating: no virtual DOM, no escaping framework, just `escapeHtml`
// at every untrusted-data boundary.

import { escapeHtml, inlineMd, blockMd, extractSection, extractSummary } from './markdown.mjs';
import { rowFor, statusOf, isStale, staleReason, relativeTime, attentionItems } from './feature.mjs';

const FIRST_RAISED_PATTERN = /(—\s*first raised\s+\d{4}-\d{2}-\d{2})/gi;
const STALE_PREFIX_PATTERN = /^STALE:\s*/i;

// "— first raised <date>" inside a bullet → wrap in a muted span. Operates
// on already-rendered HTML for the dashboard's attention list, where the
// bullet has gone through inlineMd (so HTML is already escaped).
function decorateFirstRaisedSuffix(html) {
  return html.replace(FIRST_RAISED_PATTERN, '<span class="first-raised">$1</span>');
}

// Same suffix decoration, plus turning a "STALE:" `<li>` prefix into a
// dedicated badge + class. Applied to the per-feature "Open for the human"
// block after blockMd has wrapped each bullet in <li>.
function decorateOpenForHumanList(html) {
  return html
    .replace(/<li>\s*STALE:\s*/gi, '<li class="stale"><span class="stale-badge">STALE</span> ')
    .replace(FIRST_RAISED_PATTERN, '<span class="first-raised">$1</span>');
}

function renderAttentionItem({ slug, text }) {
  const isStaleItem = /^STALE:/i.test(text);
  const cleanText = isStaleItem ? text.replace(STALE_PREFIX_PATTERN, '') : text;
  const liClass = isStaleItem ? ' class="stale"' : '';
  const staleBadge = isStaleItem ? '<span class="stale-badge">STALE</span> ' : '';
  const decoratedText = decorateFirstRaisedSuffix(inlineMd(cleanText));
  return `      <li${liClass}><a class="chip" href="#feature-${escapeHtml(slug)}">${escapeHtml(slug)}</a> ${staleBadge}<span>${decoratedText}</span></li>`;
}

export function renderAttention(items) {
  if (!items.length) {
    return `<section id="attention" class="empty">
  <h2>Needs your attention</h2>
  <p class="muted">Nothing pinned. All features report "heads-down."</p>
</section>`;
  }

  // STALE items first — the dashboard mirrors urgency.
  const sortedItems = items.slice().sort((a, b) => {
    const aRank = /^STALE:/i.test(a.text) ? 0 : 1;
    const bRank = /^STALE:/i.test(b.text) ? 0 : 1;
    return aRank - bRank;
  });

  const listHtml = sortedItems.map(renderAttentionItem).join('\n');
  return `<section id="attention">
  <h2>Needs your attention <span class="count">${items.length}</span></h2>
  <ul class="attention-list">
${listHtml}
  </ul>
</section>`;
}

function rowAnchorId(slug, folder, subfolder, filename) {
  const stem = filename.replace(/\.md$/, '').replace(/[^a-zA-Z0-9-]/g, '-');
  return `f-${slug}-${folder}${subfolder ? '-' + subfolder : ''}-${stem}`;
}

function renderTombstoneTag(item) {
  if (item.fm?.status === 'superseded') {
    const supersededBy = escapeHtml(item.fm.superseded_by || 'unknown');
    return `<span class="bf-tag superseded" title="Superseded by ${supersededBy}">superseded</span>`;
  }
  if (item.fm?.status === 'skipped') {
    const reason = escapeHtml(item.fm.reason || 'Discussed and not published');
    return `<span class="bf-tag skipped" title="${reason}">skipped</span>`;
  }
  return '';
}

function renderFrontmatterDump(fm) {
  return Object.entries(fm)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`)
    .join('\n');
}

function renderFileRow(slug, folder, item, subfolder = null) {
  const meta = rowFor(folder, item);
  const anchorId = rowAnchorId(slug, folder, subfolder, item.filename);
  const frontmatterDump = renderFrontmatterDump(item.fm);
  const tombstoneTag = renderTombstoneTag(item);
  const stateClass = item.fm?.status === 'superseded' ? ' superseded'
    : item.fm?.status === 'skipped' ? ' skipped'
    : '';
  const summary = extractSummary(item);

  return `<details class="browse-file${stateClass}" id="${anchorId}">
  <summary>
    <span class="bf-time">${escapeHtml(meta.time)}</span>
    <span class="bf-primary">${escapeHtml(meta.primary)}</span>
    ${tombstoneTag}
    ${meta.secondary ? `<span class="bf-secondary">${escapeHtml(meta.secondary)}</span>` : ''}
    <span class="bf-fname"><code>${escapeHtml(item.filename)}</code></span>
  </summary>
  <div class="bf-body">
    ${summary ? `<p class="bf-summary"><strong>Summary:</strong> ${inlineMd(summary)}</p>` : ''}
    ${frontmatterDump ? `<pre class="bf-fm">${escapeHtml(frontmatterDump)}</pre>` : ''}
    <div class="bf-content">${blockMd(item.body)}</div>
  </div>
</details>`;
}

function renderFolderGroup(slug, folder, items) {
  if (!items?.length) return '';
  const rows = items.map(item => renderFileRow(slug, folder, item)).join('\n');
  const entryCountLabel = `${items.length} entr${items.length === 1 ? 'y' : 'ies'}`;
  return `<details class="browse-folder" id="feature-${escapeHtml(slug)}-${folder}">
  <summary>
    <span class="bfo-name">${escapeHtml(folder)}/</span>
    <span class="bfo-count">${entryCountLabel}</span>
  </summary>
  <div class="browse-list">
${rows}
  </div>
</details>`;
}

function renderSubfolderedGroup(slug, folder, subfolderTree) {
  const subfolders = Object.keys(subfolderTree).sort();
  if (!subfolders.length) return '';

  const totalEntries = subfolders.reduce((total, sub) => total + subfolderTree[sub].length, 0);

  const subfolderBlocks = subfolders.map(sub => {
    const subItems = subfolderTree[sub];
    if (!subItems.length) return '';
    const rows = subItems.map(item => renderFileRow(slug, folder, item, sub)).join('\n');
    const entryCountLabel = `${subItems.length} entr${subItems.length === 1 ? 'y' : 'ies'}`;
    return `<details class="browse-subfolder">
  <summary>
    <span class="bfo-name">${escapeHtml(sub)}/</span>
    <span class="bfo-count">${entryCountLabel}</span>
  </summary>
  <div class="browse-list">
${rows}
  </div>
</details>`;
  }).join('\n');

  const groupCountLabel = `${subfolders.length} ${subfolders.length === 1 ? 'group' : 'groups'} · ${totalEntries} entr${totalEntries === 1 ? 'y' : 'ies'}`;
  return `<details class="browse-folder" id="feature-${escapeHtml(slug)}-${folder}">
  <summary>
    <span class="bfo-name">${escapeHtml(folder)}/</span>
    <span class="bfo-count">${groupCountLabel}</span>
  </summary>
  <div class="browse-sublist">
${subfolderBlocks}
  </div>
</details>`;
}

// Browse-section folder groups, joined as a single string. Caller decides
// whether to inline this or write it to a separate fragment file.
function renderBrowseGroups(feature) {
  const browse = feature.browse;
  if (!browse) return '';
  const sections = [
    renderFolderGroup(feature.slug, 'orchestrator', browse.orchestrator),
    renderFolderGroup(feature.slug, 'tickets', browse.tickets),
    renderFolderGroup(feature.slug, 'digest', browse.digest),
    renderFolderGroup(feature.slug, 'log', browse.log),
    renderFolderGroup(feature.slug, 'decisions', browse.decisions),
    renderSubfolderedGroup(feature.slug, 'contracts', browse.contracts),
    renderSubfolderedGroup(feature.slug, 'repos', browse.repos),
    renderFolderGroup(feature.slug, 'overview', browse.overview),
    renderSubfolderedGroup(feature.slug, 'cursors', browse.cursors),
  ].filter(Boolean);
  return sections.join('\n');
}

// Innards of the browse fragment file. Just the folder groups — the
// wrapping <details> + summary live in renderBrowseStub.
export function renderBrowseFragment(feature) {
  return renderBrowseGroups(feature);
}

// Inline stub written into the feature body. Lazily fetches its body from
// `browse-fragment.html` on first expand (same handler as the feature-stub
// fragment loader).
//
// `basePath` is the URL prefix to reach `features/<slug>/browse-fragment.html`
// from the *document* the stub will eventually live in. Empty for the
// standalone page (its document URL is already inside `features/<slug>/`);
// `features/<slug>/` for the body fragment that gets injected into the root
// dashboard (whose document URL is the repo root). Empty features get an
// empty string instead so a feature with no artefacts doesn't show a
// misleading "Browse history" toggle.
function renderBrowseStub(feature, basePath) {
  if (!renderBrowseGroups(feature)) return '';
  const slug = escapeHtml(feature.slug);
  const fragmentUrl = `${basePath}browse-fragment.html`;
  return `<details class="browse-section" id="feature-${slug}-browse" data-fragment-url="${fragmentUrl}">
  <summary><h3>Browse history</h3></summary>
  <div class="browse-body" data-fragment-target>
    <div class="fragment-placeholder"><span class="spinner"></span>Loading browse history…</div>
  </div>
</details>`;
}

// Inner body of a feature card — everything inside `<div class="card-body">`.
// Written inline into the standalone page AND as `dashboard-fragment.html`
// for lazy fetch from the root dashboard, so two callers share this output.
//
// `basePath` is the URL prefix that, prepended to `browse-fragment.html`,
// resolves correctly from whichever document this body will end up in. The
// standalone page sits inside `features/<slug>/` so `basePath` defaults to
// empty; the body fragment served to the root dashboard needs `features/<slug>/`
// because the document it gets injected into is the repo root.
export function renderFeatureBody(feature, { archived = false, staleDays, basePath = '' } = {}) {
  const orchestratorBody = feature.orchestrator?.body || '';
  const sections = {
    headline: extractSection(orchestratorBody, 'Headline').trim(),
    repoStands: extractSection(orchestratorBody, 'Where each repo stands'),
    shipped: extractSection(orchestratorBody, 'What shipped since the last snapshot'),
    decisions: extractSection(orchestratorBody, 'Decisions made'),
    openForHuman: extractSection(orchestratorBody, 'Open for the human'),
    nextUp: extractSection(orchestratorBody, 'Next up'),
  };

  const missionBody = feature.mission?.body || '';
  const goal = extractSection(missionBody, 'Goal').trim();
  const reposInvolved = extractSection(missionBody, 'Repos involved');

  const snapshotMeta = feature.orchestrator
    ? `Snapshot: <code>${escapeHtml(feature.orchestrator.filename)}</code>`
    : `<span class="muted warning">No orchestrator snapshot yet — showing static mission only.</span>`;

  const archivedBanner = archived
    ? `<div class="archived-banner"><span class="muted">Archived:</span> ${escapeHtml(staleReason(feature, staleDays))}.</div>`
    : '';

  const goalBlock = goal
    ? `<details class="sub"><summary>Goal &amp; scope</summary><div>${blockMd(goal)}${reposInvolved ? `<h4>Repos involved</h4>${blockMd(reposInvolved)}` : ''}</div></details>`
    : '';

  const slug = escapeHtml(feature.slug);

  return `${archivedBanner}
    ${sections.headline ? `<p class="headline">${inlineMd(sections.headline)}</p>` : ''}
    <div class="snapshot-meta">${snapshotMeta}</div>

    ${goalBlock}

    ${sections.repoStands ? `<h3>Where each repo stands</h3>${blockMd(sections.repoStands)}` : ''}
    ${sections.openForHuman ? `<h3>Open for the human</h3>${decorateOpenForHumanList(blockMd(sections.openForHuman))}` : ''}
    ${sections.nextUp ? `<h3>Next up</h3>${blockMd(sections.nextUp)}` : ''}
    ${sections.shipped ? `<details class="sub"><summary>What shipped since the last snapshot</summary><div>${blockMd(sections.shipped)}</div></details>` : ''}
    ${sections.decisions ? `<details class="sub"><summary>Decisions made</summary><div>${blockMd(sections.decisions)}</div></details>` : ''}

    ${renderBrowseStub(feature, basePath)}

    <footer class="dig-deeper">
      <span class="muted">Jump to:</span>
      <a href="#feature-${slug}-orchestrator">orchestrator (${feature.counts.orchestrator})</a>
      <a href="#feature-${slug}-digest">digest (${feature.counts.digest})</a>
      <a href="#feature-${slug}-log">log (${feature.counts.log})</a>
      <a href="#feature-${slug}-decisions">decisions (${feature.counts.decisions})</a>
      <a href="#feature-${slug}-contracts">contracts (${feature.counts.contracts})</a>
      <a href="#feature-${slug}-repos">repos</a>
    </footer>`;
}

// Stub card for the root dashboard — only the <summary> bar; body content is
// fetched lazily on first expand from `features/<slug>/dashboard-fragment.html`.
function renderFeatureStub(feature, { archived, openByDefault }) {
  const status = statusOf(feature);
  const slug = escapeHtml(feature.slug);
  const cardClass = archived ? 'feature archived' : 'feature';
  const detailsOpen = openByDefault ? 'open' : '';
  const lastUpdated = feature.lastActivity
    ? `${escapeHtml(feature.lastActivity)} <span class="muted">(${escapeHtml(relativeTime(feature.lastActivity))})</span>`
    : '<span class="muted">no activity</span>';
  const fragmentUrl = `features/${encodeURIComponent(feature.slug)}/dashboard-fragment.html`;
  const standaloneUrl = `features/${encodeURIComponent(feature.slug)}/dashboard.html`;

  return `<details class="${cardClass}" id="feature-${slug}" data-slug="${slug}" data-fragment-url="${fragmentUrl}" ${detailsOpen}>
  <summary>
    <span class="slug">${slug}</span>
    <span class="badge status-${escapeHtml(status)}">${escapeHtml(status)}</span>
    ${archived ? '<span class="badge archived-badge">archived</span>' : ''}
    <span class="last-updated">last activity: ${lastUpdated}</span>
    <a class="standalone-link" href="${standaloneUrl}" title="Open standalone page">↗</a>
  </summary>
  <div class="card-body" data-fragment-target>
    <div class="fragment-placeholder"><span class="spinner"></span>Loading <code>${escapeHtml(feature.slug)}</code>…</div>
  </div>
</details>`;
}

// Inline JS for deep-link hash routing. Used by both root and per-feature
// standalone pages — only the loader hooks (tabs, lazy load) differ.
function deepLinkScript({ withTabs = false, withLazyLoad = false } = {}) {
  return `
    ${withTabs ? `
    function activateTab(name) {
      document.querySelectorAll('.tab').forEach(b => {
        const on = b.dataset.tab === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('hidden', p.dataset.panel !== name);
      });
    }
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => activateTab(t.dataset.tab));
    });` : ''}

    ${withLazyLoad ? `
    // Lazy-load any <details data-fragment-url="…"> on first expand. Works
    // for two levels today: the feature card (root dashboard only) and the
    // browse history (both dashboards). Re-binds after each load so nested
    // fragments — e.g. a browse stub revealed by loading a feature body —
    // also pick up the handler.
    async function loadFragment(details) {
      const target = details.querySelector('[data-fragment-target]');
      if (!target || target.dataset.loaded === 'ok' || target.dataset.loaded === 'loading') return;
      const url = details.dataset.fragmentUrl;
      if (!url) return;
      target.dataset.loaded = 'loading';
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        target.innerHTML = await res.text();
        target.dataset.loaded = 'ok';
        attachFragmentHandlers(target);
      } catch (e) {
        const slug = details.closest('details[data-slug]')?.dataset.slug;
        const standalone = slug ? 'features/' + encodeURIComponent(slug) + '/dashboard.html' : null;
        const standaloneLink = standalone ? ' or open the <a href="' + standalone + '">standalone page</a>' : '';
        target.innerHTML = '<div class="fragment-placeholder error">Couldn\\'t fetch <code>' + url + '</code> (' + e.message + '). If you opened this via <code>file://</code>, the browser may be blocking it — try serving the directory (<code>python3 -m http.server</code>)' + standaloneLink + '.</div>';
        target.dataset.loaded = 'error';
      }
    }

    function attachFragmentHandlers(root) {
      root.querySelectorAll('details[data-fragment-url]').forEach(d => {
        if (d.__fragmentBound) return;
        d.__fragmentBound = true;
        d.addEventListener('toggle', () => { if (d.open) loadFragment(d); });
        if (d.open) loadFragment(d);
      });
    }

    // Map a hash like "#feature-<slug>-..." to the feature stub that hosts it.
    function findFeatureStubForHash(hash) {
      const id = hash.replace(/^#/, '');
      for (const stub of document.querySelectorAll('details.feature[data-slug]')) {
        const slug = stub.dataset.slug;
        if (id === 'feature-' + slug || id.startsWith('feature-' + slug + '-')) return stub;
      }
      return null;
    }

    attachFragmentHandlers(document);` : ''}

    async function openTo(hash) {
      if (!hash) return;
      const safeQuery = h => { try { return document.querySelector(h); } catch (_) { return null; } };
      let el = safeQuery(hash);
      ${withLazyLoad ? `
      // Lazy chain: open the feature stub (loads its body fragment) →
      // if the target is still missing, open the browse stub inside that
      // feature (loads the browse fragment) → retry.
      if (!el) {
        const stub = findFeatureStubForHash(hash);
        if (stub) {
          const panel = stub.closest('.tab-panel');
          if (panel && panel.classList.contains('hidden')) activateTab(panel.dataset.panel);
          stub.open = true;
          if (stub.dataset.fragmentUrl) await loadFragment(stub);
          el = safeQuery(hash);
          if (!el) {
            const browseStub = stub.querySelector('details.browse-section[data-fragment-url]');
            if (browseStub) {
              browseStub.open = true;
              await loadFragment(browseStub);
              el = safeQuery(hash);
            }
          }
        }
      }` : ''}
      if (!el) return;
      ${withTabs ? `
      const panel = el.closest('.tab-panel');
      if (panel && panel.classList.contains('hidden')) activateTab(panel.dataset.panel);` : ''}
      let cur = el;
      while (cur && cur !== document.body) {
        if (cur.tagName === 'DETAILS') cur.open = true;
        cur = cur.parentElement;
      }
      if (el.tagName === 'DETAILS') el.open = true;
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    openTo(location.hash);
    window.addEventListener('hashchange', () => openTo(location.hash));`;
}

export function renderRootDashboard(features, { staleDays, cssHref }) {
  const generatedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const attention = attentionItems(features, staleDays);

  const sorted = features.slice().sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''));
  const active = sorted.filter(feature => !isStale(feature, staleDays));
  const archived = sorted.filter(feature => isStale(feature, staleDays));

  // Only the first active card opens by default — keeps the at-a-glance
  // experience for the common N=1 case without N parallel fetches on load.
  const activeHtml = active.length
    ? active.map((feature, index) => renderFeatureStub(feature, { archived: false, openByDefault: index === 0 })).join('\n')
    : '<p class="muted">No active features. All are archived or none have started.</p>';
  const archivedHtml = archived.length
    ? archived.map(feature => renderFeatureStub(feature, { archived: true, openByDefault: false })).join('\n')
    : '<p class="muted">Nothing archived. All features are within the freshness threshold.</p>';

  const emptyState = !features.length
    ? '<p class="muted">No features found under <code>features/</code>.</p>'
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mission Control — shared-context</title>
  <link rel="stylesheet" href="${cssHref}">
</head>
<body>
  <header class="sticky">
    <h1>Mission Control</h1>
    <div class="meta">Generated at <time datetime="${generatedAt}">${generatedAt}</time></div>
  </header>
  <main>
    ${renderAttention(attention)}
    ${emptyState}
    <nav class="tabs" role="tablist">
      <button class="tab active" data-tab="active" role="tab" aria-selected="true">Active <span class="tab-count">${active.length}</span></button>
      <button class="tab" data-tab="archive" role="tab" aria-selected="false">Archive <span class="tab-count">${archived.length}</span></button>
      <span class="tab-note muted">Stale = no activity for ${staleDays}+ days, or status: done/paused.</span>
    </nav>
    <section class="tab-panel" data-panel="active">
      ${activeHtml}
    </section>
    <section class="tab-panel hidden" data-panel="archive">
      ${archivedHtml}
    </section>
  </main>
  <script>${deepLinkScript({ withTabs: true, withLazyLoad: true })}</script>
</body>
</html>
`;
}

export function renderFeatureStandalone(feature, { staleDays, cssHref }) {
  const generatedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const archived = isStale(feature, staleDays);
  const status = statusOf(feature);
  const slug = escapeHtml(feature.slug);
  const lastUpdated = feature.lastActivity
    ? `${escapeHtml(feature.lastActivity)} <span class="muted">(${escapeHtml(relativeTime(feature.lastActivity))})</span>`
    : '<span class="muted">no activity</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mission Control — ${slug}</title>
  <link rel="stylesheet" href="${cssHref}">
</head>
<body>
  <header class="sticky">
    <h1><a href="../../dashboard.html">← Mission Control</a> · ${slug}</h1>
    <div class="meta">Generated at <time datetime="${generatedAt}">${generatedAt}</time></div>
  </header>
  <main>
    <details class="feature standalone${archived ? ' archived' : ''}" id="feature-${slug}" data-slug="${slug}" open>
      <summary>
        <span class="slug">${slug}</span>
        <span class="badge status-${escapeHtml(status)}">${escapeHtml(status)}</span>
        ${archived ? '<span class="badge archived-badge">archived</span>' : ''}
        <span class="last-updated">last activity: ${lastUpdated}</span>
      </summary>
      <div class="card-body">
        ${renderFeatureBody(feature, { archived, staleDays })}
      </div>
    </details>
  </main>
  <script>${deepLinkScript({ withTabs: false, withLazyLoad: true })}</script>
</body>
</html>
`;
}
