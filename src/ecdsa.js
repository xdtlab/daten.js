module.exports = (function() {
  'use strict';

  var daten = require('./daten');
  var lib = require('./crypto/bitcore-lib.min');

  function generate() {
    var priv = lib.PrivateKey.fromRandom();
    return {address: priv.publicKey.toString(), key: priv.toString()};
  }

  function open(key) {
    var priv = lib.PrivateKey.fromString(key);
    return {address: priv.publicKey.toString(), key: priv.toString()};
  }

  function sign(key, uint8arr) {
    var priv = lib.PrivateKey.fromString(key);
    var buff = daten.utils.hexToBytes(daten.hash.regular(uint8arr)).reverse(); // Reverse because little-endian
    return lib.crypto.ECDSA.sign(buff, priv, 'little').toString();
  }

  function verify(address, uint8arr, signature) {
    var pub = lib.PublicKey.fromString(address);
    var buff = daten.utils.hexToBytes(daten.hash.regular(uint8arr)).reverse(); // Reverse because little-endian
    signature = lib.crypto.Signature.fromString(signature);
    return lib.crypto.ECDSA.verify(buff, signature, pub, 'little');
  }

  return {generate: generate, open: open, sign: sign, verify: verify};
})();
