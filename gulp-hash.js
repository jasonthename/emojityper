'use strict';

const crypto = require('crypto');
const Concat = require('concat-with-sourcemaps');
const path = require('path');
const through = require('through2');

class Hash {
  constructor() {
    this._paths = {};
  }

  path(name) {
    return this._paths[name];
  }

  must(name) {
    const out = this.path(name);
    if (out == null) {
      throw new Error(`couldn't find updated path for: ${name}'`)
    }
    return out
  }

  _update(base, hash) {
    const index = base.indexOf('.');
    if (index === -1) {
      return `${base}-${hash}`;
    }
    return `${base.substr(0, index)}-${hash}${base.substr(index)}`;
  }

  write(name) {
    const parts = path.parse(name);
    if (parts.base !== name) {
      throw new Error(`expected blank dir, was: ${parts.dir}`);
    }
    const self = this;
    let modificationTime;
    let mostRecent;
    let concat;

    function each(f, enc, cb) {
      if (f.isStream() || f.isNull()) {
        this.emit('error', new Error('bad file'));
        return cb();
      }

      if (f.stat && (modificationTime === undefined || f.stat.mtime > modificationTime)) {
        modificationTime = f.stat.mtime;
        mostRecent = f;
      } else if (mostRecent === undefined) {
        mostRecent = f;
      }
      concat = concat || new Concat(true, name, '\n');
      concat.add(f.relative, f.contents, f.sourceMap);
      cb();
    }

    function end(cb) {
      if (mostRecent === undefined || concat === undefined) {
        delete self._paths[parts.base];
        return cb();
      }

      const content = concat.content;
      const h = crypto.createHash('md5').update(content).digest('hex').slice(0, 10);
      const updatedName = self._update(parts.base, h);
      self._paths[parts.base] = updatedName;

      const merged = mostRecent.clone({contents: false});
      merged.path = path.join(mostRecent.base, updatedName);
      merged.contents = content;
      merged.sourceMap = concat.sourceMapping ? JSON.parse(concat.sourceMap) : null;

      this.push(merged);
      cb();
    }

    return through.obj(each, end);
  }
}

module.exports = Hash;
