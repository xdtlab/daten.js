module.exports = (function() {
  'use strict';

  var daten = require('./daten');

  function Wallet(node, key) {
    if(key)
      var acc = daten.ecdsa.open(key);
    else
      var acc = daten.ecdsa.generate();
    this.key = acc.key;
    this.address = acc.address;
    this.node = node;
    this.url = 'http://' + this.node;
  }

  Wallet.prototype.getAddress = function() {
    return this.address;
  }

  Wallet.prototype.getKey = function() {
    return this.key;
  }

  Wallet.prototype.getBalance = function(onBalanceReady) {
    $.get(this.url + "/resolve?address=" + this.address, function(data, status) {
      if(onBalanceReady && data.hasOwnProperty('balance'))
        onBalanceReady(data.balance);
    });
  }

  Wallet.prototype.getStatus = function(onStatusReady) {
    $.get(this.url + "/status", function(data, status) {
      if(onStatusReady && data.hasOwnProperty('height') && data.hasOwnProperty('time') && data.hasOwnProperty('bytePrice'))
        onStatusReady(data.height, data.time, data.bytePrice);
    });
  }

  Wallet.prototype.getBlock = function(index, header_only, onBlockReady, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.url + '/blocks/' + index + (header_only ? "?header" : ""), true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      var responseArray = new Uint8Array(this.response);
      if(responseArray.length > 0 && onBlockReady)
        onBlockReady(daten.Block.deserialize(responseArray, header_only));
      else if(responseArray.length == 0 && onError)
        onError();
    };
    xhr.send();
  }

  Wallet.prototype.getBlockRange = function(start, end, header_only, onBlockRangeReady) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.url + '/blocks/' + start + '/' + end + (header_only ? "?header" : ""), true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      var reader = new daten.utils.ByteReader(this.response);
      if(onBlockRangeReady)
        onBlockRangeReady(daten.Block.deserializeList(responseArray, header_only));
    };
    xhr.send();
  }

  Wallet.prototype.signTransaction = function(transaction) {
    var signable = transaction.serialize(false);
    transaction.signature = daten.utils.hexToBytes(daten.ecdsa.sign(this.getKey(), signable));
  }

  Wallet.prototype.sendTransaction = function(name, destination, amount, data, onSent) {
    var wallet = this;
    this.getStatus(function(height, time, bytePrice) {
      var tx = new daten.Transaction(0, height + 1, 0, name, new daten.address.RawAddress(daten.utils.hexToBytes(wallet.getAddress())), destination, amount, data, new Uint8Array(71) /* Empty signature */);
      tx.fee = tx.serialize().length * bytePrice;
      wallet.signTransaction(tx);

      $.ajax({
         url: wallet.url + '/transactions',
         type: 'POST',
         data: tx.serialize(),
         processData: false
      }).done(function(data) {
        if(onSent)
          onSent(data);
      });
    });
  }

  Wallet.prototype.query = function(filters, onQueryDone) {
    var xhr = new XMLHttpRequest();
    var url = this.url + "/query?";
    if(filters.name) url += 'name=' + filters.name + '&';
    if(filters.destination) url += 'destination=' + filters.destination.toString();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      var responseArray = new Uint8Array(this.response);
      if(onQueryDone) {
        var transactions = daten.Transaction.deserializeList(responseArray);
        onQueryDone(transactions);
      }
    };
    xhr.send();
  }

  Wallet.prototype.getPeers = function(onPeersReady) {
    $.get(this.url + "/peers", function(data, status) {
      if(data.ok)
        if(onPeersReady) onPeersReady(data.peers);
    });
  }

  Wallet.runMerklePath = function(hash, path) {
    path = daten.utils.hexToBytes(path);
    var reader = new daten.utils.ByteReader(path);
    var rounds = path.length / 33;
    for(var i = 0; i < rounds; i++) {
      var isRight = reader.readUint8();
      var merkleHash = reader.readBytes(32);
      var merge = new daten.utils.ByteWriter();
      if(isRight) { merge.writeBytes(merkleHash); merge.writeBytes(daten.utils.hexToBytes(hash)); }
      else { merge.writeBytes(daten.utils.hexToBytes(hash)); merge.writeBytes(merkleHash); }
      hash = daten.hash.regular(merge.getValue());
    }
    return hash;
  }

  Wallet.prototype.confirm = function(transaction, maxConfirmations, onResult) {
    var wallet = this;

    function checkDiffs(index, previousHash, confirmations, tries, maxConfirmations) {
      if(maxConfirmations > confirmations) {
        wallet.getBlock(index, true, function(b) {
          if(daten.utils.bytesToHex(b.previousHash) == previousHash) {
            var hash = b.hash();
            if(b.validDifficulty(hash))
              checkDiffs(b.index + 1, hash, confirmations + 1, tries + b.averageTriesNeeded(), maxConfirmations);
            else onResult(confirmations, tries);
          } else onResult(confirmations, tries);
        },
        function() { onResult(confirmations, tries); });
      } else onResult(confirmations, tries);
    }

    $.get(this.url + "/confirm?target=" + transaction.target + "&hash=" + transaction.hash(), function(data, status) {
      if(!data.ok)
        onResult(0, 0);
      else {
        wallet.getStatus(function(height, timestamp, bytePrice) {
          if(maxConfirmations > height - transaction.target)
            maxConfirmations = height - transaction.target;
          wallet.getBlock(transaction.target, true, function(b) {
            if(Wallet.runMerklePath(transaction.hash(), data.path) == daten.utils.bytesToHex(b.merkleRoot)) {
              var hash = b.hash();
              if(b.validDifficulty(hash))
                checkDiffs(transaction.target + 1, hash, 1, b.averageTriesNeeded(), maxConfirmations);
              else onResult(0, 0);
            }
          });
        });
      }
    });
  }

  Wallet.prototype.listen = function(address, onTransaction, onOpen, onClose) {
    if(this.socket) this.socket.close();
    this.socket = new WebSocket("ws://" + this.node + '/live?address=' + address);
    this.socket.binaryType = "arraybuffer";
    var wallet = this;
    this.socket.onopen = onOpen;
    this.socket.onmessage = function(event) { if(onTransaction) onTransaction(daten.Transaction.deserialize(new Uint8Array(event.data))); }
    this.onclose = onClose;
  }

  Wallet.formatAmount = function(amount) {
    var result = '';
    var cnt = 0;
    while(amount != 0 || cnt <= 9) {
      result = (amount % 10) + result;
      cnt++;
      if(cnt == 9) result = '.' + result;
      amount = Math.floor(amount / 10);
    }
    return result + " XDT"
  }

  return Wallet;
})();
