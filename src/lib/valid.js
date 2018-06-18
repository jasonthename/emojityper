
/**
 * @fileoverview The validator runs constantly and validates emoji rendering.
 */

import {isExpectedLength} from './modifier.js';
import Worker from './worker.js';

const prefix = '-ok_';
const ls = window.localStorage;
const known = new Map();

function runner(emoji) {
  const key = prefix + emoji;
  if (ls[key]) {
    return true;
  }

  const out = isExpectedLength(emoji);
  known.set(emoji, out);
  if (out) {
    ls[key] = 't';  // use dummy small string
  }
  return out;
}

const worker = new Worker(runner);

/**
 * As per isExpectedLength, but caches successful results.
 *
 * @param {string} string to check
 * @return {!Promise<boolean>} whether this is probably an emoji
 */
export async function valid(emoji) {
  const immediate = known.get(emoji);
  if (immediate !== undefined) {
    return immediate;
  }
  return worker.task(emoji);
}

/**
 * @param {!Array<!Array<string>>} options
 * @param {function(?{name: string, emoji: string})} callback
 */
export async function findValidMatch(options, callback) {
  let calledWithDelay = false;

  for (let i = 0; i < options.length; ++i) {
    const row = options[i];
    for (let j = 1; j < row.length; ++j) {
      const emoji = row[j];
      let result = known.get(emoji) || ls[prefix + emoji];
      if (result === undefined) {
        // we have to wait for the runner, so call with a delay
        if (!calledWithDelay) {
          console.info('not sure about', emoji, 'calling callback');
          callback(null);
          calledWithDelay = true;
        }
        result = await worker.task(emoji);
      }

      if (result) {
        return callback({name: row[0], emoji});
      }
    }
  }

  if (!calledWithDelay) {
    callback(null);
  }
}

// finds the best suggestion and tells the typer
let suggestInvoke = 0;
async function findSuggest(q) {
  typer.dispatchEvent(new CustomEvent('suggest', {detail: null}));
  const localSuggestInvoke = ++suggestInvoke;

  let suggest = null;
  for (let i = 0; i < previousResults.length; ++i) {
    const r = previousResults[i];
    if (suggest === null && r[0].startsWith(q)) {
      if (await valid(r[1])) {
        suggest = r;
      }
    } else if (r[0] === q) {
      if (await valid(r[1])) {
        // if we have an _exact_ match, always use it
        suggest = r;
        break;
      }
    }
  }
  if (localSuggestInvoke !== suggestInvoke) {
    return;
  }
  typer.dispatchEvent(new CustomEvent('suggest', {detail: suggest}));
}