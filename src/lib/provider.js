const api = 'https://us-central1-emojityper.cloudfunctions.net';

import build from './prefixgen.js';
import * as results from './results.js';

/**
 * Returns the local prefix search tool.
 *
 * @return {function(string, boolean): !Array<!Array<string>>}
 */
const getPrefixGen = (function() {
  let localPromise = null;  // results from localStorage
  const raw = window.localStorage['popular'];
  if (raw) {
    let out;
    try {
      out = JSON.parse(raw);
    } catch (e) {
      console.debug('couldn\'t parse localStorage popular', e);
      out = null;
    }
    if (out) {
      localPromise = Promise.resolve(build(out['results']));
      if (out['created'] >= (+new Date - 60 * 60 * 24 * 1000)) {
        // return immediately, it's less than one day old
        return () => localPromise;
      }
    }
  }

  // we don't have data or it's >1day old, refetch
  const f = new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', api + '/popular');
    xhr.onerror = reject;
    xhr.responseType = 'json';
    xhr.onload = () => resolve(xhr.response);
    xhr.send();
  }).then(raw => {
    // IE11 doesn't respect responseType, and we always return an Object
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  });

  f.then(data => {
    // TODO: It's a bit ugly to hit the loader from here.
    window.loader.hidden = true;
    data['created'] = +new Date();
    window.localStorage['popular'] = JSON.stringify(data);
  });

  const remotePromise = f.then(v => build(v['results']));
  if (!localPromise) {
    // TODO: It's a bit ugly to hit the loader from here.
    window.loader.hidden = false;
    return () => remotePromise;  // wait for data
  }

  // return localPromise until remotePromise is done
  let promiseToReturn = localPromise;
  remotePromise.then(() => promiseToReturn = remotePromise);
  return () => promiseToReturn;
}());

/**
 * Requests emoji completion.
 *
 * @param {string} text user has typed
 * @param {boolean} prefix is this a prefix search, or is it a definite whole word?
 * @param {boolean=} more whether to return lots more results for this query
 * @return {!Promise<!Array<!Array>>}
 */
export function request(text, prefix, more=false) {
  if (!text) {
    return Promise.resolve([]);
  }

  const localPromise = getPrefixGen().then(suggest => suggest(text, prefix));
  if (!more) {
    return localPromise;
  }

  // TODO: At some point, the 'more' data should go into a local cache. For now, just fetch.
  console.info('doing "more" request', text, prefix);
  let url = `${api}/query?query=${window.encodeURIComponent(text)}`;
  if (prefix) {
    url += '&prefix=true';
  }
  const morePromise = window.fetch(url).then(out => out.json()).then(out => out['results']);
  return Promise.all([localPromise, morePromise]).then(both => {
    const [local, more] = both;
    results.merge(local, more);
    return local;
  });
}

/**
 * Records use of name/emoji pairs.
 *
 * @param {string} name used to select emoji
 * @param {string} emoji selected
 * @param {!Promise<!Response>} eventual response after delay
 */
export const select = (function() {
  const delay = 5 * 1000;
  let pending = {};
  let timeout;
  let currentPromise;
  let eventualResolve;

  const runner = () => {
    const body = JSON.stringify(pending);
    pending = {};  // clear pending for next time

    // TODO: use sendBeacon
    const p = window.fetch(api + '/select', {method: 'POST', body})
    if (!eventualResolve) {
      throw new Error('got fetch without eventualResolve');
    }
    currentPromise = null;  // success... probably
    eventualResolve(p);
  };

  return function select(name, emoji) {
    console.info('selected', name, emoji);
    pending[name] = emoji;

    if (!currentPromise) {
      // save resolve for later
      currentPromise = new Promise((resolve) => eventualResolve = resolve);
    }

    window.clearTimeout(timeout);
    timeout = window.setTimeout(runner, delay);
    return currentPromise;
  }
}());

/**
 * Submit the name of an emoji.
 *
 * @param {string} name
 * @param {string} emoji
 * @return {!Promise<Response>}
 */
export function submit(name, emoji) {
  const body = new FormData();
  body.append('name', name);
  body.append('emoji', emoji);
  return window.fetch(api + '/name', {method: 'POST', mode: 'cors', body});
}
