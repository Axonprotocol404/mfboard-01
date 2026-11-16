// make.fun's public API client: read-only GET requests, open to any origin (CORS).
// Deduplicates concurrent calls per path and caches each answer for the session.
// Full reference: https://make.fun/api/openapi.json.

const API = 'https://make.fun/api';

// One request in flight per key, so a page that is re-rendered while its data
// arrives never sends the same GET twice; answers are kept for the session.
const inflight = new Map();
const cache = new Map();

/** GET a path, deduplicating concurrent calls and caching for the session. */
async function get(path, { fresh = false } = {}) {
  if (!fresh && cache.has(path)) return cache.get(path);
  if (inflight.has(path)) return inflight.get(path);
  const job = fetch(API + path, { headers: { accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`make.fun answered ${res.status} for ${path}`);
      return res.json();
    })
    .then((body) => {
      cache.set(path, body);
      return body;
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, job);
  return job;
}

/** The bounties, open ones by default: { items: [...] }. */
export const getBounties = (status = 'open') =>
  get(`/competitions?status=${status}&activity=times&limit=100`);

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** One bounty's leaderboard. */
export const getLeaderboard = (slug) =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** A person's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
