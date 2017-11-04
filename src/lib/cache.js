
import {isExpectedLength as actualIsExpectedLength} from './modifier.js';

const prefix = '-ok_';
const ls = window.localStorage;

/**
 * As per the real isExpectedLength function, but caches successful results.
 *
 * @param {string} string to check
 * @return {boolean} whether this is probably an emoji
 */
export default function isExpectedLength(emoji) {
  const key = prefix + emoji;
  if (ls[key]) {
    return true;
  }

  const out = actualIsExpectedLength(emoji);
  if (out) {
    ls[key] = 't';  // localStorage is strings only
  }
  return out;
}
