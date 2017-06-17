
import * as provider from './lib/provider.js';
import * as modifier from './lib/modifier.js';

// suggestion handler
(function(input, chooser) {
  // nb. this puncutation list is just misc stuff needed by emojimap
  const invalidLetterRe = /[^\w:\.,$%^\-']+/g;
  const simplifyWord = word => {
    if (word) {
      return word.replace(invalidLetterRe, '').toLowerCase();
    }
    return null;
  };

  let buttonArray = [];

  // button click handler
  chooser.addEventListener('click', ev => {
    const b = ev.target;
    if (b.localName !== 'button') {
      // ignore
    } else if (b.dataset['modifier']) {
      const value = 'value' in b.dataset ? (+b.dataset['value'] || b.dataset['value']) : null;
      const detail = {type: b.dataset['modifier'], code: value};
      input.dispatchEvent(new CustomEvent('modifier', {detail}));
    } else {
      const detail = {choice: b.textContent, word: b.dataset['word']};
      input.dispatchEvent(new CustomEvent('emoji', {detail}));
    }
  });

  // handle moving down from input
  input.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowDown') {
      const first = chooser.querySelector('button');
      first && first.focus();
    }
  });

  // handle keyboard navigation inside chooser
  chooser.addEventListener('keydown', ev => {
    switch (ev.key) {
    case 'Escape':
      input.focus();
      break;
    }
    if (!ev.key.startsWith('Arrow')) { return; }

    const index = buttonArray.indexOf(document.activeElement);
    if (index === -1) { return; }

    // handle l/r keys
    let delta;
    if (ev.key === 'ArrowLeft') {
      delta = -1;
    } else if (ev.key === 'ArrowRight') {
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
    if (ev.key === 'ArrowUp') {
      delta = -1;
    } else if (ev.key === 'ArrowDown') {
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
      return;
    }

    // if we were at top and going -ve, then return to input
    if (targetTop === undefined && delta < 0) {
      input.focus();
      return;
    }

  });

  let savedResults = null;
  let query = null;
  const show = results => {
    chooser.textContent = '';
    buttonArray.length = 0;
    savedResults = results;

    const canary = document.createElement('span');
    chooser.appendChild(canary);

    const createOptionsButtons = (heading, opt_class) => {
      const el = document.createElement('div');
      el.className = 'options';
      opt_class && el.classList.add(opt_class);

      const h4 = document.createElement('h4');
      h4.textContent = heading;
      el.appendChild(h4);

      const buttons = document.createElement('div');
      buttons.className = 'buttons';
      el.appendChild(buttons);
      chooser.appendChild(el);
      return buttons;
    };

    const createButton = (holder, content) => {
      const button = document.createElement('button');
      button.textContent = content;
      holder.appendChild(button);
      buttonArray.push(button);
      return button;
    };

    // if there's a focus but it's not a prefix (which implies that it's text-only)
    if (query.focus && !query.prefix) {
      const modifiers = {};
      const createModifierButton = (type, text, opt_value) => {
        let buttons = modifiers[type];
        if (!buttons) {
          modifiers[type] = buttons = createOptionsButtons(type, 'modifier');
        }
        const button = createButton(buttons, text);
        button.dataset['modifier'] = type;
        if (opt_value) {
          button.dataset['value'] = opt_value;
        }
      };

      const out = modifier.modify(query.focus);

      out.gender.neutral && createModifierButton('gender', '\u{2014}');
      out.gender.single && createModifierButton('gender', '\u{2640}', 'f');
      out.gender.double && createModifierButton('gender', '\u{2640}\u{2642}', 'fm');
      out.gender.single && createModifierButton('gender', '\u{2642}', 'm');
      out.gender.double && createModifierButton('gender', '\u{2642}\u{2640}', 'mf');

      if (out.diversity) {
        createModifierButton('diversity', '\u{2014}');
        for (let i = 0x1f3fb; i <= 0x1f3ff; ++i) {
          createModifierButton('diversity', String.fromCodePoint(i), i);
        }
      }
    }

    // async helper function for adding emoji over multiple frames (via requestIdleCallback).
    // FIXME: immediately readd matchin emoji buttons, avoid flash
    const render = async function() {
      let idle = null;

      for (let i = 0, result; result = results[i]; ++i) {
        const name = result['name'];
        let buttons = null;

        const options = result['options'];
        for (let j = 0, option; option = options[j]; ++j) {
          if (!idle || idle.timeRemaining() <= 0) {
            const p = new Promise(resolve => window.requestIdleCallback(o => resolve(o)));
            idle = await p;
            if (!canary.parentNode) { return; }
          }

          // TODO: If a user has allowed it, render all emojis (even invalid) anyway.
          if (!modifier.isExpectedLength(option)) {
            return;
          }
          if (!buttons) {
            // create if we haven't already got it
            buttons = createOptionsButtons(name);
          }
          const button = createButton(buttons, option);
          button.dataset['word'] = name;
        };
      };

    };

    document.body.classList.toggle('has-chooser', buttonArray.length > 0);  // for diversity
    if (results) {
      const p = render();
      p.then(_ => {
        document.body.classList.toggle('has-chooser', buttonArray.length > 0);
      }).catch(e => console.warn('couldn\'t render emoji', e));
    }
  };

  // set global callback for show
  provider.callback(show);

  // handler for a prefix search
  input.addEventListener('query', ev => {
    query = ev.detail;
    provider.request(query.text, query.prefix);
  });

  // request an autocomplete, the user has just kept typing
  input.addEventListener('request', ev => {
    const word = simplifyWord(ev.detail);
    let choice = null;

    (savedResults || []).some(result => {
      if (result.name !== word) { return false; }
      choice = result.options[0];
      return true;
    });

    if (choice) {
      const detail = {choice, word};
      input.dispatchEvent(new CustomEvent('emoji', {detail}));
    }
  });
}(typer, chooser));
