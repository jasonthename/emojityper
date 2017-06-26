const api = 'https://us-central1-emojityper.cloudfunctions.net';

import build from './prefixgen.js';

let indexed;
try {
  let data = JSON.parse(window.localStorage['popular']);
  if (data['created'] >= (+new Date - 60 * 60 * 24 * 1000)) {
    indexed = Promise.resolve(build(data['results']));
    console.debug('got indexed localStorage');
  }
} catch (e) {
  console.debug('couldn\'t parse localStorage popular', e);
}
if (!indexed) {
  // if no data or >1day old, refetch
  const f = new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', api + '/popular');
    xhr.onerror = reject;
    xhr.responseType = 'json';
    xhr.onload = () => resolve(xhr.response);
    xhr.send();
  });
  f.then(data => {
    data['created'] = +new Date();
    window.localStorage['popular'] = JSON.stringify(data);
  });
  const local = f.then(v => build(v['results']));
  if (!indexed) {
    indexed = local;  // wait for data
  } else {
    local.then(() => indexed = local);  // use existing data before replacing it
  }
}

let requestCallback = function() {};
let timeout;  // timeout handler for secondary query
const performRequest = (text, prefix) => {
  window.clearTimeout(timeout);
  if (!text) {
    requestCallback(null);
    return;
  }

  // TODO: only send extra query if there's not enough results, or the user hits 'more'
  const localTimeout = window.setTimeout(_ => {
    let url = api + '/query?query=' + encodeURIComponent(text);
    if (prefix) {
      url += '&prefix=true';
    }
    // FIXME: don't ever clobber old results: maybe do this under "more" or if there's
    // only very few results?
    window.fetch(url)
        .then(out => out.json())
        .then(out => {
          const all = out.results.map(arr => ({'name': arr[0], 'options': arr.slice(1)}));
          send(all);
        });
  }, 2000);
  timeout = localTimeout;

  indexed.then(suggest => {
    let results = suggest(text);
    if (!prefix) {
      results = results.filter(result => result['name'] === text);
    }
    send(results);
  });

  // nb. at end to hoist above 'localTimeout'
  function send(out) {
    if (timeout === localTimeout) {
      requestCallback(out);
    }
  }
};

export function request(text, prefix) {
  window.requestAnimationFrame(_ => {
    performRequest(text, prefix);
  });
}

let pendingSelect = {};
let timeoutSelect;
export function select(name, emoji) {
  pendingSelect[name] = emoji;

  window.clearTimeout(timeoutSelect);
  timeoutSelect = window.setTimeout(_ => {
    const body = JSON.stringify(pendingSelect);
    pendingSelect = {};

    // TODO: ugh promises
    window.fetch(api + '/select', {method: 'POST', body})
  }, 5 * 1000);
}

export function submit(name, emoji) {
  const body = new FormData();
  body.append('name', name);
  body.append('emoji', emoji);
  return window.fetch(api + '/name', {method: 'POST', mode: 'cors', body});
}

export function callback(callback) {
  requestCallback = callback;
}
