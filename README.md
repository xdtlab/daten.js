# daten.js
## A JavaScript interface to the Daten Network
Below is a brief explanation of how to create web-based dApps using JavaScript
on top of the Daten Network.

### Connecting to a Daten node
First you should connect to a Daten node by creating a wallet object. It accepts
an initial node address as its first argument.

```js
var wallet = new daten.Wallet("1.2.3.4:32323");
```

### Get node status
You can get the state of a random node in the network like this:
```js
wallet.getStatus(function(state) {
  alert(state.height);
});
```

### Creating transactions
You should create a transaction before sending it, be aware that the transactions
created by this function expire when a new block gets validated across the network,
send it as soon as possible!

```js
wallet.createTransaction(name, destination, amount, data, function(tx) {
  // Transaction is created!
}, onError);
```

### Send transactions
Send transactions:
```js
wallet.sendTransaction(tx, function(result) {
  // Check if the process was successfull.
}, onError);
```

### Query data
Find data:
```js
wallet.query(params, function(txs) {
});
```

### Listen to transactions
Listen to incoming transactions to a specific address:
```js
wallet.listen(address, function(tx) {
});
```

### Confirming transactions
Confirm transactions:
```js
wallet.confirm(tx, maxConfirmations, function(confirmations, hashTries) {
});
```
