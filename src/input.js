
import * as modifier from './lib/modifier.js';

function datasetSafeDelete(el, ...keys) {
  const d = el.dataset;
  keys.forEach(key => {
    if (key in d) {
      delete d[key];
    }
  });
}

// word focus handler
function upgrade(el) {
  const isWordCode = code => {
    // FIXME: turns out matching non-emoji is hard
    // TODO: this RegExp _might_ work but it needs transpiling-
    // new RegExp(/(?:[\p{Letter}\p{Number}\p{Punctuation}](?!\u{fe0f}?\u{20e3}))+/u);
    return code < 5000 && code != 32;
  };

  const helper = document.createElement('div');
  helper.className = 'overflow-helper';
  el.parentNode.insertBefore(helper, el);

  const underline = document.createElement('div');
  underline.className = 'underline';
  helper.appendChild(underline);

  const sizer = document.createElement('div');
  sizer.className = 'sizer';
  helper.appendChild(sizer);

  // hide underline until load: the font used might not be ready, so it's probably out of whack
  if (document.readyState !== 'complete') {
    underline.classList.add('loading');
    window.addEventListener('load', ev => {
      renderLine();
      underline.classList.remove('loading');
    });
  }

  const renderLine = _ => {
    if (el.dataset.from === undefined) {
      underline.hidden = true;
      return false;
    }
    const [from, to] = [+el.dataset.from, +el.dataset.to];

    // otherwise, record and draw the line
    const indent = 15;  // FIXME: from CSS, to match `text-indent`
    sizer.textContent = el.value.substr(0, from);
    const left = (from ? sizer.getBoundingClientRect().width : indent);

    sizer.textContent = el.value.substr(from, to - from);
    const width = sizer.getBoundingClientRect().width - indent;

    if (width < 0 && !document.getElementById('less')) {
      // nb. this seems to happen in dev with lesscss
      console.warn('invalid sizer width', width, 'for text', sizer.textContent);
    }

    underline.hidden = width <= 0;
    underline.style.left = left + 'px';
    underline.style.width = width + 'px';
    underline.style.transform = 'translateX(-' + el.scrollLeft + 'px)';
  };

  // force selection
  const setRange = (from, to) => {
    if (from >= to) {
      datasetSafeDelete(el, 'from', 'to', 'prefix', 'word', 'focus');
      underline.hidden = true;
      return false;
    }
    [el.dataset.from, el.dataset.to] = [from, to];
    el.dataset['focus'] = el.value.substr(from, to - from);
    renderLine();
    return true;
  };

  // state/handler keep track of the current focus word (plus scroll position, if input is big)
  const initialLength = el.value.length;
  const state = {start: initialLength, end: initialLength, value: undefined};
  const changeHandler = permitNextChange => {
    if (permitNextChange !== false &&
        el.selectionStart === state.start &&
        el.selectionEnd === state.end &&
        el.value === state.value) {
      return true;  // already at this state
    }
    [state.start, state.end] = [el.selectionStart, el.selectionEnd];
    if (state.value !== el.value) {
      el.dispatchEvent(new CustomEvent('value', {detail: el.value}));
      state.value = el.value;
    }

    // range selection, magic
    if (state.start !== state.end) {
      datasetSafeDelete(el, 'prefix', 'word');

      setRange(state.start, state.end);

      underline.classList.add('range');
      el.classList.add('range');
      return false;
    }
    underline.classList.remove('range');
    el.classList.remove('range');

    // calculate from/to locally
    let from = state.start;
    let to = state.start;

    // are we at the end (only have spaces until end)?
    const isAtEnd = !el.value.substr(state.end).trim();
    const isNotWordAfter = isAtEnd || !isWordCode(el.value.charCodeAt(state.end));

    if (isNotWordAfter) {
      for (; to > 0; --to) {
        if (el.value.charCodeAt(to - 1) !== 32) {
          break;
        }
      }
      if (to < from) {
        from = to;
      }
    }

    // walk backwards while the previous character is a word
    for (; from > 0; --from) {
      if (!isWordCode(el.value.charCodeAt(from - 1))) {
        break;
      }
    }

    // walk forwards while the next char is not a space
    for (; to < el.value.length; ++to) {
      if (!isWordCode(el.value.charCodeAt(to))) {
        break;
      }
    }

    // if it's invalid, but there's not a word after, and we were permitted, ignore
    if (from >= to && isNotWordAfter && permitNextChange) { return; }
    if (setRange(from, to)) {
      // if the range was valid, update the prefix/focus but delete the word (in typing state)
      el.dataset['focus'] = el.dataset['prefix'] = el.value.substr(from, to - from);
      datasetSafeDelete(el, 'word');
    }
  };

  // runs change handler and emits the 'word' event as appropriate
  const mergedEventHandler = (events, permitNextChange) => {
    // if there was a focus event, don't let the browser take over: reset previous known good
    if (events.has('focus')) {
      // only if it wasn't a range selection (otherwise clicking back retains range, weird)
      if (state.start === state.end) {
        // TODO: this sets on initial load, even though it probably doesn't need to
        [el.selectionStart, el.selectionEnd] = [state.start, state.end];
      }
    }

    // run change handler: if true, nothing changed
    if (changeHandler(permitNextChange)) { return; }

    // send query: prefix or whole-word
    let text = el.dataset.prefix || el.dataset.word || null;
    const detail = {text, prefix: 'prefix' in el.dataset, focus: el.dataset.focus};
    el.dispatchEvent(new CustomEvent('query', {detail}));
  };

  // dedup listeners on a rAF
  let permitNextChange;  // FIXME: global-ish scope is ugly
  (function() {
    let frame;
    let events = new Set();  // records the events that occured to cause this
    const dedup = ev => {
      if (!frame) {
        permitNextChange = undefined;
        events.clear();
        frame = window.requestAnimationFrame(_ => {
          frame = null;
          mergedEventHandler(events, permitNextChange);
        });
      }
      ev && events.add(ev.type);
    };

    // lots of listeners for a million different change reasons
    const rest = 'change keydown keypress focus click mousedown select input';
    rest.split(/\s+/).forEach(event => el.addEventListener(event, dedup));
    dedup();

    el.addEventListener('mousemove', ev => {
      if (ev.which) {
        dedup();
      }
    })

  }());

  // on blur, after a backspace, Chrome moves the start/end selection: fix it
  el.addEventListener('blur', ev => {
    if (el.selectionStart !== state.start || el.selectionStart !== state.end) {
      [el.selectionStart, el.selectionEnd] = [state.start, state.end];
    }
  });

  // add a non-deduped keydown handler, to run before others and intercept space
  el.addEventListener('keydown', ev => {
    switch (ev.key) {
    case 'Escape':
      permitNextChange = false;  // force next change
      break;

    case ' ':
      if (el.dataset.prefix && el.selectionStart === +el.dataset.to) {
        el.dispatchEvent(new CustomEvent('request', {detail: el.dataset.prefix}));
      }

      // TODO: do this to prevent actually space being hit (as "Sam Prefers")
      //ev.preventDefault();
      break;
    }
  });

  // add a non-deduped keyup handler, for space on mobile browsers
  el.addEventListener('keyup', ev => {
    if (ev.keyCode === 229 || !ev.keyCode) {
      // look for a space before whatever was entered.
      const v = el.value.substr(el.selectionStart - 1, 1);
      if (v === ' ' && el.dataset.prefix) {
        el.dispatchEvent(new CustomEvent('request', {detail: el.dataset.prefix}));
      }
    }
  });

  // dedup re-rendering calls
  (function() {
    let frame;
    const dedupRenderLine = _ => {
      if (!frame) {
        frame = window.requestAnimationFrame(_ => {
          frame = null;
          renderLine();
        });
      }
    };
    window.addEventListener('resize', dedupRenderLine);
    el.addEventListener('wheel', dedupRenderLine, {passive: true});
  }());

  // replace helper
  const replaceFocus = call => {
    if (el.dataset.from === undefined || el.dataset.to === undefined) { return false; }

    const [from, to] = [+el.dataset.from, +el.dataset.to];
    const value = el.value.substr(from, to - from);
    let [start, end] = [typer.selectionStart, typer.selectionEnd];

    const update = call(value);
    if (update == null) { return false; }
    typer.value = typer.value.substr(0, from) + update + typer.value.substr(to);

    const drift = where => {
      if (where > to) {
        // after the update
        where = where - (to - from) + update.length;
      } else if (where > from) {
        // during the update
        where = from + update.length;
      } else {
        // do nothing, was before
      }
      return where;
    };

    typer.focus();
    typer.dispatchEvent(new CustomEvent('change'));  // nb. updates from/to (from won't change)
    // pretend we were like this all along
    [state.start, state.end] = [typer.selectionStart, typer.selectionEnd] = [drift(start), drift(end)];

    permitNextChange = true;
    setRange(from, from + update.length);
    return true;
  };

  // handle 'modifier' event: apply modifiers to the focus word, if any
  el.addEventListener('modifier', ev => {
    const arg = {[ev.detail.type]: ev.detail.code};
    replaceFocus(value => modifier.modify(value, arg).out || '');
  });

  // handle 'emoji' event: if there's a current focus word, then replace it with the new emoji \o/
  el.addEventListener('emoji', ev => {
    const emoji = ev.detail.choice;
    if (!replaceFocus(_ => emoji)) { return; }

    // if this was a prefix match, now it's a word match (the word masks the emoji)
    el.dataset['word'] = ev.detail.word || el.dataset['prefix'];
    datasetSafeDelete(el, 'prefix');
  });
}

upgrade(typer);
