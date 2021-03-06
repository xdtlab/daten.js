module.exports = (function() {
  'use strict';

  var daten = require('./daten');

  function Wallet(node, key) {
    if(key)
      var acc = daten.ecdsa.open(key);
    else
      var acc = daten.ecdsa.generate();
    this.key = acc.key;
    this.address = new daten.address.RawAddress(daten.utils.hexToBytes(acc.address));
    this.nodes = new Set();
    this.nodes.add(node);
    this.confirmCache = {};
  }

  Wallet.prototype.refreshNodes = function() {
    var wallet = this;
    new Set(this.nodes).forEach(function(node) {
      Wallet.getPeers(node, function(peers) {
        peers.forEach(function(peer) { wallet.nodes.add(peer); });
      }, function() { wallet.nodes.delete(node); });
    });
  }

  Wallet.prototype.randomNode = function() {
    this.refreshNodes();
    var nodes = Array.from(this.nodes);
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  Wallet.prototype.getAddress = function() {
    return this.address;
  }

  Wallet.prototype.getKey = function() {
    return this.key;
  }

  Wallet.prototype.getBalance = function(onBalanceReady, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "http://" + this.randomNode() + "/resolve?address=" + this.address);
    xhr.onload = function() {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if(onBalanceReady)
          onBalanceReady(data.balance);
      }
      else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
  }

  Wallet.prototype.getStatus = function(onStatusReady, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "http://" + this.randomNode() + "/status");
    xhr.onload = function() {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if(onStatusReady)
          onStatusReady(data);
      }
      else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
  }

  Wallet.prototype.getBlock = function(index, header_only, onBlockReady, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "http://" + this.randomNode() + '/blocks/' + index + (header_only ? "?header" : ""), true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      var responseArray = new Uint8Array(this.response);
      if(responseArray.length > 0 && onBlockReady)
        onBlockReady(daten.Block.deserialize(responseArray, header_only));
      else if(responseArray.length == 0)
        if(onError) onError(xhr.status);
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
  }

  Wallet.prototype.getBlockRange = function(start, end, header_only, onBlockRangeReady) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "http://" + this.randomNode() + '/blocks/' + start + '/' + end + (header_only ? "?header" : ""), true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      var responseArray = new Uint8Array(this.response);
      if(onBlockRangeReady)
        onBlockRangeReady(daten.Block.deserializeList(responseArray, header_only));
    };
    xhr.send();
  }

  Wallet.prototype.resolve = function(name, onReady) {
    this.query()
  }

  Wallet.prototype.latest = function(onReady) {
    var xhr = new XMLHttpRequest();
    var url = "http://" + this.randomNode() + "/latest?address=" + this.getAddress();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      if (xhr.status === 200) {
        var responseArray = new Uint8Array(this.response);
        if(onReady) {
          var transactions = daten.Transaction.deserializeList(responseArray);
          onReady(transactions);
        }
      } else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
  }

  Wallet.prototype.signTransaction = function(transaction) {
    var signable = transaction.serialize(false);
    transaction.signature = daten.utils.hexToBytes(daten.ecdsa.sign(this.getKey(), signable));
  }

  Wallet.prototype.createTransaction = function(name, destination, amount, data, onReady, onError) {
    var wallet = this;
    this.getStatus(function(status) {
      var tx = new daten.Transaction(0, status.height + 1, 0, name, wallet.getAddress(), destination, amount, data, new Uint8Array(71) /* Empty signature */);
      tx.fee = tx.serialize().length * status.bytePrice;
      wallet.signTransaction(tx);
      if(onReady)
        onReady(tx);
    }, onError);
  }

  Wallet.prototype.sendTransaction = function(transaction, onResult, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', "http://" + this.randomNode() + '/transactions');
    xhr.onload = function() {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if(onResult)
          onResult(data);
      }
      else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send(transaction.serialize());
  }

  Wallet.prototype.find = function(name, onFound, onError) {
    var xhr = new XMLHttpRequest();
    var url = "http://" + this.randomNode() + "/find?name=" + name;
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      if (xhr.status === 200) {
        var responseArray = new Uint8Array(this.response);
        if(onFound) {
          var tx = daten.Transaction.deserialize(responseArray);
          onFound(tx);
        }
      } else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
  }

  Wallet.prototype.findChildren = function(name, onFound, onError) {
    var xhr = new XMLHttpRequest();
    var url = "http://" + this.randomNode() + "/find?name=" + name + "&children";
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      if (xhr.status === 200) {
        var responseArray = new Uint8Array(this.response);
        if(onFound) {
          var tx = daten.Transaction.deserializeList(responseArray);
          onFound(tx);
        }
      } else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
  }

  Wallet.getPeers = function(node, onPeersReady, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "http://" + node + "/peers");
    xhr.onload = function() {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if(data.ok)
          if(onPeersReady) onPeersReady(data.peers);
      }
      else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
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

  Wallet.prototype.confirm = function(tx, maxConfirmations, onResult, onError) {
    var wallet = this;
    var txhash = tx.hash();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "http://" + this.randomNode() + "/confirm?target=" + tx.target + "&hash=" + txhash);
    xhr.onload = function() {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if(!data.ok)
          onError();
        else {
          var cache = {lastHash: null, blocks: 0, tries: 0};
          if(wallet.confirmCache[txhash])
            cache = wallet.confirmCache[txhash];
          var lastHash = cache.lastHash;
          var start = tx.target + cache.blocks;
          wallet.getBlockRange(start, start + maxConfirmations - 1, true, function(blks) {
            var totalTries = 0;
            for(var i = 0; i < blks.length; i++) {
              var index = start + i;
              if(index == tx.target) {
                if(Wallet.runMerklePath(txhash, data.path) != daten.utils.bytesToHex(blks[0].merkleRoot)) {
                  onError(); wallet.confirmCache[txhash] = null; return;
                }
              }
              var hash = blks[i].hash();
              if((index > tx.target && daten.utils.bytesToHex(blks[i].previousHash) != lastHash) || !blks[i].validDifficulty(hash)) {
                onError(); wallet.confirmCache[txhash] = null; return;
              }
              lastHash = hash;
              totalTries += blks[i].averageTriesNeeded();
            }
            cache.lastHash = lastHash;
            cache.blocks += blks.length;
            cache.tries += totalTries;
            wallet.confirmCache[txhash] = cache;
            onResult(cache.blocks, cache.tries);
          });
        }
      }
      else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
  }

  Wallet.prototype.listen = function(address, onTransaction, onOpen, onClose) {
    if(this.socket) this.socket.close();
    this.socket = new WebSocket("ws://" + this.randomNode() + '/live?address=' + address);
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
