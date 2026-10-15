// One public total; local preferences never leave this browser.
export const COUNTER_KEY = 'sprace-demarchis-net-visitors-20261015';
export const API_ROOT = 'https://countapi.mileshilliard.com/api/v1';
export const IGNORE_KEY = 'space-race-counter-ignore-v1';
export const VISITED_KEY = 'space-race-counter-visited-v1';

export function counterValue(value) {
  if (!/^\d+$/.test(String(value))) throw new Error('Invalid visitor total');
  const count = Number(value);
  if (!Number.isSafeInteger(count)) throw new Error('Invalid visitor total');
  return count;
}

// Injectable browser services let tests exercise counting without hitting the API.
export async function loadCounter({ location, navigator, storage, fetch, locks }) {
  const mode = new URLSearchParams(location.search).get('counter');
  let ignored = mode === 'ignore';
  let stored = false;
  let visited = false;
  try {
    // Probe writes too: a browser may allow reads while blocking persistence.
    storage.setItem('space-race-counter-probe', '1');
    storage.removeItem('space-race-counter-probe');
    if (mode === 'ignore') storage.setItem(IGNORE_KEY, '1');
    if (mode === 'count') storage.removeItem(IGNORE_KEY);
    ignored = storage.getItem(IGNORE_KEY) === '1';
    visited = Boolean(storage.getItem(VISITED_KEY));
    stored = true;
  } catch {
    // No persistent storage means no increments, rather than one per refresh.
  }
  const automated = navigator.webdriver === true || /bot|crawler|spider|headless|playwright|puppeteer/i.test(navigator.userAgent || '');
  const live = location.hostname === 'sprace.demarchis.net' && location.protocol === 'https:';
  const result = { ignored, stored, automated, live, count: null, unavailable: false };
  if (!live) return result; // Local previews never even contact the counter service.

  const read = async operation => {
    const response = await fetch(`${API_ROOT}/${operation}/${COUNTER_KEY}`, {
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(6000),
    });
    if (operation === 'get' && response.status === 404) return 0;
    if (!response.ok) throw new Error('Counter unavailable');
    return counterValue((await response.json()).value);
  };
  const visit = async () => {
    let operation = 'get';
    if (stored && !ignored && !automated && !visited) {
      try {
        // Recheck inside the lock in case another tab counted this browser.
        if (!storage.getItem(VISITED_KEY) && storage.getItem(IGNORE_KEY) !== '1') {
          // Claim before sending: an ambiguous timeout must not cause a second hit.
          storage.setItem(VISITED_KEY, 'attempted');
          operation = 'hit';
        }
      } catch { /* A late storage failure must also fall back to read-only. */ }
    }
    result.count = await read(operation);
  };
  try {
    if (locks?.request) await locks.request('space-race-visitor-counter', visit);
    else await visit();
  } catch {
    result.unavailable = true;
  }
  return result;
}

export function renderCounter(element, result) {
  const digits = element.querySelector('[data-counter-digits]');
  const status = element.querySelector('[data-counter-status]');
  const toggle = element.querySelector('[data-counter-toggle]');
  const number = result.count === null ? '------' : String(result.count).padStart(6, '0');
  digits.replaceChildren(...Array.from(number, digit => {
    const tile = element.ownerDocument.createElement('span');
    tile.textContent = digit;
    return tile;
  }));
  digits.setAttribute('aria-label', result.count === null ? 'Visitor total unavailable' : `${result.count.toLocaleString('en-US')} space travelers`);
  const notes = [];
  if (result.ignored) notes.push(result.stored ? 'This browser is excluded.' : 'Excluded for this visit; preference could not be saved.');
  else if (result.automated) notes.push('Automated visit excluded.');
  else if (!result.stored) notes.push('Storage unavailable; this visit is not counted.');
  if (!result.live) notes.push('Preview — visits are not counted.');
  else if (result.unavailable) notes.push('Counter taking a spacewalk. Try again later.');
  else notes.push('Welcome-page visitors · once per browser');
  status.textContent = notes.join(' ');
  const href = new URL(element.ownerDocument.location.href);
  href.searchParams.set('counter', result.ignored ? 'count' : 'ignore');
  toggle.href = href.href;
  toggle.textContent = result.ignored ? 'Include this browser again' : 'Don’t count this browser';
}

if (typeof document !== 'undefined') {
  const element = document.querySelector('[data-visitor-counter]');
  if (element) {
    let storage;
    try { storage = window.localStorage; } catch { /* Read-only counter still works. */ }
    loadCounter({ location: window.location, navigator: window.navigator, storage,
      fetch: window.fetch.bind(window), locks: window.navigator.locks,
    }).then(result => renderCounter(element, result));
  }
}
