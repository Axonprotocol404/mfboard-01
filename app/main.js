// make.fun board router: maps the location hash to views (board, bounty page,
// leaderboard, profile) and renders each into #app after fetching its data.
//   #/                          the board of live bounties
//   #/bounties/closed           the board of closed bounties
//   #/bounty/<slug>             one bounty
//   #/leaderboard/<slug>        that bounty's leaderboard
//   #/profile/<handle>          a person's public profile
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { closed } from './format.js';
import { board, bounty, leaderboard, profile } from './views.js';

const app = document.getElementById('app');
const q = document.getElementById('q');

/** Only bounties whose deadline is still ahead (an open status can outlive a deadline). */
const liveOnly = (data) => ({ ...data, items: (data.items ?? []).filter((b) => !closed(b)) });
/** Only bounties whose deadline has passed. */
const closedOnly = (data) => ({ ...data, items: (data.items ?? []).filter(closed) });

/** True while a render is in flight, so back-to-back hashchange events collapse. */
let rendering = false;

/** A friendly error page: the message is escaped before it is shown. */
const errorPage = (err) =>
  `<p class="error">Could not load this page. ${esc(err.message ?? String(err))}</p>
   <p class="muted">Check your connection and reload, or <a href="#/">go back to the board</a>.</p>`;

async function render() {
  if (rendering) return;
  rendering = true;
  window.__shotReady = false;
  try {
    // Route from the hash: '#/bounty/my-slug' -> ['bounty', 'my-slug'].
    const hash = location.hash || '#/';
    const [head, ...rest] = hash.replace(/^#\/?/, '').split('/');
    const arg = decodeURIComponent(rest.join('/') ?? '');
    switch (head) {
      case 'bounty': {
        if (!arg) throw new Error('no bounty given');
        const b = await getBounty(arg);
        document.title = `${b.title} | make.fun board`;
        app.innerHTML = bounty(b);
        break;
      }
      case 'leaderboard': {
        if (!arg) throw new Error('no bounty given');
        const data = await getLeaderboard(arg);
        document.title = `Standings | ${arg} | make.fun board`;
        app.innerHTML = leaderboard(data, arg);
        break;
      }
      case 'profile': {
        if (!arg) throw new Error('no handle given');
        const p = await getProfile(arg);
        document.title = `@${p.handle} | make.fun board`;
        app.innerHTML = profile(p);
        break;
      }
      case 'bounties':
        document.title = 'Closed bounties | make.fun board';
        app.innerHTML = board(closedOnly(await getBounties('open')), q.value, true);
        break;
      default:
        // The board reads a fresh copy so the pots and the time left are live.
        document.title = 'make.fun board';
        app.innerHTML = board(liveOnly(await getBounties('open')), q.value);
    }
  } catch (err) {
    document.title = 'Error | make.fun board';
    app.innerHTML = errorPage(err);
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
