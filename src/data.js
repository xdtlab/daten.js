module.exports = (function() {
  'use strict';

  var daten = require('./daten');

  function Data() { }
  Data.DATA_TYPES = {}
  Data.prototype.write = function(writer) { writer.writeUint8(this.constructor.TYPE_ID); }
  Data.prototype.hash = function() { var writer = new daten.utils.ByteWriter(); this.write(writer); return daten.hash.regular(writer.getValue()); }
  Data.read = function(reader) { return this.DATA_TYPES[reader.readUint8()].read(reader);}

  function NoData() { }
  NoData.TYPE_ID = 0;
  NoData.prototype = Object.create(Data.prototype, {
    write: { value: function(writer) {
      Data.prototype.write.call(this, writer);
    }},
    toString: { value: function() {
      return "null";
    }}});
  NoData.read = function(reader) {
    return new NoData();
  };
  NoData.prototype.constructor = NoData;
  Data.DATA_TYPES[NoData.TYPE_ID] = NoData;

  function StringData(string) { this.string = string; }
  StringData.TYPE_ID = 1;
  StringData.prototype = Object.create(Data.prototype, {
    write: { value: function(writer) {
      Data.prototype.write.call(this, writer);
      var utf8 = daten.utils.encodeUtf8(this.string);
      writer.writeUint16(utf8.length);
      writer.writeBytes(utf8);
    }},
    toString: { value: function() {
      return "\"" + this.string + "\"";
    }}});
  StringData.read = function(reader) {
    var length = reader.readUint16();
    return new StringData(daten.utils.decodeUtf8(reader.readBytes(length)));
  };
  StringData.prototype.constructor = StringData;
  Data.DATA_TYPES[StringData.TYPE_ID] = StringData;

  function BlobData(blob) { this.blob = blob; }
  BlobData.TYPE_ID = 2;
  BlobData.prototype = Object.create(Data.prototype, {
    write: { value: function(writer) {
      Data.prototype.write.call(this, writer);
      writer.writeUint16(this.blob.length);
      writer.writeBytes(this.blob);
    }},
    toString: { value: function() {
      return "...";
    }}});
  BlobData.read = function(reader) {
    var length = reader.readUint16();
    return new BlobData(reader.readBytes(length));
  }
  BlobData.prototype.constructor = BlobData;
  Data.DATA_TYPES[BlobData.TYPE_ID] = BlobData;

  function DecimalData(decimal) { this.decimal = decimal; }
  DecimalData.TYPE_ID = 3;
  DecimalData.prototype = Object.create(Data.prototype, {
    write: { value: function(writer) {
      Data.prototype.write.call(this, writer);
      writer.writeUint64(this.decimal);
    }},
    toString: { value: function() {
      return this.decimal;
    }}});
  DecimalData.read = function(reader) {
    return new DecimalData(reader.readUint64());
  };
  DecimalData.prototype.constructor = DecimalData;
  Data.DATA_TYPES[DecimalData.TYPE_ID] = DecimalData;

  function BooleanData(boolean) { this.boolean = boolean; }
  BooleanData.TYPE_ID = 4;
  BooleanData.prototype = Object.create(Data.prototype, {
    write: { value: function(writer) {
      Data.prototype.write.call(this, writer);
      writer.writeUint8(this.boolean ? 1 : 0);
    }},
    toString: { value: function() {
      return this.boolean.toString();
    }}});
  BooleanData.read = function(reader) {
    return new BooleanData(reader.readUint8() == 1);
  };
  BooleanData.prototype.constructor = BooleanData;
  Data.DATA_TYPES[BooleanData.TYPE_ID] = BooleanData;

  function ListData(items) { this.items = items; }
  ListData.TYPE_ID = 5;
  ListData.prototype = Object.create(Data.prototype, {
    write: { value: function(writer) {
      Data.prototype.write.call(this, writer);
      writer.writeUint16(this.items.length);
      for(var i = 0; i < this.items.length; i++)
        this.items[i].write(writer);
    }},
    toString: { value: function() {
      var strs = [];
      for(var i = 0; i < this.items.length; i++) strs.push(this.items[i].toString());
      return "[" + strs.join(', ') + "]";
    }}});
  ListData.read = function(reader) {
    var length = reader.readUint16();
    var items = [];
    for(var i = 0; i < length; i++)
      items.push(Data.read(reader));
    return new ListData(items);
  };
  ListData.prototype.constructor = ListData;
  Data.DATA_TYPES[ListData.TYPE_ID] = ListData;

  function MapData(pairs) { this.pairs = pairs; }
  MapData.TYPE_ID = 6;
  MapData.prototype = Object.create(Data.prototype, {
    write: { value: function(writer) {
      Data.prototype.write.call(this, writer);
      writer.writeUint16(this.pairs.length);
      for(var i = 0; i < this.pairs.length; i++) {
        this.pairs[i][0].write(writer);
        this.pairs[i][1].write(writer);
      }
    }},
    toString: { value: function() {
      var strs = [];
      for(var i = 0; i < this.pairs.length; i++)
        strs.push(this.pairs[i][0].toString() + ": " + this.pairs[i][1].toString());
      return "{" + strs.join(', ') + "}";
    }}});
  MapData.read = function(reader) {
    var length = reader.readUint16();
    var pairs = [];
    for(var i = 0; i < length; i++) {
      var k = Data.read(reader);
      var v = Data.read(reader);
      pairs.push([k, v]);
    }
    return new MapData(pairs);
  }
  MapData.prototype.constructor = MapData;
  Data.DATA_TYPES[MapData.TYPE_ID] = MapData;

  return {Data: Data,
          NoData: NoData,
          StringData: StringData,
          BlobData: BlobData,
          DecimalData: DecimalData,
          BooleanData: BooleanData,
          ListData: ListData,
          MapData: MapData};
})();
