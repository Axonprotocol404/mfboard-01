// A make.fun frontend: the board, a bounty's page, its leaderboard and a
// person's public profile, on hash routes.
//
//   #/                          the board of live bounties
//   #/bounty/<slug>             one bounty
//   #/leaderboard/<slug>        that bounty's leaderboard
//   #/profile/<handle>          a person's public profile
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, leaderboard, profile } from './views.js';

const app = document.getElementById('app');
const q = document.getElementById('q');

import { closed } from './format.js';

/** Only bounties whose deadline is still ahead (an open status can outlive a deadline). */
const liveOnly = (data) => ({ ...data, items: (data.items ?? []).filter((b) => !closed(b)) });
/** Only bounties whose deadline has passed. */
const closedOnly = (data) => ({ ...data, items: (data.items ?? []).filter(closed) });

/** True while a render is in flight, so back-to-back hashchange events collapse. */
let rendering = false;

async function render() {
  if (rendering) return;
  rendering = true;
  window.__shotReady = false;
  try {
    const hash = location.hash || '#/';
    let seg = hash.replace(/^#\/?/, '');
    const [head, ...rest] = seg.split('/');
    const arg = decodeURIComponent(rest.join('/') ?? '');
    if (head === 'bounty' && arg) {
      const b = await getBounty(arg);
      document.title = `${b.title} | make.fun board`;
      app.innerHTML = bounty(b);
    } else if (head === 'leaderboard' && arg) {
      const data = await getLeaderboard(arg);
      document.title = `Standings | ${arg} | make.fun board`;
      app.innerHTML = leaderboard(data, arg);
    } else if (head === 'profile' && arg) {
      const p = await getProfile(arg);
      document.title = `@${p.handle} | make.fun board`;
      app.innerHTML = profile(p);
    } else if (head === 'bounties' && arg === 'closed') {
      document.title = 'Closed bounties | make.fun board';
      app.innerHTML = board(closedOnly(await getBounties('open')), q.value, true);
    } else {
      // The board reads a fresh copy so the pots and the time left are live.
      const data = await getBounties('open');
      document.title = 'make.fun board';
      app.innerHTML = board(liveOnly(data), q.value);
    }
  } catch (err) {
    app.innerHTML = `<p class="error">${String(err.message ?? err)}</p>`;
  }
  window.scrollTo(0, 0);
  rendering = false;
  window.__shotReady = true;
}

// The filter re-runs the board on the data already in memory: no new request.
q.addEventListener('input', () => {
  if (!location.hash || location.hash === '#/') render();
});

window.addEventListener('hashchange', render);
render();
