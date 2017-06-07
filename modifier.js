
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
 * @return whether the passed rune is a basic emoji person gender: Man or Woman
 */
function isPersonGender(p) {
  return p === 0x1f468 || p === 0x1f469;
}

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
 * True if the standard "female" icon can be varied with a diversity modifier. This is the basic
 * level of emoji diversity support, but doesn't imply support for all the professions.
 *
 * @type {boolean}
 */
modifier.basicDiversity = (measureText('\u{1f468}\u{1f3fb}') === 1);

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
    gender: {
      neutral: false,
      single: false,
      double: false,
    },
  };
  const points = jsdecode(s);

  // early pass for gender: look for M/F heads
  for (let i = 0; points[i]; ++i) {
    // walk ZWJ run
    let zwj = false;
    let family = false;
    let genderable = 0;
    const first = points[i];
    zwj:
    for (;;) {
      const p = points[i];
      if (isPersonGender(p)) {
        // found another M/F, which can be gendered
        ++genderable;
      } else if (p === 0x1f476 || p === 0x1f466 || p === 0x1f467) {
        // found a baby/boy/girl, which implies this run is a Family
        family = true;
      } else if (p === 0x2640 || p === 0x2642) {
        if (zwj) {
          // found a gender modifier, and already a zwj, so this is probably genderable
          // nb. this allows gendering of "already unsupported", since we don't measure it
          out.gender.single = true;
          out.gender.neutral = true;
        }
      }

      // search for next char in zwj, if any
      let count = 1;
      for (;;) {
        const check = points[i+count];
        if (check === 0x200d) {
          i += ++count;
          zwj = true;
          continue zwj;
        } else if (isDiversitySelector(check) || isVariationSelector(check)) {
          ++count;
          continue;
        }
        break zwj;
      }
      throw new Error('should not get here');
    }

    if (genderable) {
      if (genderable >= 2) {
        out.gender.double = true;
      }
      out.gender.single = true;
    }

    if (zwj) {
      // if this has an initial, single gender and it's not a family, it's diversity-able (it's a
      // profession- and if the profession isn't supported, the male/female on left still is)
      // nb. this relies on vendors not implementing more ZWJ'ed sequences with genders
      const firstIsPersonGender = isPersonGender(first);
      if (modifier.basicDiversity && genderable === 1 && !family && firstIsPersonGender) {
        out.diversity = true;
      }
      if (firstIsPersonGender) {
        // we know everything already
        continue;
      }
    }

    // nb. skip low emojis (everything below Emoji_Modifier_Base) and male/female signs
    if (unlikelyModifierBase(first)) { continue; }

    // do dumb checks
    const candidate = String.fromCodePoint(first);
    if (!out.diversity && measureText(candidate + '\u{1F3FB}') === 1) {
      out.diversity = true;
    }
    if (!out.gender.neutral && measureText(candidate + '\u{200d}\u{2640}\u{fe0f}') === 1) {
      out.gender.neutral = true;
      out.gender.single = true;
    }
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
  if (modifier.gender) {
    // TODO: allow combination of 'mf' or empty string for neutral
  }
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

      if (modifier.gender && isPersonGender(p)) {
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