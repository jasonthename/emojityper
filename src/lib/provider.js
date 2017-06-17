const api = 'https://emojityper.appspot.com';

const data = window.fetch(api + '/popular').then(out => out.json());
let indexed = data.then(emojimap => {
  const prefixLength = 3;   // generate prefixes up to this length
  const maxSuggestions = 10;  // only generate this many suggestions
  const prefixSuggest = {};

  for (let k in emojimap) {
    const prefix = k.substr(0, prefixLength);
    for (let i = 1; i <= prefix.length; ++i) {
      const part = prefix.substr(0, i);
      let opts = prefixSuggest[part];
      if (!opts) {
        opts = prefixSuggest[part] = [];
      }
      if (opts.length < maxSuggestions) {
        opts.push(k);
      }
    }
  }

  return function(typed) {
    typed = typed.toLowerCase();
    const rest = typed.substr(prefixLength);
    let all = prefixSuggest[typed.substr(0, prefixLength)] || [];

    if (rest) {
      all = all.filter(word => word.substr(prefixLength).startsWith(rest));
    }
    all = all.map(word => {
      return {'name': word, 'options': emojimap[word] || []};
    });

    return all.length ? all : null;
  }
});

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
    const data = new FormData();
    data.append('q', text);
    data.append('prefix', prefix)
    window.fetch(api + '/query', {method: 'POST', data}).then(out => out.json()).then(send);
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
