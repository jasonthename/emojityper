
// suggestion handler

import * as provider from './lib/provider.js';
import * as modifier from './lib/modifier.js';

/**
 * ButtonManager helps create and show emoji buttons in the UI.
 */
class ButtonManager {
  constructor(holder) {
    this.holder_ = holder;
    this.pendingFirstEmoji_ = null;

    /** @type {!Map<string, !HTMLElement>} */
    this.options_ = new Map();

    /** @type {!Map<string, !HTMLButtonElement>} */
    this.buttons_ = new Map();
  }

  static option_(name) {
    const node = document.createElement('div');
    node.className = 'options';
    node.setAttribute('data-name', name);
    return node;
  }

  static button_(text) {
    const button = document.createElement('button');
    button.className = 'unknown';
    button.textContent = text;
    return button;
  }

  immediateFirstEmojiForOption_(name) {
    const node = this.options_.get(name);
    if (!node) { return null; }

    let cand = node.firstElementChild;
    while (cand) {
      if (!cand.hidden && cand.className === '') {
        return cand.textContent;
      }
      cand = cand.nextElementSibling;
    }
    return null;
  }

  checkFirstEmoji_() {
    this.pendingFirstEmoji_ && this.pendingFirstEmoji_();
  }

  /**
   * Returns a promise for the first valid emoji value for the given name. This allows a user to
   * keep typing(-ish) yet have their text replaced with emoji.
   *
   * This promise isn't guaranteed to resolve. Drops previous request on additional calls.
   *
   * @param {string} name to search for
   * @return {!Promise<?string>} emoji found
   */
  firstEmojiForOption(name) {
    return new Promise((resolve) => {
      const checker = () => {
        const immediateResult = this.immediateFirstEmojiForOption_(name);
        if (immediateResult) {
          if (this.pendingFirstEmoji_ === checker) {
            this.pendingFirstEmoji_ = null;
          }
          resolve(immediateResult);
          return Promise.resolve(immediateResult);
        }
      };
      this.pendingFirstEmoji_ = checker;
      checker();
    });
  }

  /**
   * Filters all local option nodes based on the given query.
   *
   * @param {string} query
   * @param {boolean} prefix
   */
  localFilter(query, prefix) {
    let show;
    if (prefix === true) {
      const qlen = query.length;
      if (qlen === 0) {
        show = () => true;
      } else {
        show = (name) => name.length >= qlen && name.substr(0, qlen) === query;
      }
    } else {
      show = (name) => (name === query);
    }
    this.options_.forEach((node, name) => node.hidden = !show(name));
  }

  /**
   * Updated displayed options with real results.
   *
   * @param {!Array<!Array<string>>}
   * @return {!Promise<undefined>}
   */
  update(results) {
    const options = new Map();
    const buttons = new Map();
    const previousActiveElement = document.activeElement;
    const queue = [];

    results.forEach(result => {
      const name = result[0];

      const option = this.options_.get(name) || ButtonManager.option_(name);
      this.options_.delete(name);
      options.set(name, option);
      option.hidden = true;
      this.holder_.appendChild(option);  // reinsert in better order

      for (let i = 1, emoji; emoji = result[i]; ++i) {
        let button = this.buttons_.get(emoji);
        if (!button) {
          button = ButtonManager.button_(emoji);
          queue.push({emoji, button});
        } else {
          this.buttons_.delete(emoji);
          option.hidden = false;
        }
        buttons.set(emoji, button);
        option.appendChild(button);
      }
    });
    previousActiveElement.focus();

    this.options_.forEach((option) => option.remove());
    this.buttons_.forEach((button) => button.remove());
    this.options_ = options;
    this.buttons_ = buttons;

    // TODO: move this to be running "all the time"
    return (async () => {
      let idle = null;
      const start = window.performance.now();

      // don't start with idle: the first N might complete really fast (already known)
      for (let q = 0; q < queue.length; ++q) {
        const {emoji, button} = queue[q];
        if (!button.parentNode) {
          continue;
        }
        if (modifier.isExpectedLength(emoji)) {
          button.className = '';
          button.parentNode.hidden = false;
        } else {
          button.remove();
        }

        if (q < 20 || (idle === null && window.performance.now() - start < 10)) {
          continue;
        }

        let expired = true;
        if (idle !== null) {
          expired = idle.timeRemaining() < 0;
        }
        if (expired) {
          this.checkFirstEmoji_();
          idle = await (new Promise(resolve => window.requestIdleCallback(resolve)));
        }
      }

      this.checkFirstEmoji_();
    })();
  }
}

// key overrides to recognize spacebar causing 'click'
let spaceFrame = 0;
chooser.addEventListener('keyup', ev => {
  if (ev.key !== ' ' || ev.target.localName !== 'button') { return; }
  spaceFrame = window.setTimeout(() => spaceFrame = 0, 0);
});

// button click handler
chooser.addEventListener('click', ev => {
  let label = undefined;
  const b = ev.target;
  if (b.localName !== 'button') {
    // ignore
  } else if (b.parentNode.dataset['modifier']) {
    const value = 'value' in b.dataset ? (+b.dataset['value'] || b.dataset['value']) : null;
    const detail = {type: b.parentNode.dataset['modifier'], code: value};
    typer.dispatchEvent(new CustomEvent('modifier', {detail}));
    label = 'modifier';
  } else {
    // nb. we typically clear the word on choice (as it confuses @nickyringland), but if you hit
    // space or ctrl-click the button, keep it around.
    const retainWord = (spaceFrame !== 0 || ev.metaKey || ev.ctrlKey);
    const word = retainWord ? b.parentNode.dataset['name'] : null;

    const detail = {choice: b.textContent, word};
    typer.dispatchEvent(new CustomEvent('emoji', {detail}));
    provider.select(word, detail.choice);
    label = 'emoji';
  }
  ga('send', 'event', 'options', 'click', label);
});

// handle moving down from input
typer.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown' || ev.key === 'Down') {
    const first = chooser.querySelector('button');
    if (first) {
      first.focus();
      ga('send', 'event', 'options', 'keyboardnav');
    }
  }
});

const arrowKeys = ['Left', 'Right', 'Up', 'Down'];
const isArrowKey = key => {
  return key.startsWith('Arrow') || arrowKeys.indexOf(key) !== -1;
};

// handle keyboard navigation inside chooser
chooser.addEventListener('keydown', ev => {
  switch (ev.key) {
  case 'Escape':
    typer.focus();
    break;
  }
  if (!isArrowKey(ev.key)) { return; }
  if (!document.activeElement || !chooser.contains(document.activeElement)) { return; }

  // TODO: memoize value
  const buttonArray = Array.from(chooser.querySelectorAll('button'));
  const index = buttonArray.indexOf(document.activeElement);
  if (index === -1) { return; }

  // handle l/r keys
  let delta;
  if (ev.key === 'ArrowLeft' || ev.key === 'Left') {
    delta = -1;
  } else if (ev.key === 'ArrowRight' || ev.key === 'Right') {
    delta = +1;
  }
  if (delta) {
    const target = index + delta;
    if (target >= 0 && target < buttonArray.length) {
      buttonArray[target].focus();
    }
    return;  // done
  }

  // handle u/d keys
  if (ev.key === 'ArrowUp' || ev.key === 'Up') {
    delta = -1;
  } else if (ev.key === 'ArrowDown' || ev.key === 'Down') {
    delta = +1;
  } else {
    return;
  }
  const previousRect = document.activeElement.getBoundingClientRect();
  const best = {dist: Infinity, button: null};

  let targetTop = undefined;
  let candidate = index;
  while ((candidate += delta) >= 0 && candidate < buttonArray.length) {
    const button = buttonArray[candidate];
    const candidateRect = button.getBoundingClientRect();

    if (previousRect.top === candidateRect.top) { continue; }
    if (targetTop === undefined) {
      targetTop = candidateRect.top;
    }
    if (candidateRect.top !== targetTop) {
      break;  // no more good candidates
    }

    const dist = Math.abs(candidateRect.left - previousRect.left);
    if (dist < best.dist) {
      [best.dist, best.button] = [dist, button];
    }
  }

  if (best.button) {
    best.button.focus();
  } else if (targetTop === undefined && delta < 0) {
    // if we were at top and going -ve, then return to input
    typer.focus();
  }
});

const manager = new ButtonManager(chooser);
const show = (results) => {
  manager.update(results);
};

const slowShow = (results) => {
  // FIXME FIXME FIXME bring this back

  // if there's a focus but it's not a prefix (which implies that it's text-only)
  if (query.focus && !query.prefix) {
    // TODO: dedup some of this code with the below generators
    const holderFor = type => {
      const el = document.createElement('div');
      el.className = 'options modifier';
      el.setAttribute('data-modifier', type);

      chooser.appendChild(el);
      return el;
    };
    const createModifierButton = (holder, text, opt_value) => {
      const button = document.createElement('button');
      button.textContent = text;
      if (opt_value) {
        button.dataset['value'] = opt_value;
      }
      holder.appendChild(button);
    };

    const out = modifier.modify(query.focus);

    if (out.gender.single || out.gender.double) {
      const genderHolder = holderFor('gender');
      out.gender.neutral && createModifierButton(genderHolder, '\u{2014}');
      out.gender.single && createModifierButton(genderHolder, '\u{2640}', 'f');
      out.gender.double && createModifierButton(genderHolder, '\u{2640}\u{2642}', 'fm');
      out.gender.single && createModifierButton(genderHolder, '\u{2642}', 'm');
      out.gender.double && createModifierButton(genderHolder, '\u{2642}\u{2640}', 'mf');
    }

    if (out.tone) {
      const toneHolder = holderFor('tone');
      createModifierButton(toneHolder, '\u{2014}');
      for (let i = 0x1f3fb; i <= 0x1f3ff; ++i) {
        createModifierButton(toneHolder, String.fromCodePoint(i), i);
      }
    }
  }
};

// set global callback for show
provider.callback(show);

(function() {
  const longTime = 2000;
  const delayTime = 250;

  let previous = {};
  let idleTimeout = 0;
  let previousQueryAt = performance.now();
  let pendingFirstEmojiRequest = null;

  // handler for a prefix search
  typer.addEventListener('query', ev => {
    pendingFirstEmojiRequest = null;  // user typed something else

    const runner = () => provider.request(query.text, query.prefix);
    let immediate = false;

    const now = performance.now();
    const query = ev.detail;
    if (!previous.text || previous.prefix !== query.prefix) {
      immediate = true;  // type changed, user expects snappiness
    } else if (now - previousQueryAt > longTime) {
      immediate = true;  // it's been a while
    }
    previous = query;
    previousQueryAt = now;

    window.clearTimeout(idleTimeout);
    if (immediate) {
      return runner();
    } else {
      manager.localFilter(query.text, query.prefix);
      idleTimeout = window.setTimeout(runner, delayTime);
    }
  });

  // nb. this punctuation list is just misc stuff needed by emojimap
  const invalidLetterRe = /[^\w:\.,$%^\-']+/g;
  const simplifyWord = word => {
    if (word) {
      return word.replace(invalidLetterRe, '').toLowerCase();
    }
    return null;
  };

  // request an autocomplete, the user has just kept typing
  typer.addEventListener('request', ev => {
    const word = simplifyWord(ev.detail);
    const request = manager.firstEmojiForOption(word);
    pendingFirstEmojiRequest = request;
    request.then(choice => {
      if (pendingFirstEmojiRequest !== request) {
        return;  // changed from under us
      }
      ga('send', 'event', 'options', 'typing');
      const detail = {choice, word};
      typer.dispatchEvent(new CustomEvent('emoji', {detail}));
    });
  });
}());

