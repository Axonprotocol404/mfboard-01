// The pages, each a function from API data to HTML.

import { closed, date, esc, media, money, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} entry fee` : '');

const timeCls = (b) => {
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms <= 0) return '';
  if (ms < 6 * 3600000) return 'class="soon"';
  return '';
};

/** The board: the live bounties, richest pot first, with a client-side filter. */
export function board(data, query = '', isClosed = false) {
  const q = query.trim().toLowerCase();
  const items = (data.items ?? [])
    .filter((b) => !q || `${b.title} ${b.slug} ${b.summary ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount));
  const rows = items
    .map(
      (b) => `
      <li>
        <div class="row1">
          <a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
          <span class="pot">${pot(b)}</span>
        </div>
        <div class="row2">
          <span ${timeCls(b)}>${timeLeft(b.deadline)}</span>
          <span>${b.submissionCount} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
          ${b.entryFeeUsd ? `<span class="fee">${fee(b)}</span>` : ''}
          <span><a href="#/leaderboard/${encodeURIComponent(b.slug)}">leaderboard</a></span>
        </div>
      </li>`,
    )
    .join('');
  const total = items.reduce((s, b) => s + Number(b.potUsd ?? b.rewardAmount), 0);
  return `
    <h1>${isClosed ? 'Closed bounties' : 'Live bounties'}</h1>
    <p class="counts">${items.length} bounties · ${money(total)} in pots${q ? ` · filtered by “${esc(q)}”` : ''}</p>
    <ul class="board">${rows || '<li class="muted">Nothing matches.</li>'}</ul>`;
}

/** A bounty's page: summary, rules, the rewards table and its dates. */
export function bounty(b) {
  const prizes = Array.isArray(b.rewards)
    ? b.rewards
        .map(
          (r) =>
            `<tr><td>${esc(r.place ?? r.rank ?? '')}</td><td>${money(r.amount ?? r.usd ?? 0)}</td></tr>`,
        )
        .join('')
    : '';
  return `
    <p class="breadcrumb"><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="muted">${esc(b.summary ?? '')}</p>
    <dl>
      <dt>Pot</dt><dd><strong>${pot(b)}</strong></dd>
      ${b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : ''}
      <dt>Status</dt><dd>${closed(b) ? 'Closed (deadline passed)' : 'Open'}</dd>
      <dt>Deadline</dt><dd ${timeCls(b)}>${date(b.deadline)} · ${timeLeft(b.deadline)}</dd>
      <dt>Entries</dt><dd>${b.submissionCount}</dd>
      <dt>Sponsor</dt><dd>${esc(b.sponsor?.name ?? 'make.fun')}</dd>
      <dt>Leaderboard</dt><dd><a href="#/leaderboard/${encodeURIComponent(b.slug)}">see standings</a></dd>
    </dl>
    ${prizes ? `<h2>Prizes</h2><table><tr><th>Place</th><th>Amount</th></tr>${prizes}</table>` : ''}
    <h2>Description</h2>
    <div class="description">${esc(b.description)}</div>
    ${b.rules ? `<h2>Rules</h2><div class="description">${esc(b.rules)}</div>` : ''}`;
}

/** A bounty's leaderboard: every ranked entry with its handle, title and the
 * API's own per-column values (e.display), the winner marked. */
export function leaderboard(data, slug) {
  const cols = (data.columns ?? []).map(
    (c) => `<th title="${esc(c.key)}">${esc(c.title ?? c.key ?? '')}</th>`,
  ).join('');
  const rows = (data.entries ?? [])
    .map((e) => {
      const entryCell = `<td><a href="#/profile/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>${
        e.title ? `<br><span class="muted small">${esc(String(e.title).slice(0, 90))}</span>` : ''
      }</td>`;
      const cells = (data.columns ?? [])
        .map((c) => `<td>${esc(e.display?.[c.key] ?? '')}</td>`)
        .join('');
      const cls = e.prize_rank === 1 ? ' class="rank1"' : '';
      return `<tr${cls}><td>#${esc(e.rank ?? '')}</td>${entryCell}${cells}</tr>`;
    })
    .join('');
  return `
    <p class="breadcrumb"><a href="#/bounty/${encodeURIComponent(slug)}">← Bounty</a></p>
    <h1>${esc(data.title ?? 'Leaderboard')}</h1>
    <p class="counts">${(data.entries ?? []).length} ranked entries</p>
    <table><tr><th>#</th><th>Entry</th>${cols}</tr>${rows || '<tr><td>No entries yet.</td></tr>'}</table>`;
}

/** A person's public profile: identity, record and their wallet. */
export function profile(p) {
  const rec = p.record ?? {};
  const label = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const value = (k, v) =>
    k === 'prize_usd' ? money(v) : k === 'best_placement' ? `#${v}` : String(v ?? '—');
  const keys = [
    'competitions_entered',
    'competitions_placed',
    'competitions_won',
    'podium_finishes',
    'other_placements',
    'best_placement',
    'prize_usd',
  ].filter((k) => k in rec);
  const chips = keys
    .map((k) => `<span class="chip">${esc(label(k))}: <strong>${esc(value(k, rec[k]))}</strong></span>`)
    .join('');
  const avatar = p.avatar ?? p.image;
  return `
    <p class="breadcrumb"><a href="#/">← All bounties</a></p>
    <div class="profile-head">
      ${avatar ? `<img src="${esc(media(avatar))}" crossorigin="anonymous" alt="">` : ''}
      <div>
        <h1 style="margin:0">${esc(p.display_name ?? p.handle)}</h1>
        <p class="muted" style="margin:2px 0 0">@${esc(p.handle)} · joined ${date(p.joined_at)}</p>
      </div>
    </div>
    ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
    <h2>Record</h2>
    <div class="chips">${chips || '<span class="chip">no placements yet</span>'}</div>
    ${
      p.wallet?.address
        ? `<p class="muted">Wallet: <a href="${esc(p.wallet.explorer_url ?? '#')}" rel="noopener"><code>${esc(
            p.wallet.address,
          )}</code></a></p>`
        : ''
    }`;
}
