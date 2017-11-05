
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
export default async function valid(emoji) {
  const immediate = known.get(emoji);
  if (immediate !== undefined) {
    return immediate;
  }
  return worker.task(emoji);
}
