/* Copyright 2012 by Stefan Matthias Aust. All rights reserved. */
var express = require('express'), 
  yaml = require('yamljs'), 
  hogan = require('hogan'),
  marked = require('marked'),
  fs = require('fs'),
  exists = fs.existsSync,
  path = require('path'),
  basename = path.basename,
  extname = path.extname;

// read all files in the given directory (if it exists), returning everything as object properties
function readObject(name){
  console.log("reading object from", name);
  if (!exists(name)) return null;
  var object = {}
  var files = fs.readdirSync(name);
  for (var i = 0; i < files.length; i++){
    var file = files[i];
    var key = basename(file, extname(file));
    var content = fs.readFileSync(name + "/" + file, 'utf8');
    try{
      switch (extname(file)){
      case '.json':
        object[key] = JSON.parse(content);
        break;
      case '.yaml':
        object[key] = yaml.parse(content);
        break;
      case '.md':
      case '.mdown':
      case '.markdown':
        object[key] = markdown(content);
        break;
      default:
        object[key] = content;
        break;
      }
    }catch(err){
      console.log(err);
    }
  }
  return object;
}

function readPages(dir){
  var pages = [];
  function readPagesInPath(path){
    console.log("read pages in path ", path)
    fs.readdirSync(dir + path).forEach(function(file){
      var absfile = dir + path + "/" + file;
      if (fs.statSync(absfile).isDirectory()){
        readPagesInPath(path + "/" + file);
      } else {
        var page = {
          path: path + "/" + basename(file, extname(file)) + ".html",
          name: basename(file, extname(file)),
          content: fs.readFileSync(absfile, 'utf8')
        };
        var m = /(^---$[\s\S]*)^---$\r?\n([\s\S]*)/m.exec(page.content);
        if (m){
          page = merge(page, yaml.parse(m[1]));
          page.content = m[2];
        }
        pages.push(page);
      }
    });
  }
  readPagesInPath("");
  return pages;
}

function readSite(){
  console.log("read site");
  var site = readObject("properties");
  site.pages = readPages("pages");
  site.navigation = [];
  site.pages.forEach(function(page){
    if (page.navigation){
      page.navigation = {
        name: page.navigation.name || page.name,
        weight: page.navigation === true ? 1 : page.navigation.weight || page.navigation
      }
      site.navigation.push(page);
    }
  });
  site.navigation.sort(function(a, b){
    if (a.navigation.weight === b.navigation.weight){
      return a.navigation.name.localeCompare(b.navigation.name);
    }
    return a.navigation.weight - b.navigation.weight;
  });
  return site;
}

// returns an object with getter method for all partials
// so that they're only loaded if needed and not before
function readPartials(){
  partials = {};
  fs.readdirSync("layouts").forEach(function(file){
    if (file.match(/^_/)){
      Object.defineProperty(partials, basename(file.substr(1), extname(file)), {
        get: function(){ return fs.readFileSync("layouts/" + file, 'utf8'); }
      });
    }
  });
  return partials;
}

// find page (or layout) in html or markdown format for the given path
function findFile(dir, path){
  path = dir + "/" + path;
  if (exists(path)) return path;
  var base = path.substr(0, path.length - extname(path).length);
  console.log("*", base);
  var exts = [".md", ".mdown", ".markdown"];
  for (var i = 0; i < exts.length; i++){
    path = base + exts[i];
    if (exists(path)) return path;
  }
  return null;
}

// read page (or layout), apply mustache template and layouts
function readFile(path, page, partials){
  console.log("read file", path)
  
  page.layout = null;
  var content = fs.readFileSync(path, 'utf8');
  
  // extract front matter
  var m = /(^---$[\s\S]*)^---$\r?\n([\s\S]*)/m.exec(content);
  if (m){
    page = merge(page, yaml.parse(m[1]));
    content = m[2];
  }
  
  // render mustache
  content = hogan.compile(content).render(page, partials);
  
  // apply markdown format
  if (/\.(md|mdown|markdown)$/.test(path)){
    content = markdown(content);
  }
  
  // apply layout
  if (page.layout){
    page.content = content;
    content = readFile(findFile("layouts", page.layout + ".html"), page, partials);
  }
  
  return content;
}

// setup express web application
function run(port){
  var app = express();
  app.use(express.favicon());
  app.use(express.static("static"));
  app.use(require('./lib/reloader')("."));
  
  app.get("/*", function(req, res, next){
    if (/\/$/.test(req.path)){
      res.redirect(req.path + "index.html");
    }else{
      var path = findFile("pages", req.params[0]);
      if (path){
        console.log("REQUEST BEGIN");
        var page = {
          path: req.params[0],
          name: basename(path, extname(path)),
          site: readSite()
        };
        res.send(200, readFile(path, page, readPartials()));
        console.log("REQUEST END");
      }
      else next();
    }
  });

  app.listen(port);
}

if (module.parent) exports.run = run;
else run(process.env.PORT || 3000);

// utilities
function merge(a, b){
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
}

function markdown(s){
  s = marked(s);
  s = s.replace(/^<p>\+---+(.+)-*$/gm, "<div class='$1'><p>");
  s = s.replace(/^\+---+<\/p>$/gm, "</div>");
  return s;
}