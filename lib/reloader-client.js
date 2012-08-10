/* Copyright 2012 by Stefan Matthias Aust. All rights reserved. */
new WebSocket("ws://localhost:PORT").onmessage = function(m){
  console.log(m.data);
  if (/\.js(\?\d+)?$/.test(m.data)){
    var es = document.getElementsByTagName("script");
    for (var i = 0; i < es.length; i++){
      var url = es[i].src;
      var j = url.indexOf("?");
      if (j === -1) j = url.length;
      es[i].src = url.substring(0, j) + "?" + Date.now();
    }
  }else if (/\.css$/.test(m.data)){
    var es = document.getElementsByTagName("link");
    for (var i = 0; i < es.length; i++){
      var url = es[i].href;
      if (/\.css(\?\d+)?$/.test(url)){
        var j = url.indexOf("?");
        if (j === -1) j = url.length;
        es[i].href = url.substring(0, j) + "?" + Date.now();
      }
    }
  }else{
    location.reload();
  }
};