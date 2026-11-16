// The pages, each a function from API data to HTML. Every page escapes API
// values with esc() and has an empty state when there is nothing to show.

import { closed, date, esc, media, money, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} entry fee` : '');

/** The color class for a deadline that is close (renders red within 6 hours). */
const timeCls = (b) => {
  const ms = new Date(b.deadline).getTime() - Date.now();
  return ms > 0 && ms < 6 * 3600000 ? ' class="soon"' : '';
};

/** An <a> to a hash route with its argument URL-encoded and its text escaped. */
const link = (route, arg, text, cls = '') =>
  `<a${cls ? ` class="${cls}"` : ''} href="#${route ? `/${route}/${encodeURIComponent(arg)}` : '/'}">${esc(text)}</a>`;

/** The board: the live bounties, richest pot first, with a client-side filter. */
export function board(data, query = '', isClosed = false) {
  const q = query.trim().toLowerCase();
  const items = (data.items ?? [])
    .filter((b) => !q || `${b.title} ${b.slug} ${b.summary ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount));
  const total = items.reduce((s, b) => s + Number(b.potUsd ?? b.rewardAmount), 0);
  // One list row per bounty: title, pot, time left, entry count, fee, leaderboard link.
  const rows = items
    .map(
      (b) => `
      <li>
        <div class="row1">
          ${link('bounty', b.slug, b.title)}
          <span class="pot">${pot(b)}</span>
        </div>
        <div class="row2">
          <span${timeCls(b)}>${timeLeft(b.deadline)}</span>
          <span>${b.submissionCount} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
          ${b.entryFeeUsd ? `<span class="fee">${fee(b)}</span>` : ''}
          <span>${link('leaderboard', b.slug, 'leaderboard')}</span>
        </div>
      </li>`,
    )
    .join('');
  return `
    <h1>${isClosed ? 'Closed bounties' : 'Live bounties'}</h1>
    <p class="counts">${items.length} bounties · ${money(total)} in pots${q ? ` · filtered by “${esc(q)}”` : ''}</p>
    <ul class="board">${rows || `<li class="muted">${q ? 'Nothing matches that filter.' : 'No bounties right now — check back soon.'}</li>`}</ul>`;
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
    <p class="breadcrumb">${link('', '', '← All bounties')}</p>
    <h1>${esc(b.title)}</h1>
    <p class="muted">${esc(b.summary ?? '')}</p>
    <dl>
      <dt>Pot</dt><dd><strong>${pot(b)}</strong></dd>
      ${b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : ''}
      <dt>Status</dt><dd>${closed(b) ? 'Closed (deadline passed)' : 'Open'}</dd>
      <dt>Deadline</dt><dd${timeCls(b)}>${date(b.deadline)} · ${timeLeft(b.deadline)}</dd>
      <dt>Entries</dt><dd>${b.submissionCount}</dd>
      <dt>Sponsor</dt><dd>${esc(b.sponsor?.name ?? 'make.fun')}</dd>
      <dt>Leaderboard</dt><dd>${link('leaderboard', b.slug, 'see standings')}</dd>
    </dl>
    ${prizes ? `<h2>Prizes</h2><table><tr><th>Place</th><th>Amount</th></tr>${prizes}</table>` : ''}
    <h2>Description</h2>
    <div class="description">${esc(b.description)}</div>
    ${b.rules ? `<h2>Rules</h2><div class="description">${esc(b.rules)}</div>` : ''}`;
}

/** A bounty's leaderboard: every ranked entry with its handle, title and the
 * API's own per-column values (e.display), the winner marked. */
export function leaderboard(data, slug) {
  const cols = (data.columns ?? [])
    .map((c) => `<th title="${esc(c.key)}">${esc(c.title ?? c.key ?? '')}</th>`)
    .join('');
  const rows = (data.entries ?? [])
    .map((e) => {
      const entryCell = `<td>${link('profile', e.handle, e.handle)}${
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
    <p class="breadcrumb">${link('bounty', slug, '← Bounty')}</p>
    <h1>${esc(data.title ?? 'Leaderboard')}</h1>
    <p class="counts">${(data.entries ?? []).length} ranked entries</p>
    <table><tr><th>#</th><th>Entry</th>${cols}</tr>${
      rows || '<tr><td class="muted">No entries yet — be the first.</td></tr>'
    }</table>`;
}

/** A person's public profile: identity, record and their wallet. */
export function profile(p) {
  const rec = p.record ?? {};
  // 'prize_usd' -> 'Prize Usd'; values get money/# formatting where they read better.
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
    <p class="breadcrumb">${link('', '', '← All bounties')}</p>
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
        : '<p class="muted">No public wallet.</p>'
    }`;
}
