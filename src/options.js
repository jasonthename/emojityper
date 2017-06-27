
// suggestion handler

import * as provider from './lib/provider.js';
import * as modifier from './lib/modifier.js';

// nb. this puncutation list is just misc stuff needed by emojimap
const invalidLetterRe = /[^\w:\.,$%^\-']+/g;
const simplifyWord = word => {
  if (word) {
    return word.replace(invalidLetterRe, '').toLowerCase();
  }
  return null;
};

/**
 * @type {Map<string, !HTMLButtonElement> cache of previously displayed buttons
 */
let buttonCache = new Map();

/**
 * @param {string} text of button to create
 * @return {!HTMLButtonElement} button either from cache or newly created
 */
function createButton(text) {
  const candidate = buttonCache.get(text);
  if (candidate) {
    return candidate;
  }
  const button = document.createElement('button');
  button.textContent = text;
  buttonCache.set(text, button);
  return button;
}

// button click handler
chooser.addEventListener('click', ev => {
  const b = ev.target;
  if (b.localName !== 'button') {
    // ignore
  } else if (b.parentNode.dataset['modifier']) {
    const value = 'value' in b.dataset ? (+b.dataset['value'] || b.dataset['value']) : null;
    const detail = {type: b.parentNode.dataset['modifier'], code: value};
    typer.dispatchEvent(new CustomEvent('modifier', {detail}));
  } else {
    const word = b.parentNode.dataset['word'];
    const detail = {choice: b.textContent, word};
    typer.dispatchEvent(new CustomEvent('emoji', {detail}));
    provider.select(word, detail.choice);
  }
});

// handle moving down from input
typer.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown') {
    const first = chooser.querySelector('button');
    first && first.focus();
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

let savedResults = null;
let query = null;
const show = results => {
  savedResults = results;

  chooser.textContent = '';
  const canary = document.createElement('span');
  chooser.appendChild(canary);
  const updatedButtonCache = new Map();

  // if there's a focus but it's not a prefix (which implies that it's text-only)
  if (query.focus && !query.prefix) {
    // TODO: dedup some of this code with the below generators
    const holderFor = type => {
      const el = document.createElement('div');
      el.className = 'options modifier';

      const buttons = document.createElement('div');
      buttons.className = 'buttons';
      buttons.dataset['modifier'] = type;
      el.appendChild(buttons);

      const h4 = document.createElement('h4');
      h4.textContent = type;
      el.appendChild(h4);

      chooser.appendChild(el);
      return buttons;
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

    if (out.diversity) {
      const diversityHolder = holderFor('diversity');
      createModifierButton(diversityHolder, '\u{2014}');
      for (let i = 0x1f3fb; i <= 0x1f3ff; ++i) {
        createModifierButton(diversityHolder, String.fromCodePoint(i), i);
      }
    }
  }

  // create buttons and headings for all options; immediately re-add previously cached buttons
  const replacement = document.createDocumentFragment();
  const holders = {};
  results && results.forEach(result => {
    const name = result['name'];

    const el = document.createElement('div');
    el.className = 'options';

    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    buttons.dataset['word'] = name;
    el.appendChild(buttons);

    const h4 = document.createElement('h4');
    h4.textContent = name;
    el.appendChild(h4);

    replacement.appendChild(el);
    holders[name] = buttons;

    // do a quick pass on already available buttons
    result['pending'] = result['options'].filter(option => {
      const button = buttonCache.get(option);
      if (!button) {
        return true;  // we want to redraw this later
      } else if (!updatedButtonCache.has(option)) {
        // don't show the same emoji button twice
        buttons.appendChild(button);
        updatedButtonCache.set(option, button);
      }
      return false;
    });
  });
  buttonCache = updatedButtonCache;
  chooser.appendChild(replacement);

  // async helper function for adding emoji over multiple frames (via requestIdleCallback).
  if (!results) { return; }
  const p = (async function() {
    let idle = null;

    for (let i = 0, result; result = results[i]; ++i) {
      const options = result['pending'];
      for (let j = 0, option; option = options[j]; ++j) {
        if (!idle || idle.timeRemaining() <= 0) {
          const p = new Promise(resolve => window.requestIdleCallback(o => resolve(o)));
          idle = await p;
          if (!canary.parentNode) { return; }
        }
        if (!buttonCache.has(option) && modifier.isExpectedLength(option)) {
          // TODO: If a user has allowed it, render all emojis (even invalid) anyway.
          const holder = holders[result['name']];
          holder.appendChild(createButton(option));
        }
      };
    };
  }());
  p.catch(e => console.warn('couldn\'t render emoji', e));
};

// set global callback for show
provider.callback(show);

// handler for a prefix search
typer.addEventListener('query', ev => {
  query = ev.detail;
  provider.request(query.text, query.prefix);
});

// request an autocomplete, the user has just kept typing
typer.addEventListener('request', ev => {
  const word = simplifyWord(ev.detail);
  let choice = null;

  (savedResults || []).some(result => {
    if (result['name'] !== word) { return false; }
    choice = result.options[0];
    return true;
  });

  if (choice) {
    const detail = {choice, word};
    typer.dispatchEvent(new CustomEvent('emoji', {detail}));
  }
});
