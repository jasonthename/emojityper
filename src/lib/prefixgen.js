
export default function build(raw, prefixLength=3, maxSuggestions=10) {
  const prefixSuggest = {};

  const values = {};
  raw.forEach(data => {
    const k = data[0];
    values[k] = data.slice(1);

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
  });

  return function(typed, prefix) {
    typed = typed.toLowerCase();
    const rest = typed.substr(prefixLength);
    let all = prefixSuggest[typed.substr(0, prefixLength)] || [];

    if (rest) {
      all = all.filter(word => word.substr(prefixLength).startsWith(rest));
    }
    if (!prefix) {
      all = all.filter(word => word === typed);
    }
    all = all.map(word => [word, ...values[word]]);

    return all.length ? all : [];
  }
}
