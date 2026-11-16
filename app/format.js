// Small helpers for showing API values. All text that comes from the API
// passes through esc() before it is placed inside HTML.

/** Text made safe to put inside HTML (also safe for attribute values). */
export function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00' or 0.5) as '$1,000' or '$0.50'; '$0' when absent. */
export function money(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** A deadline as a date in UTC. */
export function date(iso) {
  return `${new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** True when a bounty's deadline has passed (a bounty past its deadline may
 * still read status open until results are published, so the deadline decides). */
export function closed(b) {
  return Boolean(b.deadline) && new Date(b.deadline).getTime() <= Date.now();
}

/** An avatar or share image URL from the API, absolute; empty when absent. */
export function media(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://make.fun${url}`;
}
