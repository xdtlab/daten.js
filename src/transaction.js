module.exports = (function() {
  'use strict';

  var daten = require('./daten');

  function Transaction(version, target, fee, name, source, destination, amount, data, signature) {
    this.version = version;
    this.target = target;
    this.fee = fee;
    this.name = name;
    this.source = source;
    this.destination = destination;
    this.amount = amount;
    this.data = data;
    this.signature = signature;
  }

  Transaction.prototype.serialize = function(signature_included) {
    if(signature_included === undefined) signature_included = true;
    var writer = new daten.utils.ByteWriter();

    writer.writeUint8(this.version);
    writer.writeUint32(this.target);
    writer.writeUint64(this.fee);

    var encodedName = daten.utils.encodeAscii(this.name);
    writer.writeUint8(encodedName.length);
    writer.writeBytes(encodedName);

    this.source.write(writer);
    this.destination.write(writer);

    writer.writeUint64(this.amount);

    this.data.write(writer);

    if(signature_included) {
      writer.writeUint8(this.signature.length);
      writer.writeBytes(this.signature);
    }

    return writer.getValue();
  }

  Transaction.deserialize = function(bytes, signature_included) {
    if(signature_included === undefined) signature_included = true;
    var reader = new daten.utils.ByteReader(bytes);

    var version = reader.readUint8();
    var target = reader.readUint32();
    var fee = reader.readUint64();

    var name = daten.utils.decodeAscii(reader.readBytes(reader.readUint8()));

    var source = daten.address.Address.read(reader);
    var destination = daten.address.Address.read(reader);

    var amount = reader.readUint64();

    var data = daten.data.Data.read(reader);

    if(signature_included)
      var signature = reader.readBytes(reader.readUint8());
    else
      var signature = null;

    return new Transaction(version, target, fee, name, source, destination, amount, data, signature)
  }

  Transaction.prototype.hash = function() {
    return daten.hash.regular(this.serialize());
  }

  Transaction.serializeList = function(transactions) {
    var writer = new daten.utils.ByteWriter();
    writer.writeUint32(transactions.length);
    for(var i = 0; i < transactions.length; i++) {
      var serialized = transactions[i].serialize();
      writer.writeUint32(serialized.length);
      writer.writeBytes(serialized);
    }
    return writer.getValue();
  }

  Transaction.deserializeList = function(bytes) {
    var transactions = [];
    var reader = new daten.utils.ByteReader(bytes);
    var length = reader.readUint32();
    for(var i = 0; i < length; i++) {
      var transaction_size = reader.readUint32();
      transactions.push(Transaction.deserialize(reader.readBytes(transaction_size)))
    }
    return transactions
  }

  return Transaction;
})();
