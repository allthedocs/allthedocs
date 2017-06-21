//
// # The Build Script (src/build.js)
//
// When you build your docs using `allthedocs build` this script is what is run.
//
/* eslint no-console:  off */

const fs = require("fs");
const copySync = require("fs-extra").copySync;
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
var urlHelper = require("./utils/urls");

//
// Directory name of the source file currently being processed.
//
var currentDirName = "";

//
// We use an object instead of an array for keeping track of files needing to be copied.
// This avoids duplicates.
//
var filesToCopy = {};

var renderer = new md.Renderer();

renderer.link = function (href, title, text) {
    
    var isExternal = true;
    var linkType = "external-link";
    
    if (urlHelper.isRelativeUrl(href)) {
        href = urlHelper.sourceUrlToOutputUrl(href);
        isExternal = false;
        linkType = "internal-link";
    }
    
    return format('<a href="{href}" title="{title}" {target} class="{classes}">{text}</a>', {
        href: href,
        title: title || "",
        classes: linkType,
        text: text,
        target: isExternal ? 'target="_blank"' : ""
    });
};

renderer.image = function (href, title, text) {
    
    if (urlHelper.isRelativeUrl(href)) {
        copyFileLater(href);
    }
    
    return format('<img src="{href}" title="{title}" alt="{text}" />', {
        href: href,
        title: title || "",
        text: text
    });
};

md.setOptions({
    renderer: renderer,
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

//
// Adds a file path to a list of files that must be copied from the source to the output.
// Accepts relative paths, and transforms them to absolute path by using a global
// variable that holds the *current* dir name the source file that's being processed.
//
function copyFileLater(path) {
    
    path = normalize(currentDirName + "/" + path);
    
    filesToCopy[path] = "";
}

function build(dir) {
    
    const rootDir = dir || normalize(process.cwd() + "/");
    const infoFilePath = normalize(rootDir + "/docs.json");
    
    if (!fs.existsSync(infoFilePath)) {
        throw new Error(ERRORS.NO_DOCS_FILE);
    }
    
    const info = JSON.parse("" + fs.readFileSync(infoFilePath));
    var codeInfo = normalizeCodeInfo(info.code);
    
    const resourceFolderName = "__atdresources";
    const outputDir = normalize(rootDir + "/" + info.output + "/");
    const outputResourceDir = normalize(outputDir + "/" + resourceFolderName + "/");
    const fileListOutputPath = normalize(outputDir + "/__files.html");
    const jsOutputBundlePath = normalize(outputResourceDir + "/index.js");
    const frontendIndexFile = normalize(__dirname + "/../frontend.js");
    const resourceDir = normalize(info.themeDir || (__dirname + "/../resources/"));
    const filesDir = normalize(resourceDir + "/files/");
    const templatesDir = normalize(resourceDir + "/templates/");
    
    const template = "" + fs.readFileSync(normalize(templatesDir + "/default.html"));
    const fileListTemplate = "" + fs.readFileSync(normalize(templatesDir + "/file-list.html"));
    const filesTemplate = "" + fs.readFileSync(normalize(templatesDir + "/file.html"));
    
    const ignore = info.ignore || ["node_modules", "dist"];
    
    var navigation = info.navigation ? buildNavigation(info.navigation, templatesDir) : "";
    var paths = info.paths || {};
    
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
        
        fs.writeFileSync(jsOutputBundlePath, fs.readFileSync(frontendIndexFile));
        
        console.log("\n Finding and parsing " + colors.blue("markdown") + " files...");
        
        gatherDocFiles(rootDir, logErrorOr(function (files) {
            
            console.log("\n Finding and parsing " + colors.yellow("source code") + " files...");
            
            gatherFiles(rootDir, getCodeExtensions(info), logErrorOr(function (sourceFiles) {
                
                var docs, sources;
                var allFiles = renderFiles(files.concat(sourceFiles).sort(fileSorter(rootDir)));
                
                console.log("\n Preparing " + colors.blue("markdown") + " files...\n");
                
                docs = files.map(function (file) {
                    
                    var filePath = file.replace(rootDir, "");
                    
                    currentDirName = path.dirname(filePath);
                    
                    return wrapContent({
                        origin: file,
                        path: filePath,
                        content: md.parse(insertBlocks("" + fs.readFileSync(file)))
                    });
                });
                
                console.log(
                    "\n Preparing files parsed from " + colors.yellow("source code") + "...\n"
                );
                
                sources = sourceFiles.map(function (file) {
                    
                    var filePath = file.replace(rootDir, "");
                    
                    currentDirName = path.dirname(filePath);
                    
                    return wrapContent({
                        origin: file,
                        path: filePath,
                        content: parseSourceFile(
                            "" + fs.readFileSync(file), codeInfo[getExtension(file)]
                        )
                    });
                });
                
                fs.writeFileSync(fileListOutputPath, wrapContent({
                    origin: "",
                    path: "__files",
                    content: format(fileListTemplate, {files: allFiles})
                }).content);
                
                console.log(
                    "\n Writing doc files generated from " + colors.blue("markdown") + "..."
                );
                
                writeDocFiles(docs, outputDir);
                
                console.log(
                    "\n Writing doc files generated from " + colors.yellow("source code") + "...\n"
                );
                
                writeSourceDocFiles(sources, outputDir);
                
                console.log(
                    " Copying linked local resources to output folder...\n"
                );
                
                Object.keys(filesToCopy).forEach(function (file) {
                    
                    var inputPath = normalize(rootDir + "/" + file);
                    var outputPath = normalize(outputDir + "/" + file);
                    
                    console.log(
                        "     " + file + " -> " + colors.green(outputPath.replace(rootDir, ""))
                    );
                    
                    copySync(inputPath, outputPath);
                });
                
                console.log("\n --- " + colors.green("ALL DONE!") + " --- \n");
                
            }));
            
        }));
    });
    
//
// ## Putting content into the template
//
//     wrapContent :: object -> object
//
    function wrapContent(file) {
        
        var root = getRelativePathToRoot(file.path);
        
        console.log(
            "     " +
            (/\.md$/.test(file.path) ? colors.blue(file.path) : colors.yellow(file.path)) +
            " -> " +
            colors.green(outputDir.replace(rootDir, "") + getOutputPath(file.path))
        );
        
        file.content = format(template, {
            content: insertPathVars(file.content),
            title: getHeading(file.content) || file.origin.split(path.sep).pop(),
            rootDir: root,
            resourceDir: root + resourceFolderName + "/",
            projectName: info.name || "Documentation",
            navigation: format(navigation, {
                rootDir: root
            })
        });
        
        return file;
    }
    
    function insertPathVars(content) {
        return format(content, createPathVars(paths));
    }
    
    function createPathVars(paths) {
        
        var pathVars = {};
        
        Object.keys(paths).forEach(function (key) {
            pathVars[key] = "{rootDir}" + paths[key];
        });
        
        return pathVars;
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
function parseSourceFile(content, language) {
    
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
        insertBlocks(sections.reduce(function (all, section) {
            if (section.type === "comment") {
                return all + "\n" + section.lines.join("\n");
            }
            else {
                return all + "\n```javascript\n" + section.lines.join("\n") + "\n```\n";
            }
        }, ""))
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
        return (
            language.comments.some(function (comment) {
                
                if (comment.type !== "single") {
                    return false;
                }
                
                return (new RegExp(comment.start)).test(line);
                
            }) ?
            "comment" :
            "code"
        );
    }
    
    function getCommentLineInfo(line) {
        return language.comments.find(function (comment) {
            
            if (comment.type !== "single") {
                return false;
            }
            
            return (new RegExp(comment.start)).test(line);
        });
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
        
        var info = getCommentLineInfo(line);
        
        return line.replace(new RegExp(info.start || ""), "");
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

//
// Blocks are `div` elements with classes. They look like this:
//
// /---- warning
// This is a warning message!
// ----/
//
// And are written like this:
//
//     /---- warning
//     This is a warning message!
//     ----/
//
function insertBlocks(content) {
    return content.split("\n").map(function (line) {
        return line.
            replace(/^\/----(.*)/, '<div class="block $1">\n').
            replace(/^----\/.*/, "</div>");
    }).join("\n");
}

function getCodeExtensions(info) {
    return info.code.map(function (language) {
        return language.extension;
    });
}

function getExtension(file) {
    return file.split(".").pop();
}

function normalizeCodeInfo(code) {
    
    var normalized = {};
    
    code = code || [];
    
    code.forEach(function (language) {
        normalized[language.extension] = language;
    });
    
    return normalized;
}

module.exports = build;
