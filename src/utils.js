module.exports = (function() {
  'use strict';

  var daten = require('./daten');
  var BigInteger = require('./crypto/biginteger');

  var encoder = new TextEncoder("utf-8");
  var decoder = new TextDecoder('utf-8');

  function encodeUtf8(string) {
    return encoder.encode(string);
  }

  function decodeUtf8(uint8arr) {
    return decoder.decode(uint8arr);
  }

  var alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  function hexToBase58(hex) {
    var num = new BigInteger("0x" + hex);
    var encoded = '';
    while(num.isPositive()) {
      var divrem = num.divRem(58);
      num = divrem[0];
      encoded = alphabet[divrem[1]].toString() + encoded;
    }
    return encoded || '1';
  }
  function base58ToHex(base58) {
    var decoded = new BigInteger(0);
    while(base58) {
      var alphabetPosition = alphabet.indexOf(base58[0]);
      if (alphabetPosition < 0)
        throw "String is not Base58!";
      var powerOf = base58.length - 1;
      var toadd = new BigInteger(alphabetPosition);
      toadd = toadd.multiply((new BigInteger(58)).pow(powerOf));
      decoded = decoded.add(toadd);
      base58 = base58.substring(1);
    }
    return decoded.toString(16);
  }

  function encodeAscii(string) {
    var encoded = encodeUtf8(string);
    if(encoded.length == string.length) {
      for(var i = 0; i < encoded.length; i++) {
        if(encoded[i] >= 128)
          throw "String is not ASCII!";
      }
    } else throw "String is not ASCII!";
    return encoded;
  }

  function decodeAscii(uint8arr) {
    for(var i = 0; i < uint8arr.length; i++) {
      if(uint8arr[i] >= 128)
        throw "String is not ASCII!";
    }
    return decoder.decode(uint8arr);
  }

  function bytesToHex(uint8arr) {
    var hexStr = '';
    for (var i = 0; i < uint8arr.length; i++) {
      var hex = (uint8arr[i] & 0xff).toString(16);
      hex = (hex.length === 1) ? '0' + hex : hex;
      hexStr += hex;
    }
    return hexStr;
  }

  function hexToBytes(str, padding) {
    if(str.length % 2 == 1 && padding === undefined){
      throw "Odd number of hex digits! Specify a padding!";
    } else {
      if(str.length > padding * 2) throw "Value outside the range!";
      else while(str.length < padding * 2) str = '0' + str;
    }
    var a = [];
    for (var i = 0; i < str.length; i += 2) {
      a.push(parseInt(str.substr(i, 2), 16));
    }
    return new Uint8Array(a);
  }

  function hexToNumber(hex) {
    return parseInt(hex, 16);
  }
  function numberToHex(number) {
    if(number <= Number.MAX_SAFE_INTEGER)
      return number.toString(16);
    else
      throw "Value above the JavaScript max safe integer!";
  }

  // Watchout this!
  function bytesToUint8(uint8arr) { return hexToNumber(bytesToHex(uint8arr)); }
  function bytesToUint16(uint8arr) { return hexToNumber(bytesToHex(uint8arr)); }
  function bytesToUint32(uint8arr) { return hexToNumber(bytesToHex(uint8arr)); }
  function bytesToUint64(uint8arr) { return hexToNumber(bytesToHex(uint8arr)); }

  function uint8ToBytes(number) { return hexToBytes(numberToHex(number), 1); }
  function uint16ToBytes(number) { return hexToBytes(numberToHex(number), 2); }
  function uint32ToBytes(number) { return hexToBytes(numberToHex(number), 4); }
  function uint64ToBytes(number) { return hexToBytes(numberToHex(number), 8); }
  function mergeBytes(uint8arrs) {
    var sum = 0;
    for(var i = 0; i < uint8arrs.length; i++) sum += uint8arrs[i].length;
    var merged = new Uint8Array(sum);
    var index = 0;
    for(var i = 0; i < uint8arrs.length; i++) {
      merged.set(uint8arrs[i], index);
      index += uint8arrs[i].length;
    }
    return merged;
  }


  function ByteWriter() { this.data = []; }
  ByteWriter.prototype.writeUint8 = function(number) { this.data.push(uint8ToBytes(number)); }
  ByteWriter.prototype.writeUint16 = function(number) { this.data.push(uint16ToBytes(number)); }
  ByteWriter.prototype.writeUint32 = function(number) { this.data.push(uint32ToBytes(number)); }
  ByteWriter.prototype.writeUint64 = function(number) { this.data.push(uint64ToBytes(number)); }
  ByteWriter.prototype.writeBytes = function(bytes) { this.data.push(bytes); }
  ByteWriter.prototype.getValue = function() { this.data = [mergeBytes(this.data)]; return this.data[0]; }

  function ByteReader(bytes) { this.bytes = bytes; this.offset = 0; }
  ByteReader.prototype.readUint8 = function() { var number = bytesToUint8(this.bytes.slice(this.offset, this.offset + 1)); this.offset += 1; return number; }
  ByteReader.prototype.readUint16 = function() { var number = bytesToUint16(this.bytes.slice(this.offset, this.offset + 2)); this.offset += 2; return number; }
  ByteReader.prototype.readUint32 = function() { var number = bytesToUint32(this.bytes.slice(this.offset, this.offset + 4)); this.offset += 4; return number; }
  ByteReader.prototype.readUint64 = function() { var number = bytesToUint64(this.bytes.slice(this.offset, this.offset + 8)); this.offset += 8; return number; }
  ByteReader.prototype.readBytes = function(count) { if(count === undefined) count = this.bytes.length - this.offset;  var bytes = this.bytes.slice(this.offset, this.offset + count); this.offset += count; return bytes; }

  return {encodeUtf8: encodeUtf8, decodeUtf8: decodeUtf8,
          encodeAscii: encodeAscii, decodeAscii: decodeAscii,
          bytesToHex: bytesToHex, hexToBytes: hexToBytes,
          hexToNumber: hexToNumber, numberToHex: numberToHex,
          bytesToUint8: bytesToUint8, bytesToUint16: bytesToUint16, bytesToUint32: bytesToUint32, bytesToUint64: bytesToUint64,
          uint8ToBytes: uint8ToBytes, uint16ToBytes: uint16ToBytes, uint32ToBytes: uint32ToBytes, uint64ToBytes: uint64ToBytes,
          mergeBytes: mergeBytes,
          hexToBase58, base58ToHex,
          ByteReader: ByteReader, ByteWriter: ByteWriter};
})();
