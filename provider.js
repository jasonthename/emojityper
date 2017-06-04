(function() {

  const helper = window.fetch('https://emojityper.com/res/js/emojimap.js').then(out => out.text()).then(out => {
    const first = out.indexOf('{');
    if (first === -1) {
      throw new Error('invalid emojimap');
    }
    // FIXME: never do this :O
    eval('var emojimap = ' + out.substr(first));

    return (function() {
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
          const options = (emojimap[word] || []).map(obj => obj['emoji']);
          return {'name': word, 'options': options};
        });
        all = all.filter(result => result.options.length);

        return all.length ? all : null;
      }
    }());
  });

  let requestWord = null;

  const dummyResults = word => {
    if (!requestWord) {
      window.emojimanager.callback(null);
      return;
    }

    helper.then(suggest => {
      const results = suggest(word);
      window.emojimanager.callback(results);
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
  };

}())

