Yet Another Static Site Generator
=================================

A node.js-based application to generate static web sites with HTML or Markdown and JSON/YAML data.

## Installation

    npm install -g yassg

## Create a new project

    $ yassg new site
    $ cd site
    $ yassg watch

Open a web browser on <http://localhost:3000/> and start developing your site. If your browser supports web sockets, changes to the site will trigger an automatic reload of js, css or html files.

## Build the site

    $ yassg build

## Structure

A yassg project uses the following directories:

* `layouts`: layout files used to wrap pages or other layouts
* `pages`: page files may contain a front matter (see below) and are filtered through mustache
* `properties`: data files which can be accessed in all pages and layouts
* `static`: these files are copied without change

Pages with a `.md`, `.mdown` or `.markdown` extension are automatically converted from Markdown to HTML. All other files keep their extensions.

Inside the `properties` directory, `.json` and `.yaml` files are automatically read as objects.
Everything else is read as string. A file `foo.json` containing an object with a `bar` property can be accessed as `site.foo.bar`. The content of a file `baz.txt` can be accessed as `site.baz`.

## Front Matter

Files in `layouts` or `pages` that start with three dashes (`---`) contain a YAML formatted set of properties which is read and used for example to find a layout file to wrap that page with a layout.

Example:

    ---
    layout: standard
    title: Page title
    authors:
      - foo
      - bar
    ---
    This is the normal page content.

## Templating

Yassg uses mustache to replace `{{...}}` markers in files located in `pages` or `layouts`.

Example:

    {{title}} will be replaced by the `title` property, with HTML escaped
    
    {{{content}}} will be replaced by the `content` property, without HTML escaping
    
    This will list all page names:
      {{#pages}}
      {{name}}
      {{/pages}}
    
    {{> partial}} will embed the content of `layouts/_partial.html`

Templates may access the following properties:

* `name`: the page name (dashes and underscores are replaced with spaces)
* `path`: the full path of the page (a.k.a. URL)
* `site`: all data read from the `properties` directory
* `site.pages`: all pages of this site
* `site.navigation`: a list of pages that participate in the global navigation
* all properties from the page's front matter

A page participates in the global navigation by providing a `navigation` property. A value of `true` signals that the page shall be added. By default, pages are sorted by name. A number value is used to override this order. An object with two properties `name` and `weight` can also override the navigation link's name.

## Markdown extension

The following syntax can be used to wrap sections in a `div` with a certain class:

    +---note---
    some text
    +----------

The `+` must be the first character of the line and followed by at least three dashes. Dashes after the class name are optional. There must be at least 3 dashes and no class name in the bottom line.


## License

Copyright (c) 2012 Stefan Matthias Aust

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of this project nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
