
/**
 * @param {string} string to measure
 * @return {number=} length of text in monospace units
 */
const measureText = (function() {
  if (typeof document === 'undefined') {
    return s => undefined;
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = '1px monospace';
  return s => context.measureText(s).width;
}());

/**
 * @param {number} p
 * @return whether the passed rune is a Variation_Selector
 */
function isVariationSelector(p) {
  return (p >= 0xfe00 && p <= 0xfe0f) || (p >= 0xe0100 && p <= 0xe01ef);
}

/**
 * @param {number} p
 * @return whether the passed rune is a diversity selector (one of five skin tones)
 */
function isDiversitySelector(p) {
  return p >= 0x1f3fb && p <= 0x1f3ff;
}

/**
 * @param {number} p
 * @return whether the passed rune is probably not a modifier base
 */
function unlikelyModifierBase(p) {
  return p < 0x261d || p === 0x2640 || p == 0x2642 || isVariationSelector(p) ||
      (p >= 0x1f3fb && p <= 0x1f3ff) || (p >= 0x1f1e6 && p <= 0x1f1ff);
}

/**
 * Decodes a JavaScript string into Unicode code points.
 *
 * @param {string} s to decode
 * @return {!Array<number>} code points
 */
function jsdecode(s) {
  const len = s.length;
  const points = [];

  for (let i = 0; i < len;) {
    const raw = s.charCodeAt(i++) || 0;
    if (raw < 0xd800 || raw > 0xdbff || i === len) {
      // not a high surrogate, or end of string
    } else {
      const extra = s.charCodeAt(i) || 0;
      if ((extra & 0xfc00) === 0xdc00) {
        // got a low surrogate, eat 2nd char
        ++i;
        points.push(0x10000 + (extra & 0x3ff) + ((raw & 0x3ff) << 10));
        continue;
      }
    }
    points.push(raw);
  }

  return points;
}

const modifier = {};

/**
 * Determines whether the given emoji string can be modified in terms of diversity, and/or gender.
 * At worst, this might be O(n). You've been warned. Empty strings or strings without emoji should
 * return both false.
 *
 * @param {string} s
 * @return {{diversity: boolean, gender: string}}
 */
modifier.info = function info(s) {
  const out = {
    diversity: false,
    gender: false,
  };
  const points = jsdecode(s);

  // early pass for gender: look for M/F heads
  for (let i = 0, p; p = points[i]; ++i) {
    // FIXME: these can't be neutered, report them as MF only
    // FIXME: if these appear in ZWJ, report combos: e.g., "xx" for mm, mf, fm, ff
    // FIXME: the "family" ZWJ's can't be toned anywhere: any of man, woman, boy, girl, baby
    if (p === 0x1f468 || p === 0x1f469) {
      out.gender = true;
      break;
    }
  }

  // FIXME: it would be nice to use \p{Emoji_Modifier_Base}, but it's sometimes out-of-date :(
  // either way this is O(n), ugh
  for (let i = 0, p; p = points[i]; ++i) {
    // nb. skip low emojis (everything below Emoji_Modifier_Base) and male/female signs
    if (unlikelyModifierBase(p)) { continue; }

    const candidate = String.fromCodePoint(p);
    if (!out.diversity && measureText(candidate + '\u{1F3FB}') === 1) {
      out.diversity = true;
    }
    if (!out.gender && measureText(candidate + '\u{200d}\u{2640}\u{fe0f}') === 1) {
      out.gender = true;
    }

    // FIXME: support the notion of: gender but ONLY male or female (occupations)

    if (out.diversity && out.gender) { break; }
  }

  return out;
}

/**
 * Modifies the given string to change diversity or gender. This will be slower than info(), as it
 * always walks the entire string when a change is requested.
 *
 * @param {string} s to change
 * @param {{gender: (undefined|number), diversity: (undefined|number)}} modifier points to apply
 * @return {string} the modified string
 */
modifier.apply = function apply(s, modifier) {
  // if (modifier.gender && !(modifier.gender === 0x2640 || modifier.gender == 0x2642)) {
  //   throw new Error('invalid gender: ' + modifier.gender);
  // }
  if (modifier.diversity && !isDiversitySelector(modifier.diversity)) {
    throw new Error('invalid diversity: ' + modifier.diversity);
  }

  // nothing to do, return early
  if (!('diversity' in modifier) && !('gender' in modifier)) {
    return s;
  }

  const points = jsdecode(s);
  for (let i = 0, p; p = points[i]; ++i) {
    if ((p === 0x2640 || p === 0x2642)) {
      if (modifier.gender !== undefined && points[i-1] === 0x200d) {
        const remove = isVariationSelector(points[i+1]) ? 3 : 2;
        points.splice(i-1, remove);
        i -= remove;
      }
    } else if ((p >= 0x1f3fb && p <= 0x1f3ff) && modifier.diversity !== undefined) {
      points.splice(i, 1);
      --i;
    }
  }

  // if this was just a strip operation, return early
  if (modifier.diversity || modifier.gender) {
    for (let i = 0, p; p = points[i]; ++i) {
      if (unlikelyModifierBase(p)) { continue; }

      if (modifier.gender && (p === 0x1f468 || p === 0x1f469)) {
        if (modifier.gender === 0x2640) {
          points[i] = 0x1f468;  // set to man
        }
        if (modifier.gender === 0x2642) {
          points[i] = 0x1f469;  // set to woman
        }
        continue;
      }

      const candidate = String.fromCodePoint(p);
      if (modifier.diversity && measureText(candidate + '\u{1F3FB}') === 1) {
        points.splice(i+1, 0, modifier.diversity);
        ++i;
      }
      if (modifier.gender && measureText(candidate + '\u{200d}\u{2640}\u{fe0f}') === 1) {
        if (isDiversitySelector(points[i+1])) {
          ++i;  // apply after diversity selector
        }
        points.splice(i+1, 0, 0x200d, modifier.gender, 0xfe0f);
        i += 3;
      }
    }
  }

  return String.fromCodePoint(...points);
}