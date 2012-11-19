/* Copyright 2012 by Stefan Matthias Aust. All rights reserved. */
var fs = require('fs'),
  ws = require('ws'),
  watch = require('watch');

module.exports = function(dir, port){
  port = port || 3001;
  
  var clientjs = fs.readFileSync(__dirname + "/reloader-client.js", 'utf8').replace(/PORT/, port);
  
  var clients = [];
  
  new ws.Server({port: port}).on('connection', function(ws){
    clients.push(ws);
    console.log("reloader: connect (" + clients.length + ")");
    ws.on('close', function(){
      var i = clients.indexOf(ws);
      if (i !== -1) clients.splice(i, 1);
      console.log("reloader: disconnect (" + clients.length + ")");
    });
  });
  
  function send(message){
    clients.forEach(function(ws){
      try{
        ws.send(message);
      }catch(err){}
    });
  }
  
  // watch views directory and notify clients
  watch.watchTree(dir, { persistent: true, interval: 1000 }, function(path, stat){
    if (stat){
      console.log("reloader: reloading because of", path);
      send(path);
    } 
  });
  
  return function(req, res, next){
    if (req.path === "/__reloader__.js"){
      res.set('Content-Type', 'text/javascript');
      return res.send(clientjs);
    }
    if (/\.html$/.test(req.path)){
      var write = res.write, end = res.end, body = '';
      res.write = function(chunk, encoding){
        body += chunk;
      };
      res.end = function(chunk, encoding){
        body += chunk;
        body = body.replace(/<\/head>/i, "<script src='/__reloader__.js'></script></head>");
        res.removeHeader('Content-Length');
        end.call(res, body, encoding);
      };
    }
    next();
  };
};