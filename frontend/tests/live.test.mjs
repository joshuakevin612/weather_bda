import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceRange, clockText, observationStatus, watchRefresh } from '../dist/live.js';

test('clock changes with time and includes seconds', () => {
  assert.notEqual(clockText(new Date('2026-10-23T02:00:00Z')), clockText(new Date('2026-10-23T02:00:01Z')));
});

test('old observations stay old even when the page just refreshed', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  assert.equal(observationStatus('2026-10-23T02:00:00Z', now), 'Outdated · 10 hours old');
  assert.equal(observationStatus('2026-10-23T11:45:00Z', now), 'Updated 15 min ago');
  assert.equal(observationStatus('bad timestamp', now), 'Observation time unavailable');
});

test('live queries move forward with the same duration and filters', () => {
  const selected = { from: '2026-10-22T12:00:00Z', to: '2026-10-23T12:00:00Z', location_id: '17' };
  const moved = advanceRange(selected, Date.parse('2026-10-23T12:30:00Z'));
  assert.equal(moved.from, '2026-10-22T12:30:00.000Z');
  assert.equal(moved.to, '2026-10-23T12:30:00.000Z');
  assert.equal(moved.location_id, '17');
  assert.equal(selected.to, '2026-10-23T12:00:00Z');
  assert.deepEqual(advanceRange({ location_id: '17' }), { location_id: '17' });
});

test('manual dates stay fixed, refresh listeners stop on navigation', () => {
  globalThis.window = new EventTarget();
  const form = new EventTarget(), controller = new AbortController(), calls = [];
  const root = { isConnected: true };
  watchRefresh(root, form, controller.signal, follow => calls.push(follow));
  window.dispatchEvent(new Event('monsoon-refresh'));
  Object.assign(form, { name: 'to' });
  form.dispatchEvent(new Event('input'));
  window.dispatchEvent(new Event('monsoon-refresh'));
  root.isConnected = false;
  window.dispatchEvent(new Event('monsoon-refresh'));
  root.isConnected = true;
  controller.abort();
  window.dispatchEvent(new Event('monsoon-refresh'));
  assert.deepEqual(calls, [true, false]);
  delete globalThis.window;
});
