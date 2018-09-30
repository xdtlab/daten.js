module.exports = (function() {
  'use strict';

  function getNodeList(onResult, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "https://raw.githubusercontent.com/xdtlab/list/master/list.txt");
    xhr.onload = function() {
      if (xhr.status === 200) {
        var nodes = xhr.responseText.split("\n");
        nodes = nodes.filter(line => line.length > 0 && line[0] != "#");
        if(onResult) onResult(nodes);
      }
      else { if(onError) onError(xhr.status); }
    };
    xhr.onerror = function() { if(onError) onError(xhr.status); }
    xhr.send();
  }

  return {getNodeList: getNodeList};
})();
