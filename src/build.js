//
// # The Build Script (src/build.js)
//
// When you build your docs using `allthedocs build` this script is what is run.
//
/* eslint no-console:  off */

const fs = require("fs");
const md = require("marked");
const copy = require("ncp").ncp;
const assert = require("assert");
const format = require("vrep").format;
const mkdirp = require("mkdirp");
const colors = require("colors");
const filehound = require("filehound");
const rmdirRecursive = require("rmdir-recursive").sync;
const highlighter = require('highlight.js');

const path = require("path");
const normalize = path.normalize;
const dirname = path.dirname;

var buildNavigation = require("./build-navigation");
var getRelativePathToRoot = require("./utils/getRelativePathToRoot");

md.setOptions({
    highlight: function (code, language) {
        
        if (!language) {
            return code;
        }
        
        return highlighter.highlightAuto(code).value;
    }
});

const ERRORS = {
    NO_DOCS_FILE: "The docs.json file is missing in your project folder. Project not initialized?"
};

function build(dir) {
    
    const rootDir = dir || normalize(process.cwd() + "/");
    const infoFilePath = normalize(rootDir + "/docs.json");
    
    if (!fs.existsSync(infoFilePath)) {
        throw new Error(ERRORS.NO_DOCS_FILE);
    }
    
    const info = JSON.parse("" + fs.readFileSync(infoFilePath));
    
    const resourceFolderName = "__atdresources";
    const outputDir = normalize(rootDir + "/" + info.output + "/");
    const outputResourceDir = normalize(outputDir + "/" + resourceFolderName + "/");
    const resourceDir = normalize(__dirname + "/../resources/");
    const filesDir = normalize(resourceDir + "/files/");
    const templatesDir = normalize(resourceDir + "/templates/");
    
    const template = "" + fs.readFileSync(normalize(templatesDir + "/default.html"));
    const filesTemplate = "" + fs.readFileSync(normalize(templatesDir + "/file.html"));
    
    const ignore = info.ignore || ["node_modules", "dist"];
    
    var navigation = info.navigation ? buildNavigation(info.navigation, templatesDir) : "";
    
    if (fs.existsSync(outputDir)) {
        rmdirRecursive(outputDir);
    }
    
    mkdirp.sync(outputDir);
    mkdirp.sync(outputResourceDir);
    
    console.log("\n Copying static resources to output folder...");
    
    copy(filesDir, outputResourceDir, function (error) {
        
        if (error) {
            console.error(error);
        }
        
        console.log("\n Finding and parsing " + colors.blue("markdown") + " files...");
        
        gatherDocFiles(rootDir, logErrorOr(function (files) {
            
            console.log("\n Finding and parsing " + colors.yellow("source code") + " files...");
            
            gatherFiles(rootDir, getCodeExtensions(info), logErrorOr(function (sourceFiles) {
                
                var docs, sources;
                var allFiles = renderFiles(files.concat(sourceFiles).sort(fileSorter(rootDir)));
                
                console.log("\n Preparing " + colors.blue("markdown") + " files...\n");
                
                docs = files.map(function (file) {
                    return wrapContent({
                        origin: file,
                        path: file.replace(rootDir, ""),
                        content: md.parse("" + fs.readFileSync(file))
                    }, allFiles);
                });
                
                console.log(
                    "\n Preparing files parsed from " + colors.yellow("source code") + "...\n"
                );
                
                sources = sourceFiles.map(function (file) {
                    return wrapContent({
                        origin: file,
                        path: file.replace(rootDir, ""),
                        content: parseSourceFile("" + fs.readFileSync(file))
                    }, allFiles);
                });
                
                console.log(
                    "\n Writing doc files generated from " + colors.blue("markdown") + "..."
                );
                
                writeDocFiles(docs, outputDir);
                
                console.log(
                    "\n Writing doc files generated from " + colors.yellow("source code") + "...\n"
                );
                
                writeSourceDocFiles(sources, outputDir);
                
                console.log(" --- " + colors.green("ALL DONE!") + " --- \n");
                
            }));
            
        }));
    });
    
//
// ## Putting content into the template
//
//     wrapContent :: object -> [object] -> object
//
    function wrapContent(file, files) {
        
        var root = getRelativePathToRoot(file.path);
        
        console.log(
            "     " +
            (/\.md$/.test(file.path) ? colors.blue(file.path) : colors.yellow(file.path)) +
            " -> " +
            colors.green(outputDir.replace(rootDir, "") + getOutputPath(file.path))
        );
        
        file.content = format(template, {
            content: file.content,
            title: getHeading(file.content) || file.origin.split(path.sep).pop(),
            rootDir: root,
            resourceDir: root + resourceFolderName + "/",
            projectName: info.name || "Documentation",
            files: format(files, {rootDir: root}),
            navigation: format(navigation, {
                rootDir: root
            })
        });
        
        return file;
    }
    
    function renderFiles(files) {
        return files.map(function (file) {
            
            var path = file.replace(rootDir, "");
            
            return format(filesTemplate, {
                icon: "file",
                path: path,
                href: getOutputPath(path)
            });
            
        }).join("");
    }
    
    function addIgnorePaths(query, dir) {
        query.addFilter(function (file) {
            return !ignore.some(function (pattern) {
                return (new RegExp(pattern)).test(file._pathname.replace(dir, ""));
            });
        });
    }
    
    function gatherDocFiles(dir, then) {
        gatherFiles(dir, ["md"], then);
    }
    
    function gatherFiles(dir, extensions, then) {
        
        var query = filehound.create().
            ignoreHiddenDirectories().
            paths(dir).
            ext(extensions);
        
        addIgnorePaths(query, dir);
        
        query.find(then);
    }
}

build.ERRORS = ERRORS;

//
// ## Parsing source code
//
//     parseSourceFile :: string -> string
//
function parseSourceFile(content) {
    
    var lines = content.split("\n");
    var commentLinePattern = /^\/\/[ ]{0,1}(.*$)/;
    var sections = [];
    
    lines.forEach(function (line, i) {
        
        var section = current();
        var lineIsEmpty = line.trim() === "";
        var type = getLineType(line);
        
//
// Empty lines before and after comments are ignored to reduce the presentation to
// the lines that actually matter.
//
        if (section && section.type === "code" && lineIsEmpty && next() && isCommentLine(next())) {
            return;
        }
        
        if (section && section.type === "comment" && lineIsEmpty) {
            return;
        }
        
        if (section && section.type !== type) {
            section = null;
        }
        
        if (!section) {
            
            section = {
                type: type,
                lines: []
            };
            
            sections.push(section);
        }
        
        section.lines.push(type === "comment" ? uncomment(line) : line);
        
        function next() {
            return lines[i + 1];
        }
    });
    
    return md.parse(
        sections.reduce(function (all, section) {
            if (section.type === "comment") {
                return all + "\n" + section.lines.join("\n");
            }
            else {
                return all + "\n```javascript\n" + section.lines.join("\n") + "\n```\n";
            }
        }, "")
    );
    
//
//     isCommentLine :: string -> boolean
//
    function isCommentLine(line) {
        return getLineType(line) === "comment";
    }
    
//
//     getLineType :: string -> string
//
    function getLineType(line) {
        return commentLinePattern.test(line) ? "comment" : "code";
    }
    
//
//     (1) current :: object
//     (2) current :: undefined
//
    function current() {
        return sections[sections.length - 1];
    }
    
//
//     uncomment :: string -> string
//
    function uncomment(line) {
        return (line.match(commentLinePattern)[1] || "");
    }
}

function getHeading(content) {
    return (content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "";
}

function writeDocFiles(files, outputDir) {
    
    assert.equal(typeof outputDir, "string");
    
    files.forEach(function (item) {
        
        var path = normalize(outputDir + "/" + mdToHtmlExtension(item.path));
        var dir = dirname(path);
        
        if (!fs.existsSync(dir)) {
            mkdirp.sync(dir);
        }
        
        fs.writeFileSync(path, item.content);
    });
}

function writeSourceDocFiles(files, outputDir) {
    
    assert.equal(typeof outputDir, "string");
    
    files.forEach(function (item) {
        
        var path = normalize(outputDir + "/" + jsToHtmlExtension(item.path));
        var dir = dirname(path);
        
        if (!fs.existsSync(dir)) {
            mkdirp.sync(dir);
        }
        
        fs.writeFileSync(path, item.content);
    });
}

function getOutputPath(path) {
    return path.replace(".md", "") + ".html";
}

function fileSorter(rootDir) {
    
    return function sortFiles(a, b) {
        
        var aSplitLength, bSplitLength;
        
        if (a === b) {
            return 0;
        }
        
        a = a.replace(rootDir, "");
        b = b.replace(rootDir, "");
        
        aSplitLength = a.split("/").length;
        bSplitLength = b.split("/").length;
        
//
// Folders should come first.
//
        if (aSplitLength !== bSplitLength) {
            if (aSplitLength === 1) {
                return 1;
            }
            else if (bSplitLength === 1) {
                return -1;
            }
        }
        
        if (a.split("/")[0] === b.split("/")[0]) {
            return sortFiles(
                a.split(a.split("/").shift()).pop(),
                b.split(b.split("/").shift()).pop()
            );
        }
        
        return (a < b ? -1 : 1);
    };
}

function mdToHtmlExtension(path) {
    return path.replace(".md", ".html");
}

function jsToHtmlExtension(path) {
    return path + ".html";
}

function logErrorOr(consume) {
    return function (error, data) {
        
        if (error) {
            return console.error(error);
        }
        
        consume(data);
    };
}

function getCodeExtensions(info) {
    return info.code.map(function (language) {
        return language.extension;
    });
}

module.exports = build;
