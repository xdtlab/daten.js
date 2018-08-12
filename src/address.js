module.exports = (function() {
  'use strict';

  var daten = require('./daten');

  function Address() { }
  Address.ADDRESS_TYPES = {}
  Address.prototype.write = function(writer) { writer.writeUint8(this.constructor.TYPE_ID); }
  Address.prototype.hash = function() { var writer = new daten.utils.ByteWriter(); this.write(writer); return daten.hash.regular(writer.getValue()); }
  Address.read = function(reader) { return this.ADDRESS_TYPES[reader.readUint8()].read(reader);}
  Address.fromString = function(string) { if(string.length == 66) return new RawAddress(daten.utils.hexToBytes(string)); else return new NameAddress(string.split(".")); }

  function RawAddress(publicKey) { this.publicKey = publicKey; }
  RawAddress.TYPE_ID = 0;
  RawAddress.prototype = Object.create(Address.prototype, {
    write: { value: function(writer) {
      Address.prototype.write.call(this, writer);
      writer.writeBytes(this.publicKey);
    }},
    toString: { value: function() {
      return daten.utils.bytesToHex(this.publicKey);
    }},
    getName: { value: function() {
      return null;
    }},
    getDestinationAddress: { value: function() {
      return this;
    }}});
  RawAddress.read = function(reader) {
    return new RawAddress(reader.readBytes(33));
  };
  RawAddress.prototype.constructor = RawAddress;
  Address.ADDRESS_TYPES[RawAddress.TYPE_ID] = RawAddress;

  function NameAddress(name) { this.name = name; }
  NameAddress.TYPE_ID = 1;
  NameAddress.prototype = Object.create(Address.prototype, {
    write: { value: function(writer) {
      Address.prototype.write.call(this, writer);
      writer.writeUint8(this.name.length);
      for(var i = 0; i < this.name.length; i++) {
        var encoded = daten.utils.encodeAscii(this.name[i]);
        writer.writeUint8(encoded.length);
        writer.writeBytes(encoded);
      }
    }},
    toString: { value: function() {
      return this.name.join(".");
    }},
    getName: { value: function() {
      return this.name[0];
    }},
    getDestinationAddress: { value: function() {
      return new NameAddress(this.name.slice(1));
    }}});
  NameAddress.read = function(reader) {
    var length = reader.readUint8();
    var parts = [];
    for(var i = 0; i < length; i++)
      parts.push(daten.utils.decodeAscii(reader.readBytes(reader.readUint8())));
    return new NameAddress(parts);
  };
  NameAddress.prototype.constructor = NameAddress;
  Address.ADDRESS_TYPES[NameAddress.TYPE_ID] = NameAddress;

  return {
    Address: Address,
    RawAddress: RawAddress,
    NameAddress: NameAddress
  }
})();
