
export function cacheFor(fn, limit=4000) {
  let cache = {};
  let count = 0;

  return (arg) => {
    let result = cache[arg];
    if (result === undefined) {
      cache[arg] = result = fn(arg);
      if (++count > limit) {
        cache = {};
        count = 0;
      }
    }
    return result;
  };
}