/* Copyright 2012 by Stefan Matthias Aust. All rights reserved. */
var express = require('express'), 
  yaml = require('yamljs'), 
  hogan = require('hogan.js'),
  marked = require('marked'),
  fs = require('fs'),
  exists = fs.existsSync,
  path = require('path'),
  basename = path.basename,
  extname = path.extname,
  join = path.join;

// read all files in the given directory (if it exists), returning everything as object properties
function readObject(dir){
  console.log("reading properties from", dir);
  var object = {};
  if (!exists(dir)) return object;
  fs.readdirSync(dir).forEach(function(file){
    var key = basename(file, extname(file));
    console.log(" read", file);
    var content = fs.readFileSync(join(dir, file), 'utf8');
    try{
      switch (extname(file)){
      case '.json':
        object[key] = JSON.parse(content);
        break;
      case '.yml':
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
  });
  return object;
}

// read all files in the given directory recursively, returning an array of Page objects
function readPages(dir){
  console.log("reading pages from", dir);
  var pages = [];
  walk(dir, function(){}, function(file){
    console.log(" read page", file);
    var page = {
      path: "/" + file.substr(0, file.length - extname(file).length).replace("\\", "/") + ".html",
      name: basename(file, extname(file)).replace(/[\-_]/g, " "),
      markdown: [".md", ".mdown", ".markdown"].indexOf(extname(file)) !== -1,
      content: fs.readFileSync(join(dir, file), 'utf8')
    };
    var m = /(^---$[\s\S]*)^---$\r?\n([\s\S]*)/m.exec(page.content);
    if (m){
      page = merge(page, yaml.parse(m[1]));
      page.content = m[2];
    }
    pages.push(page);
  });
  return pages;
}

// read all properties and all pages and compute navigation
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
      };
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

// returns an object with getter methods for all partials
// so that they're only loaded if needed and not before
function readPartials(){
  var partials = {};
  fs.readdirSync("layouts").forEach(function(file){
    if (file.match(/^_/)){
      Object.defineProperty(partials, basename(file.substr(1), extname(file)), {
        get: function(){ return fs.readFileSync(join("layouts", file), 'utf8'); }
      });
    }
  });
  return partials;
}

// find page (or layout) in html or markdown format for the given path
function findFile(dir, path){
  path = join(dir, path);
  if (exists(path)) return path;
  var base = path.substr(0, path.length - extname(path).length);
  var exts = [".md", ".mdown", ".markdown"];
  for (var i = 0; i < exts.length; i++){
    path = base + exts[i];
    if (exists(path)) return path;
  }
  return null;
}

// read page (or layout), apply mustache template and layouts
function readFile(path, page, partials){
  console.log("read file", path);
  
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

// setup express web application for development
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

// copy every file in the given directory recursively into the output directory
function copyFiles(dir, out) {
  walk(dir, function (file) { 
    mkdir(join(out, file));
  }, function (file) {
    var data = fs.readFileSync(join(dir, file));
    fs.writeFileSync(join(out, file), data);
  });
}

// generate pages from the given directory recursively into the output directory
function generatePages(dir, out, site, partials) {
  walk(dir, function (file) {
    mkdir(join(out, file));
  }, function (file) {
    var page = {
      path: "/" + file.substr(0, file.length - extname(file).length).replace("\\", "/") + ".html",
      name: basename(file, extname(file)).replace(/[\-_]/g, " "),
      site: site
    };
    var content = readFile(join(dir, file), page, partials);
    fs.writeFileSync(join(out, path.dirname(file), basename(file, extname(file)) + ".html"), content, 'utf-8');
  });
}

// build the site
function build(dir){
  copyFiles("static", dir);
  generatePages("pages", dir, readSite(), readPartials());
}

// export run & build functions if this file is required as module
// otherwise run the development server, defaulting to port 3000
if (module.parent) {
  exports.run = run;
  exports.build = build;
} else {
  run(process.env.PORT || 3000);
}

// utilities
function merge(a, b){
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
}

// converts given string from markdown to HTML
function markdown(s){
  s = marked(s);
  s = s.replace(/^<p>\+---+(.+)-*$/gm, "<div class='$1'><p>");
  s = s.replace(/^\+---+<\/p>$/gm, "</div>");
  return s;
}

// creates the given directory if it doesn't exists yet
function mkdir(path){
  if (!fs.existsSync(path)) fs.mkdirSync(path);
}

// calls a callback function for every file and directory recursively
function walk(dir, dirCallback, fileCallback){
  function walkDirectory(path){
    dirCallback(path);
    fs.readdirSync(join(dir, path)).forEach(function(file){
      var absfile = join(dir, path, file);
      if (fs.statSync(absfile).isDirectory()){
        walkDirectory(join(path, file));
      } else {
        fileCallback(join(path, file));
      }
    });
  }
  walkDirectory("");
}
