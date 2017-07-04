
// suggestion handler

import * as provider from './lib/provider.js';
import * as modifier from './lib/modifier.js';

const predicateTrue = () => true;

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

    /** @type {function(this:ButtonManager, !Object): void} */
    this.setModifier = (() => {
      const genderOption = ButtonManager.optionType_('modifier', 'gender');
      const toneOption = ButtonManager.optionType_('modifier', 'tone');
      this.holder_.appendChild(genderOption);
      this.holder_.appendChild(toneOption);

      // helper to create buttons
      const createModifierButton = (text, value=null) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.dataset['value'] = value;
        return button;
      };

      // create gender options
      const genders = [
        createModifierButton('\u{2014}', ''),
        createModifierButton('\u{2640}', 'f'),
        createModifierButton('\u{2640}\u{2642}', 'fm'),
        createModifierButton('\u{2642}', 'm'),
        createModifierButton('\u{2642}\u{2640}', 'mf'),
      ];

      // create tone options
      const tones = [
        toneOption.appendChild(createModifierButton('\u{2014}', '')),
      ];
      for (let i = 0x1f3fb; i <= 0x1f3ff; ++i) {
        tones.push(createModifierButton(String.fromCodePoint(i), i));
      }

      // helper to add/remove
      const updateStatus = (yes, node, owner) => {
        yes ? owner.appendChild(node) : node.remove();
      };
      return function(info) {
        genders.forEach(node => {
          const l = node.dataset['value'].length;
          const yes = (!l && info.gender.neutral)
              || (l === 1 && info.gender.single)
              || (l === 2 && info.gender.double);
          updateStatus(yes, node, genderOption);
        });
        tones.forEach(node => updateStatus(info.tone, node, toneOption));
      }
    })();
  }

  static optionType_(type, value) {
    const node = document.createElement('div');
    node.className = 'options ' + type;
    node.setAttribute('data-' + type, value);
    return node;
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
    if (!name) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const checker = () => {
        const immediateResult = this.immediateFirstEmojiForOption_(name);
        if (!immediateResult) {
          return false;
        }
        if (this.pendingFirstEmoji_ === checker) {
          this.pendingFirstEmoji_ = null;
        }
        resolve(immediateResult);
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
    let show = predicateTrue;
    if (prefix === true) {
      const qlen = query.length;
      if (qlen !== 0) {
        show = (name) => name.length >= qlen && name.substr(0, qlen) === query;
      }
    } else {
      show = (name) => (name === query);
    }
    this.options_.forEach((node, name) => node.hidden = !show(name));
  }

  /**
   * Updated displayed options with real results. Adds all nodes immediately, but returns a Promise
   * which indicates when all valid emoji are shown.
   *
   * @param {!Array<!Array<string>>}
   * @return {!Promise<undefined>}
   */
  update(results) {
    const options = new Map();
    const buttons = new Map();
    const previousActiveElement =
        this.holder_.contains(document.activeElement) ? document.activeElement : null;
    const queue = [];

    results.forEach(result => {
      const name = result[0];

      const option = this.options_.get(name) || ButtonManager.option_(name);
      this.options_.delete(name);
      options.set(name, option);
      option.hidden = true;
      this.holder_.appendChild(option);  // reinsert in better order

      for (let i = 1, emoji; emoji = result[i]; ++i) {
        if (buttons.has(emoji)) {
          continue;  // already stolen by something above us
        }

        let button = this.buttons_.get(emoji);
        if (!button) {
          button = ButtonManager.button_(emoji);
          queue.push({emoji, button});
        } else {
          this.buttons_.delete(emoji);
          if (!button.className) {
            // if it's still unknown, option stays hidden
            option.hidden = false;
          }
        }
        buttons.set(emoji, button);
        option.appendChild(button);
      }
    });

    this.options_.forEach((option) => option.remove());
    this.buttons_.forEach((button) => button.remove());
    this.options_ = options;
    this.buttons_ = buttons;

    if (previousActiveElement) {
      if (!previousActiveElement.parentNode) {
        typer.focus();  // restore to main input
      } else {
        previousActiveElement.focus();
      }
    }

    // TODO: move this to be running "all the time"
    // nb. This is a function as Safari fails on async arrows:
    // https://bugs.webkit.org/show_bug.cgi?id=166879
    return (async function() {
      let valid = 0;
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
          ++valid;
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
      return valid;
    }.call(this));
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
  } else if (b.parentNode.dataset['name']) {
    // nb. we typically clear the word on choice (as it confuses @nickyringland), but if you hit
    // space or ctrl-click the button, keep it around.
    const retainWord = (spaceFrame !== 0 || ev.metaKey || ev.ctrlKey);
    const word = retainWord ? b.parentNode.dataset['name'] : null;

    const detail = {choice: b.textContent, word};
    typer.dispatchEvent(new CustomEvent('emoji', {detail}));
    provider.select(b.parentNode.dataset['name'], detail.choice);
    label = 'emoji';
  } else {
    // unknown
  }
  label && ga('send', 'event', 'options', 'click', label);
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

(function() {
  const longTime = 2000;
  const delayTime = 250;
  const manager = new ButtonManager(chooser);

  let previous = {};
  let previousQueryAt = performance.now();
  let pendingFirstEmojiRequest = null;

  // handler for a prefix search
  typer.addEventListener('query', ev => {
    // immediately inform manager of modifier buttons (gender, tone), if it's a full word search
    const info = modifier.modify(!ev.detail.prefix && ev.detail.focus || '');
    manager.setModifier(info);

    pendingFirstEmojiRequest = null;  // user typed something else

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

    const request = async (timeout=0, more=false) => {
      if (timeout) {
        await new Promise((resolve) => window.setTimeout(() => {
          window.requestAnimationFrame(resolve);
        }, timeout));
        if (previous !== query) { return -1; }
      }
      const results = await provider.request(query.text, query.prefix, more);
      if (previous !== query) { return -1; }

      // TODO: rather than discarding, can we work out whether this is something we can _filter_
      // to _look_ like the real results?
      // nb. we'd have to say... this is "old" but the final one hasn't finished.

      return manager.update(results);
    };

    const p = request(immediate ? 0 : delayTime).then((valid) => {
      if (valid < 0) { return -2; }  // query changed

      // TODO: the 'more' behaviour interacts oddly with pendingFirstEmojiRequest, as it can appear
      // as if your emoji changes after a _long_ time.

      const timeout = Math.max(1000, 100 * Math.pow(valid, 0.75));
      return request(timeout, true);
    }).catch(err => {
      console.error('error doing request', err);
    });
  });

  // nb. this punctuation list is just misc stuff needed by emojimap
  const invalidLetterRe = /[^\w:\.,$%^\-']+/g;
  const simplifyWord = word => word.replace(invalidLetterRe, '').toLowerCase();

  // request an autocomplete, the user has just kept typing
  typer.addEventListener('request', ev => {
    const word = simplifyWord(ev.detail || '');
    const request = manager.firstEmojiForOption(word);
    pendingFirstEmojiRequest = request;
    request.then(choice => {
      if (pendingFirstEmojiRequest !== request) { return; }

      ga('send', 'event', 'options', 'typing');
      const detail = {choice, word};
      typer.dispatchEvent(new CustomEvent('emoji', {detail}));
    });
  });
}());
