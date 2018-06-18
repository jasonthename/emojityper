
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
context.font = '1px "Courier New", monospace';  // Windows needs "Courier New", monospace fails

/**
 * @param {string} string to measure
 * @return {number} length of text in monospace units
 */
const measureText = (function() {
  let cache = {};
  let count = 0;

  return (s) => {
    let result = cache[s];
    if (result === undefined) {
      cache[s] = result = context.measureText(s).width;
      if (++count > 4000) {
        // nb. at June 2017, there's about ~1,800 emojis including variations, so this number is
        // probably greater than we'll ever use: still, empty if it's too big
        cache = {};
        count = 0;
      }
    }
    return result;
  };
}());

/**
 * @type {boolean} whether this platform probably has fixed width emoji
 */
const fixedWidthEmoji = Boolean(/Mac|Android|iP(hone|od|ad)/.exec(navigator.platform));

/**
 * @param {string} string to measure
 * @return {boolean} whether this is a single emoji long
 */
const isSingle = (function() {
  const debugMode = window.location.search.indexOf('debug') !== -1;

  // get a baseline emoji width: this is the well-supported 'FACE WITH TEARS OF JOY'
  const emojiWidth = measureText('\u{1f602}');
  if (fixedWidthEmoji) {
    if (debugMode) {
      console.info('fixed emoji width is', emojiWidth, 'for \u{1f602}');
      return (s) => {
        const ok = measureText(s) === emojiWidth;
        if (!ok) {
          console.debug('isSingle can\'t render', s, 'width', measureText(s));
        }
        return ok;
      };
    }
    // great! We can quickly check this!
    return (s) => measureText(s) === emojiWidth;
  }

  const wm = window.measurer;
  const invalidWidth = context.measureText('\u{ffffd}').width;
  const characterWidth = context.measureText('a').width;
  if (debugMode) {
    console.info('invalid char has width', invalidWidth, 'ascii char has width', characterWidth);
    return (s, shouldEqual) => {
      wm.textContent = s;
      console.debug('isSingle', s, 'has height', wm.offsetHeight)
      if (wm.offsetHeight !== 1) {
        return false;  // browser has wrapped
      }

      const width = measureText(s);
      const expected = measureText(shouldEqual || s);
      console.debug('isSingle', s, 'has width', width, 'should equal', expected);
      return (width !== invalidWidth && width !== characterWidth && width === expected);
    }
  }

  return (s, expected) => {
    wm.textContent = s;
    if (wm.offsetHeight !== 1) {
      return false;  // browser has wrapped
    }
    const width = measureText(s);
    const expected = measureText(shouldEqual || s);
    return (width !== invalidWidth && width !== characterWidth && width === expected);
  };
}());

/**
 * Is this string rendering correctly as an emoji or sequence of emojis? On variable width
 * platforms, this can take O(n).
 *
 * This is only used by emoji returned by the API, which we know are valid, and have no gender
 * or diversity markers.
 *
 * @param {string} string to check
 * @return {boolean} whether this is probably an emoji
 */
export const isExpectedLength = (function() {
  // FIXME: This treats ZWJ'ed characters that aren't a single char as invalid. Maybe it's not
  // worth worrying, but instead just checking that all the points are valid emoji.

  if (fixedWidthEmoji) {
    // use 'FACE WITH TEARS OF JOY'
    const emojiWidth = measureText('\u{1f602}');
    return (s) => {
      // emojis could be _smaller_ than expected, but not larger- and not random non-unit widths
      const points = jsdecode(s);
      const chars = splitEmoji(points);

      // count flags, reduce expected by / 2
      const flags = chars.reduce((total, char) => total += isFlagPoint(char[0].point) ? 1 : 0, 0);
      const expectedLength = chars.length - Math.ceil(flags / 2);

      const width = measureText(s) / emojiWidth;

      // does this have non-emoji characters in it?
      if (Math.floor(width) !== width) { return false; }

      // otherwise, as long as we're equal or smaller
      return width <= expectedLength;
    };
  }

  return (s) => {
    const points = jsdecode(s);
    const chars = splitEmoji(points);
    const clen = chars.length;
    for (let i = 0; i < clen; ++i) {
      const char = chars[i];
      if (isFlagPoint(char[0].point)) {
        // Since we have to check individual chars, it's hard to know whether flags are supported.
        // Assume any flag point is fine.
        continue;
      }
      // measure this particular point and ensure it's single.
      const buf = [];
      char.forEach(({point, suffix, attach}, i) => {
        if (i && !attach) {
          buf.push(0x200d);
        }
        buf.push(point);
        suffix && buf.push(suffix);
      });
      const s = String.fromCodePoint(...buf);
      if (!isSingle(s)) {
        return false;
      }
    }

    return true;
  };
}());

/**
 * True if the standard "female" icon can be varied with a diversity modifier. This is the basic
 * level of emoji diversity support, but doesn't imply support for all the professions.
 *
 * @type {boolean}
 */
const basicDiversity = (measureText('\u{1f468}\u{1f3fb}') === measureText('\u{1f468}'));

/**
 * @param {number} p
 * @return {boolean} whether the passed rune is a gender character
 */
function isPointGender(p) {
  return p === 0x2640 || p === 0x2642;
}

/**
 * @param {number} p
 * @return {boolean} whether the passed rune is a basic emoji person gender: Man or Woman
 */
function isPersonGender(p) {
  return p === 0x1f468 || p === 0x1f469;
}

/**
 * @param {number} p
 * @return {boolean} whether this is a subordinate member of a family sequence: boy/girl/baby
 */
function isFamilyMember(p) {
  return p === 0x1f476 || p === 0x1f466 || p === 0x1f467;
}

/**
 * @param {number} p
 * @return {boolean} whether the passed rune is a Variation_Selector
 */
function isVariationSelector(p) {
  return (p >= 0xfe00 && p <= 0xfe0f) || (p >= 0xe0100 && p <= 0xe01ef);
}

/**
 * @param {number} p
 * @return {boolean} whether the passed rune is a diversity selector (one of five skin tones)
 */
function isDiversitySelector(p) {
  return p >= 0x1f3fb && p <= 0x1f3ff;
}

/**
 * @param {number} p
 * @return {boolean} whether the passed rune is one of A-Z for flags
 */
function isFlagPoint(p) {
  return p >= 0x1f1e6 && p <= 0x1f1ff;
}

/**
 * @param {number} p
 * @return {boolean} whether the passed rune is probably not a modifier base
 */
function unlikelyModifierBase(p) {
  return p < 0x261d || isPointGender(p) || isVariationSelector(p) || isDiversitySelector(p) ||
      isFlagPoint(p);
}

/**
 * Decodes a JavaScript string into Unicode code points.
 *
 * @param {string} s to decode
 * @return {!Array<number>} code points
 */
export function jsdecode(s) {
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

/**
 * Returns details about a character and whether it can be gender flipped to a single or neutral
 * gender. This contains emojis which, due to historical emoji reasons, aren't officially versions
 * of each other: e.g., Santa and Mrs. Claus, or Old {Man,Woman,Adult}.
 *
 * @param {number} point to look up in the other gender flips table
 * @return {{single: boolean, neutral: boolean, points: {f: number, m: number, n: number}}?}
 */
const genderFlip = (function() {
  // TODO: covers F/M/neutral, but _not_ mixed (e.g. holding hands => no m/f combo)
  const list = [
    0x1f936, 0x1f385, 0,        // mrs. claus, santa
    0x1f483, 0x1f57a, 0,        // dancers
    0x1f470, 0x1f935, 0,        // bride, man in tuxedo
    0x1f467, 0x1f466, 0x1f9d2,  // girl, boy, child
    0x1f475, 0x1f474, 0x1f9d3,  // old {woman,man,adult}
    0x1f46d, 0x1f46c, 0,        // women/men holding hands
    0x1f478, 0x1f934, 0,        // princess, prince
  ];

  // build map with raw data only
  const all = new Map();
  for (let i = 0; i < list.length; i += 3) {
    const data = {
      points: {f: list[i], m: list[i+1], n: list[i+2]},
    };
    for (let j = 0; j < 3; ++j) {
      const v = list[i+j];
      if (v) {
        if (all.has(v)) {
          throw new Error('duplicate in gender list: ' + v);
        }
        all.set(v, data);
      }
    }
  }

  // return helper
  return (point) => {
    const out = all.get(point) || null;
    if (out && out.single === undefined) {
      // do the heavy lifting only when first fetched
      out.single = isSingle(String.fromCodePoint(out.points.f)) &&
          isSingle(String.fromCodePoint(out.points.m));
      out.neutral = out.points.n && isSingle(String.fromCodePoint(out.points.n));
    }
    return out;
  };
}());

/**
 * Splits a single emoji into raw characters, removing variants or diversity modifiers. Each
 * sub-array represents a character previously split by ZWJs.
 *
 * FIXME(samthor): "attach" is a temporary hack to allow keycaps.
 *
 * @param {!Array<number>} points
 * @return {!Array<!Array<{point: number, suffix: number, attach: boolean}>>}
 */
export function splitEmoji(points) {
  if (!points.length) {
    return [];
  }
  let curr = [{point: points[0], suffix: 0, attach: false}];
  const out = [curr];

  // TODO: doesn't deal with flags or regional letters
  // flags are weird: U + N + A, for instance, will render the Namibia flag where the UN flag is
  // not supported (but the UN flag where it is)- taking the left-most valid code
  // NOTE: the regional flag letters are seen as _emoji_ on their own, at least on Mac.

  for (let i = 1; i < points.length; ++i) {
    const check = points[i];

    if (isFlagPoint(curr[curr.length-1].point)) {
      // previous was a flag, create a new one
    } else if (isDiversitySelector(check) || isVariationSelector(check)) {
      // store in suffix
      curr[curr.length-1].suffix = check;
      continue;
    } else if (check === 0x20e3) {
      // keycap, push onto last
      curr.push({point: check, suffix: 0, attach: true});
      continue;
    } else if (check === 0x200d) {
      // push next char onto curr
      const next = points[++i];
      next && curr.push({point: next, suffix: 0, attach: false});
      continue;
    }

    // new character, reset
    curr = [{point: check, suffix: 0, attach: false}];
    out.push(curr);
  }
  return out;
}

/**
 * Analyses or modifes an emoji string for modifier support: diversity and gender.
 *
 * This might be O(n), including the cost of measuring every individual character via measureText.
 *
 * @param {string} s
 * @param {{tone: undefined|number, gender: undefined|string}=} opt_op
 * @return {out: (string|undefined), tone: boolean, gender: {single: boolean, double: boolean, neutral: boolean}}
 */
export function modify(s, opt_op) {
  const stats = {tone: false, gender: {single: false, double: false, neutral: false}};
  if (!s) {
    return stats;
  }
  const points = jsdecode(s);

  // split out gender modifiers and other variations with splitEmoji, walk chars
  const chars = splitEmoji(points);
  const record = (opt_op ? [] : null);
  chars.some((char, i) => {
    const first = char[0].point;
    let genderable = 0;
    let family = false;

    // search for existing gender characters
    char.forEach((ch) => {
      const p = ch.point;
      if (isPointGender(p)) {
        // we can remove or replace the point
        stats.gender.single = true;
        stats.gender.neutral = true;
      } else if (isPersonGender(p)) {
        // easily swappable person
        stats.gender.single = true;
        if (++genderable >= 2) {
          stats.gender.double = true;
        }
      } else if (isFamilyMember(p) && genderable) {
        // this run is a family (child and already has parent), so it can't be made diverse
        family = true;
      } else {
        // look for potential gender flips
        const flip = genderFlip(p);
        if (flip) {
          stats.gender.single |= flip.single;
          stats.gender.neutral |= flip.neutral;
        }
      }
    });

    // check for professions ('non family person'): single initial person gender, not a family
    const isSinglePerson =
        genderable ? (isPersonGender(first) && genderable === 1 && !family) : undefined;
    if (isSinglePerson) {
      stats.tone = basicDiversity;
    }
    if (record) {
      // true: is a 'non family person', aka profession or disembodied head (diversity OK)
      // false: is a family or other combined group of persons (no diversity)
      // undefined: something else
      record[i] = isSinglePerson;
    }

    // check for early exhaustive answer
    if ((stats.tone || !basicDiversity) && stats.gender.neutral) {
      // ... don't finish 'some' early if we're recording gender data
      return !record && stats.gender.single && stats.gender.double;
    }

    // skip if profession, low emojis (everything below Emoji_Modifier_Base) and male/female signs
    if (isSinglePerson === false || unlikelyModifierBase(first)) { return; }

    // do slow measure checks
    // TODO: can we use \p{Modifier_Base} as a faster check than measureText for +ve case?
    const candidate = String.fromCodePoint(first);
    if (basicDiversity && !stats.tone && isSingle(candidate + '\u{1f3fb}')) {
      stats.tone = true;
    }
    if (!stats.gender.neutral && isSingle(candidate + '\u{200d}\u{2640}\u{fe0f}', candidate)) {
      stats.gender.neutral = true;
      stats.gender.single = true;
    }
  });

  // early out without op
  if (!opt_op) {
    return stats;
  }

  // gender helper: modifies passed character to apply next gender (or returns new ch)
  const nextGenderPoint = (function() {
    const g = opt_op.gender || '';
    let previousMaster;
    let index;
    return (master, opt_point, opt_allowOtherFlip) => {
      if (previousMaster === undefined || master !== previousMaster) {
        previousMaster = master;
        index = 0;
      } else {
        ++index;
      }
      const next = g ? g[index % g.length] : '';
      const point = opt_point || 0;
      if (isPersonGender(point)) {
        // if this is a person, return the alternative person (or make no change)
        return next ? (next === 'm' ? 0x1f468 : 0x1f469) : point;
      } else if (!point || isPointGender(point)) {
        // if this is a point, return the alternative point (or clear)
        return next ? (next === 'm' ? 0x2642 : 0x2640) : 0;
      } else if (opt_allowOtherFlip) {
        // do other gender flips: note that some of these have F/M/N, but not all have N
        const flip = genderFlip(point);
        if (flip) {
          if (!next && flip.neutral) {
            return flip.points.n;
          } else if (next && flip.single) {
            return next === 'm' ? flip.points.m : flip.points.f;
          }
        }
      }
      // didn't consume anything
      --index;
      return point;
    };
  }());

  // walk over all chars, apply change
  const out = chars.map((char, i) => {
    const points = [];  // used as nonce, declare first
    const isSinglePerson = record[i];
    const first = char[0].point;

    if (opt_op.gender !== undefined) {
      // replace/remove existing male/female characters
      // nb. this removes orphaned gender point characters
      const allowOtherFlip = (isSinglePerson === undefined);  // not for family/profession
      char.forEach((ch) => ch.point = nextGenderPoint(points, ch.point, allowOtherFlip));

      // under various conditions, add a gender modifier to a single point
      if (isSinglePerson === undefined && char.length === 1 && !isPointGender(first)) {
        const genderPoint = nextGenderPoint(points);
        const c = String.fromCodePoint(first);
        if (genderPoint && isSingle(c + '\u{200d}\u{2640}\u{fe0f}', c)) {
          char.push({suffix: 0xfe0f, point: genderPoint});
        }
      }
    }

    // apply diversity
    if (opt_op.tone !== undefined) {
      char.forEach((ch, i) => {
        if (isDiversitySelector(ch.suffix)) {
          // always tweak existing diversity modifiers
          ch.suffix = opt_op.tone;
        } else if (i === 0 && basicDiversity && isSinglePerson !== false) {
          // if it's the first point in a non-family, try to apply diversity
          if (isSinglePerson || isSingle(String.fromCodePoint(first) + '\u{1f3fb}')) {
            ch.suffix = opt_op.tone;
          }
        }
      });
    }

    // flatten into actual codepoints again
    char.forEach((ch) => {
      if (ch.point) {
        points.length && points.push(0x200d);
        points.push(ch.point);
        ch.suffix && points.push(ch.suffix);
      }
    });
    return points;
  }).reduce((all, points) => all.concat(points), []);

  stats.out = String.fromCodePoint(...out);
  return stats;
};
