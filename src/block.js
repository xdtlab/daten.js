module.exports = (function() {
  'use strict';

  var daten = require('./daten');
  var BigInteger = require('./crypto/biginteger');

  function Block(index, timestamp, previousHash, merkleRoot, difficulty, transactions, nonce) {
    this.index = index;
    this.timestamp = timestamp;
    this.previousHash = previousHash;
    this.merkleRoot = merkleRoot;
    this.difficulty = difficulty;
    this.nonce = nonce;
    if(transactions !== null)
      this.transactions = transactions;
  }

  Block.prototype.serialize = function(header_only) {
    if(header_only === undefined) header_only = false;
    var writer = new daten.utils.ByteWriter();
    writer.writeUint32(this.index);
    writer.writeUint32(this.timestamp);
    writer.writeBytes(this.previousHash);
    writer.writeBytes(this.merkleRoot);
    writer.writeUint32(this.difficulty);
    writer.writeUint32(this.nonce);
    if(!header_only)
      writer.writeBytes(daten.Transaction.serializeList(this.transactions));
    return writer.getValue();
  }

  Block.prototype.calculateMerkleRoot = function() {
    var leaves = [];
    for(var i = 0; i < this.transactions.length; i++)
      leaves.push(this.transactions[i].hash());
    while(leaves.length != 1) {
      var new_leaves = [];
      for(var i = 0; i < Math.floor(leaves.length / 2); i++) {
        var a = leaves[i * 2]; var b = leaves[i * 2 + 1];
        new_leaves.push(daten.hash.regular(daten.utils.hexToBytes(a + b)));
      }
      if(leaves.length % 2 == 1)
        new_leaves.push(leaves[leaves.length - 1]);
      leaves = new_leaves;
    }
    return leaves[0];
  }

  Block.prototype.decompressedDifficulty = function() {
    var bts = daten.utils.uint32ToBytes(this.difficulty);
    var length = bts[0];
    var header = bts.slice(1,4);
    var result = new daten.utils.ByteWriter();
    for(var i = 0; i < 32 - length; i++) result.writeBytes(new Uint8Array([0]));
    result.writeBytes(header);
    for(var i = 0; i < length - 3; i++) result.writeBytes(new Uint8Array([0]));
    return daten.utils.bytesToHex(result.getValue());
  }

  Block.prototype.validDifficulty = function(hash) {
    var diff = this.decompressedDifficulty();
    for(var i = 0; i < 64;i++) {
      if(hash[i] > diff[i])
        return false;
      else if(hash[i] < diff[i])
        return true;
    }
    return true;
  }

  Block.prototype.averageTriesNeeded = function() {
    var maxHash = "0x" + "f".repeat(64);
    var diff = "0x" + this.decompressedDifficulty();
    maxHash = new BigInteger(maxHash);
    diff = new BigInteger(diff);
    return maxHash.divRem(diff)[0];
  }

  Block.deserialize = function(bytes, header_only) {
    if(header_only === undefined) header_only = false;
    var reader = new daten.utils.ByteReader(bytes);
    var index = reader.readUint32();
    var timestamp = reader.readUint32();
    var previousHash = reader.readBytes(32);
    var merkleRoot = reader.readBytes(32);
    var difficulty = reader.readUint32();
    var nonce = reader.readUint32();
    var transactions = header_only ? null : daten.Transaction.deserializeList(reader.readBytes());
    return new Block(index, timestamp, previousHash, merkleRoot, difficulty, transactions, nonce);
  }

  Block.serializeList = function(blocks, header_only) {
    if(header_only === undefined) header_only = false;
    var writer = new daten.utils.ByteWriter();
    writer.writeUint32(blocks.length);
    for(var i = 0; i < blocks.length; i++) {
      var serialized = blocks[i].serialize(header_only);
      writer.writeUint32(serialized.length);
      writer.writeBytes(serialized);
    }
    return writer.getValue();
  }

  Block.deserializeList = function(bytes, header_only) {
    if(header_only === undefined) header_only = false;
    var blocks = [];
    var reader = new daten.utils.ByteReader(bytes);
    var length = reader.readUint32();
    for(var i = 0; i < length; i++) {
      var block_size = reader.readUint32();
      blocks.push(Block.deserialize(reader.readBytes(block_size), header_only))
    }
    return blocks
  }

  Block.prototype.hash = function() {
    return daten.hash.pow(this.serialize(true));
  }

  return Block;
})();
