// Keep wall-clock time, successful refresh time and observation time distinct.
export function clockText(now = new Date()) {
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
}

export function observationStatus(validAt, now = Date.now()) {
  const age = now - Date.parse(validAt);
  if (!Number.isFinite(age)) return 'Observation time unavailable';
  const minutes = Math.max(0, Math.floor(age / 60000));
  return minutes >= 120 ? `Outdated · ${Math.floor(minutes / 60)} hours old` : minutes ? `Updated ${minutes} min ago` : 'Updated just now';
}

export function advanceRange(selected, now = Date.now()) {
  if (!selected?.from || !selected?.to) return selected;
  const duration = Date.parse(selected.to) - Date.parse(selected.from);
  return { ...selected, from: new Date(now - duration).toISOString(), to: new Date(now).toISOString() };
}

// Refresh the current query without remounting forms or losing their selection.
// A user-edited date range stays fixed; the initial range follows the clock.
export function watchRefresh(root, form, signal, refresh) {
  let follow = true;
  form?.addEventListener('input', event => {
    if (['from', 'to'].includes(event.target.name)) follow = false;
  }, { signal });
  window.addEventListener('monsoon-refresh', () => {
    if (root.isConnected && !signal.aborted) refresh(follow);
  }, { signal });
}
