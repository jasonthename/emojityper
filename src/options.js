
/**
 * @fileoverview Emojityper's suggestion handler. Handles creation, showing etc of autocomplete
 * buttons in the UI.
 */

import * as provider from './lib/provider.js';
import * as modifier from './lib/modifier.js';
import {valid} from './lib/valid.js';
import * as promises from './lib/promises.js';
import * as eventlib from './lib/event.js';

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

    /** @type {!WeakMap<!HTMLButtonElement, !DocumentFragment>} */
    this.buttonTarget_ = new WeakMap();

    const modifierHolder = document.createElement('div');
    this.holder_.appendChild(modifierHolder);

    /** @type {function(this:ButtonManager, !Object): void} */
    this.setModifier = (() => {
      const genderOption = ButtonManager.optionType_('modifier', 'gender');
      const toneOption = ButtonManager.optionType_('modifier', 'tone');
      modifierHolder.appendChild(genderOption);
      modifierHolder.appendChild(toneOption);

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

        // kick the elements: Safari needs this otherwise sometimes they remain hidden (!)
        modifierHolder.insertBefore(genderOption, genderOption.nextSibling);
        modifierHolder.insertBefore(toneOption, toneOption.nextSibling);
      }
    })();
  }

  static optionType_(type, value) {
    const node = document.createElement('div');
    node.className = 'options ' + type;
    node.dataset[type] = value;
    node.dataset['name'] = value;
    return node;
  }

  optionForName_(name) {
    const prev = this.options_.get(name);
    if (prev) {
      return prev;
    }
    const node = document.createElement('div');
    node.className = 'options';
    node.setAttribute('data-option', name);

    if (name[0] === '^') {
      node.classList.add('special');
      name = name.substr(1);
    }
    node.setAttribute('data-name', name);  // presentation only
    return node;
  }

  /**
   * Creates a `button` with the textContent of the passed emoji. Starts removed from the page,
   * but will (when valid) be placed in-order inside the specified `option`.
   *
   * @param {!HTMLElement} option to place inside
   * @param {string} emoji
   * @return {!HTMLButtonElement}
   */
  addEmojiTo_(option, emoji) {
    let button = this.buttons_.get(emoji);
    if (button) {
      // if the button was known, check buttonTarget_: either it's the eventual placement, which
      // we must replace, or it's a known good/bad already
      const target = this.buttonTarget_.get(button);
      if (target === null) {
        return button;  // known invalid
      } else if (target === undefined) {
        option.appendChild(button);  // known good
        return button;
      }
    } else {
      button = document.createElement('button');
      button.textContent = emoji;
      this.buttons_.set(emoji, button);

      valid(emoji).then((isValid) => {
        if (!isValid) {
          return this.buttonTarget_.set(button, null);
        }

        const node = this.buttonTarget_.get(button);
        node.parentNode.replaceChild(button, node);
        this.buttonTarget_.delete(button);

        // TODO(samthor): call this less?
        this.pendingFirstEmoji_ && this.pendingFirstEmoji_();
      });
    }

    const node = document.createTextNode('');  // empty placeholder to replace
    this.buttonTarget_.set(button, node);
    option.appendChild(node);

    return button;
  }

  /**
   * Returns any current valid emoji for the passed option name.
   *
   * @param {string} name
   * @return {?string} emoji
   */
  immediateFirstEmojiForOption_(name) {
    const node = this.options_.get(name);
    const cand = node && node.firstElementChild;
    return cand ? cand.textContent : null;
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
   * Updated displayed options with real results. These are expected the API format:
   *    [[name,emoji,emoji,...],[name,emoji,...],...]
   *
   * This retains existing options if they are included in the named results.
   *
   * @param {!Array<!Array<string>>}
   */
  update(results) {
    const options = new Map();
    const buttons = new Map();
    const previousActiveElement =
        this.holder_.contains(document.activeElement) ? document.activeElement : null;

    results.forEach((result) => {
      const name = result[0];

      const option = this.optionForName_(name);
      options.set(name, option);
      this.options_.delete(name);
      this.holder_.appendChild(option);  // reinsert in better order

      for (let i = 1, emoji; emoji = result[i]; ++i) {
        if (buttons.has(emoji)) {
          continue;  // already stolen by something above us
        }
        // TODO: this.addEmojiTo_ also uses this.buttons_
        buttons.set(emoji, this.addEmojiTo_(option, emoji));
      }
    });

    this.options_.forEach((option) => option.remove());
    this.options_ = options;
    this.buttons_ = buttons;

    if (previousActiveElement) {
      if (document.body.contains(previousActiveElement)) {
        previousActiveElement.focus();
      } else {
        typer.focus();  // restore to main input
      }
    }
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
  } else if (b.parentNode.dataset['option']) {
    // nb. we typically clear the word on choice (as it confuses @nickyringland), but if you hit
    // space or ctrl-click the button, keep it around.
    const retainWord = (spaceFrame !== 0 || ev.metaKey || ev.ctrlKey);
    const word = retainWord ? b.parentNode.dataset['option'] : null;

    const detail = {choice: b.textContent, word};
    typer.dispatchEvent(new CustomEvent('emoji', {detail}));
    provider.select(b.parentNode.dataset['option'], detail.choice);
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

// handle keyboard navigation inside chooser
chooser.addEventListener('keydown', ev => {
  switch (ev.key) {
  case 'Escape':
    typer.focus();
    break;
  }
  const arrow = eventlib.arrowFromEvent(ev);
  if (!arrow) { return; }

  if (!document.activeElement || !chooser.contains(document.activeElement)) { return; }

  // TODO: memoize value
  const buttonArray = Array.from(chooser.querySelectorAll('button'));
  const index = buttonArray.indexOf(document.activeElement);
  if (index === -1) { return; }

  // handle l/r keys
  let delta;
  if (arrow === 'ArrowLeft') {
    delta = -1;
  } else if (arrow === 'ArrowRight') {
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
  if (arrow === 'ArrowUp') {
    delta = -1;
  } else if (arrow === 'ArrowDown') {
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
  typer.addEventListener('query', (ev) => {
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
        await promises.rAF(timeout);
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

      if (!query.text) {
        // TODO: delay empty data by a decent time
        return request(1500, true);
      }

      const timeout = Math.max(1000, 100 * Math.pow(valid, 0.75));
      return request(timeout, true);
    }).catch(err => {
      console.error('error doing request', err);
    });
  });

  // nb. this punctuation list is just misc stuff needed by emojimap
  const invalidLetterRe = /[^\w:\.,$%^\-']+/g;
  const simplifyWord = (word) => word.replace(invalidLetterRe, '').toLowerCase();

  // request an autocomplete, the user has just kept typing
  typer.addEventListener('request', (ev) => {
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
