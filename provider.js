(function() {
  const api = 'https://emojityper.appspot.com';

  function historicData() {
    let p = window.fetch('https://emojityper.com/res/js/emojimap.js').then(out => out.text());
    p = p.then(raw => {
      const first = raw.indexOf('{');
      if (first === -1) {
        throw new Error('invalid emojimap');
      }
      // FIXME: never do this :O
      eval('var emojimap = ' + raw.substr(first));
      return emojimap;
    })
    p = p.then(emojimap => {
      const out = {};
      Object.keys(emojimap).forEach(string => {
        const data = emojimap[string];
        string = string.replace(/\s+/g, '').replace(/[’’]/g, '');
        if (!(string in out)) {
          out[string] = [];
        }
        out[string].push(...data.map(details => details.emoji));
      });

      return out;
    });
    return p;
  }

  function futureData() {
    return window.fetch(api + '/popular').then(out => out.json());
  }

  const data = historicData();
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

  let requestWord = null;

  const dummyResults = word => {
    if (!requestWord) {
      window.emojimanager.callback(null);
      return;
    }

    indexed.then(suggest => {
      const results = suggest(word);
      window.emojimanager.callback(results);
    }).catch(err => {
      console.warn('some error in suggest', err);
    });
  };

  window.emojimanager = {
    callback: function() {},
    set request(v) {
      requestWord = v;
      window.requestAnimationFrame(dummyResults.bind(null, requestWord));
    },
    get request() {
      return requestWord;
    },
    submit(name, value) {
      const data = new FormData();
      data.set('name', name);
      data.set('emoji', value);
      return window.fetch(api + '/name', {method: 'POST', data});
    },
  };

}())

