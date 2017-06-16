
const modifier = {};

/**
 * @param {string} string to measure
 * @return {number} length of text in monospace units
 */
const measureText = (function() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = '100px monospace';

  // get a baseline emoji width: this is the well-supported 'FACE WITH TEARS OF JOY'
  const emojiWidth = context.measureText('\u{1f602}').width;
  const invalidWidth = context.measureText('\u{ffffd}').width;
  if (emojiWidth === invalidWidth) {
    console.warn('emoji likely not supported, \u{1f602} appears invalid')
  }

  let cache = {};
  let count = 0;

  return s => {
    let result = cache[s];
    if (result === undefined) {
      const real = context.measureText(s).width / 100;
      cache[s] = result = real / emojiWidth;
      console.debug('emoji', s, 'has width', real, 'adjusted', result);
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
 * @param {string} string to measure
 * @return {boolean} whether this is a single char long (and probably a single emoji)
 */
const isSingle = s => measureText(s) === 1;

/**
 * The width of the letter 'a' in monospace.
 *
 * @type {number}
 */
modifier.characterWidth = measureText('a');

/**
 * The width of a basic emoji character. Note that only Mac uses a fixed width for all emoji.
 *
 * @type {number}
 */
modifier.emojiWidth = measureText('\u{1f602}');

/**
 * The width of the 'invalid' emoji character (typically a box).
 *
 * @type {number}
 */
modifier.invalidWidth = measureText('\u{ffffd}');


(function() {
  // TODO: do something with this information
  if (modifier.invalidWidth === modifier.emojiWidth) {
    console.warn('basic emoji has invalid width, emoji probably not supported');
  }
  console.info('invalid width', modifier.invalidWidth, 'char width', modifier.characterWidth, 'emojiWidth', modifier.emojiWidth);
}());

/**
 * True if the standard "female" icon can be varied with a diversity modifier. This is the basic
 * level of emoji diversity support, but doesn't imply support for all the professions.
 *
 * @type {boolean}
 */
modifier.basicDiversity = (measureText('\u{1f468}\u{1f3fb}') === measureText('\u{1f468}'));

/**
 * Is this string rendering correctly as an emoji or sequence of emojis on a Mac?
 *
 * @param {string} string to check
 * @return {boolean} whether this is probably an emoji
 */
function isExpectedLengthFixedEmoji(s) {
  // emojis could be _smaller_ than expected, but not larger- and not random non-unit widths
  const points = jsdecode(s);
  const expectedLength = splitEmoji(points).length;
  const width = measureText(s);

  // does this have non-emoji characters in it?
  if (Math.floor(width) !== width) { return false; }

  // otherwise, as long as we're equal or smaller
  return width <= expectedLength;
}

/**
 * Is this string rendering correctly as an emoji or sequence of emojis?
 *
 * @param {string} string to check
 * @return {boolean} whether this is probably an emoji
 */
const isExpectedLength = isExpectedLengthFixedEmoji;

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
 * @return {boolean} whether the passed rune is probably not a modifier base
 */
function unlikelyModifierBase(p) {
  return p < 0x261d || isPointGender(p) || isVariationSelector(p) || isDiversitySelector(p) ||
      (p >= 0x1f1e6 && p <= 0x1f1ff);  // flags
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
    0x1f467, 0x1f466, 0,        // girl, boy
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
  return point => {
    const out = all.get(point) || null;
    if (out && out.single === undefined) {
      // do the heavy lifting only when first fetched
      out.single = measureText(String.fromCodePoint(out.points.f, out.points.m)) === 2;
      out.neutral = out.points.n && isSingle(String.fromCodePoint(out.points.n));
    }
    return out;
  };
}());

/**
 * Splits a single emoji into raw characters, removing variants or diversity modifiers. Each
 * sub-array represents a character previously split by ZWJs.
 *
 * @param {!Array<number>} points
 * @return {!Array<!Array<{point: number, suffix: number}>>}
 */
function splitEmoji(points) {
  if (!points.length) {
    return [];
  }
  let curr = [{point: points[0], suffix: 0}];
  const out = [curr];

  for (let i = 1; i < points.length; ++i) {
    const check = points[i];
    if (isDiversitySelector(check) || isVariationSelector(check)) {
      // store in suffix
      curr[curr.length-1].suffix = check;
    } else if (check === 0x200d) {
      // push next char onto curr
      const next = points[++i];
      next && curr.push({point: next, suffix: 0});
    } else {
      // new character, reset
      curr = [{point: check, suffix: 0}];
      out.push(curr);
    }
  }
  return out;
}

/**
 * Analyses or modifes an emoji string for modifier support: diversity and gender.
 *
 * This might be O(n), including the cost of measuring every individual character via measureText.
 *
 * @param {string} s
 * @param {{diversity: undefined|number, gender: undefined|string}=} opt_op
 * @return {out: (string|undefined), diversity: boolean, gender: {single: boolean, double: boolean, neutral: boolean}}
 */
modifier.modify = function(s, opt_op) {
  const points = jsdecode(s);
  const stats = {diversity: false, gender: {single: false, double: false, neutral: false}};

  // split out gender modifierss and other variations with splitEmoji, walk chars
  const chars = splitEmoji(points);
  const record = (opt_op ? [] : null);
  chars.some((char, i) => {
    const first = char[0].point;
    let genderable = 0;
    let family = false;

    // search for existing gender characters
    char.forEach(ch => {
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
      stats.diversity = modifier.basicDiversity;
    }
    if (record) {
      // true: is a 'non family person', aka profession or disembodied head (diversity OK)
      // false: is a family or other combined group of persons (no diversity)
      // undefined: something else
      record[i] = isSinglePerson;
    }

    // check for early exhaustive answer
    if ((stats.diversity || !modifier.basicDiversity) && stats.gender.neutral) {
      // ... don't finish 'some' early if we're recording gender data
      return !record && stats.gender.single && stats.gender.double;
    }

    // skip if profession, low emojis (everything below Emoji_Modifier_Base) and male/female signs
    if (isSinglePerson === false || unlikelyModifierBase(first)) { return; }

    // do slow measure checks
    // TODO: can we use \p{Modifier_Base} as a faster check than measureText for +ve case?
    const candidate = String.fromCodePoint(first);
    if (modifier.basicDiversity && !stats.diversity && isSingle(candidate + '\u{1f3fb}')) {
      stats.diversity = true;
    }
    if (!stats.gender.neutral && isSingle(candidate + '\u{200d}\u{2640}\u{fe0f}')) {
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
      char.forEach(ch => ch.point = nextGenderPoint(points, ch.point, allowOtherFlip));

      // under various conditions, add a gender modifier to a single point
      if (isSinglePerson === undefined && char.length === 1 && !isPointGender(first)) {
        const genderPoint = nextGenderPoint(points);
        if (genderPoint && isSingle(String.fromCodePoint(first) + '\u{200d}\u{2640}\u{fe0f}')) {
          char.push({suffix: 0xfe0f, point: genderPoint});
        }
      }
    }

    // apply diversity
    if (opt_op.diversity !== undefined) {
      char.forEach((ch, i) => {
        if (isDiversitySelector(ch.suffix)) {
          // always tweak existing diversity modifiers
          ch.suffix = opt_op.diversity;
        } else if (i === 0 && modifier.basicDiversity && isSinglePerson !== false) {
          // if it's the first point in a non-family, try to apply diversity
          if (isSinglePerson || isSingle(String.fromCodePoint(first) + '\u{1f3fb}')) {
            ch.suffix = opt_op.diversity;
          }
        }
      });
    }

    // flatten into actual codepoints again
    char.forEach(ch => {
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
