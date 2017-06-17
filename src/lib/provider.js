//const api = 'https://emojityper.appspot.com';
const api = 'http://localhost:8080';

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

export function submit(name, value) {
  const data = new FormData();
  data.append('name', name);
  data.append('emoji', value);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = resolve;  // TODO
    xhr.onerror = reject;
    xhr.open('POST', api + '/name');
    xhr.send(data);
  });
//  return window.fetch(api + '/name', {method: 'POST', mode: 'cors', data: data});
}

export function callback(callback) {
  requestCallback = callback;
}
