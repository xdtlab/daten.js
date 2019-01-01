module.exports = (function() {
  'use strict';

  var daten = require('./daten');

  var lib = require('./crypto/bitcore-lib.min');
  var argon2 = require('./crypto/argon2');

  function memoize(fn) {
    let cache = {};
    return function(inp) {
      if (inp in cache)
        return cache[inp];
      else {
        let result = fn(inp);
        cache[inp] = result;
        return result;
      }
    }
  }

  function sha256(uint8arr) {
    return daten.utils.bytesToHex(lib.crypto.Hash.sha256(uint8arr));
  }

  function argon2i(uint8arr) {
    return daten.utils.bytesToHex(argon2.hash({
      pass: uint8arr,
      salt: 'saltysalt',
      time: 1,
      mem: 2345,
      hashLen: 32,
      parallelism: 1,
      type: argon2.ArgonType.Argon2i
    }).hash);
  }

  return {regular: memoize(sha256), pow: memoize(argon2i)};
})();
