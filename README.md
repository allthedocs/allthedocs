# allthedocs

Allthedocs is your one stop shop documentation generator for software projects. It builds
a static website from both documentation files written in markdown and source code files
annotated with markdown-formatted comments.


## Quick Start Guide

### Installation

For command line use, install it globally using NPM:

    npm install -g allthedocs

If you're using Linux, you might need to do this with `sudo`.

To use allthedocs JS API in your build process, install it into your project like this:

    npm install --save-dev allthedocs


### Command Line Usage

Using allthedocs requires you to have a `docs.json` config file in the root directory of your
project. You can add such a config file by running:

    allthedocs init

You should then edit the `docs.json` file to your needs (see below). To build your docs, all
you have to do is run the following in the directory with the `docs.json` file:

    allthedocs build


### API Usage

Because all the interesting things about your docs are configured using the `docs.json` file
(see further below for an explanation), allthedoc's JavaScript API couldn't probably be
any simpler:

```javascript
var build = require("allthedocs").build;
var rootFolder "path/to/your/docs.json";

build(rootFolder);
```


### Configuration (docs.json file)

Allthedocs is configured using a simple JSON file in the root directory of your project. The
file must be called `docs.json` and it looks like this:

```javascript
{
    "name": "My Project's Name",
    "output": "path/to/your/output/directory/",
    "ignore": [
        "path/to/your/output/directory/",
        "node_modules"
    ],
    "navigation": {
        "Home": "/",
        "Documentation": {
            "User Guide": "docs/user/index.md",
            "FAQ": "docs/faq.md"
        }
    },
    "code": [
        {
            "extension": "js",
            "language": "javascript",
            "comments": [
                {
                    "type": "single",
                    "start": "//"
                }
            ]
        }
    ]
}
```

| Property          | Description                                                                 |
|:------------------|:----------------------------------------------------------------------------|
| `name`            | The name of your project.                                                   |
| `ignore`          | A list of regular expressions for which files/folders to ignore              |
| `navigation`      | The links shown in your doc's navigation (optional).                        |
| `code`            | A list of file extensions/languages of source code files to parse.          |

The `ignore` property expects regular expressions in the form as you would use in the string
argument to JavaScript's
[RegExp constructor](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

The `navigation` property maps labels to URLs and is used to generate the site navigation for
your docs. You can link directly to markdown files here. The navigation can be two-dimensional,
e.g. you can have a label that doesn't map to a URL itself, but shows a list of links when
hovered. The `navigation` property is also entirely optional; if you leave it out, the navigation
strip will not be shown in your generated docs.

#### The `code` property

The `code` property can be used to configure (programming) languages and their files to be
parsed for comments. Any files configured as such will be turned into annotated source code
in your generated documentation (similar to [docco](https://jashkenas.github.io/docco/)).

The `extension` property specifies the file extension of the language.

The `language` property is the name of the source language. This is used for coloring the
code blocks using [highlight.js](https://highlightjs.org/static/demo/).

Finally, the `comments` property tells allthedocs which kind of comments should be parsed as
markdown instead of interpreting them as part of the normal code. The `comments` property
must be an array of objects. Each object must specify the type of comment (currently only
`single` for single-line comments is supported, `multi` (for multi-line comments) is not
yet implemented). The `start` property is a string and tells allthedocs which characters
precede a single-line comment.
