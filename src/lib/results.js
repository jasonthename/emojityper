
/**
 * Remove duplicate entries from the passed array, only from the 1th index.
 *
 * @param {!Array<string>}
 * @return {!Array<string>}
 */
function removeDuplicates(row) {
  const found = new Set();
  return row.filter((item, i) => {
    if (i !== 0) {
      if (found.has(item)) { return false; }
      found.add(item);
    }
  });
}

/**
 * Merge the given results arrays. These will both be in the form of:
 *   [[name, emoji1, emoji2,....], ...]
 *
 * The first argument will be updated with the data from the second argument.
 *
 * @param {!Array<!Array<string>>} existing
 * @param {!Array<!Array<string>>} update
 */
export function merge(existing, update) {
  const lookup = {};
  existing.forEach((row) => lookup[row[0]] = row);

  update.forEach((row) => {
    const existingRow = lookup[row[0]];
    if (!existingRow) {
      lookup[row[0]] = row;  // in case there's dup data
      existing.push(row);
      return;
    }

    // otherwise, just append all new data
    lookup[row[0]] = removeDuplicates(existingRow.concat(row.slice(1)));
  });
}