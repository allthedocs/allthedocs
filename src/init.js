//
// # The Init Script
//

var fs = require("fs");
var normalize = require("path").normalize;

var info = JSON.parse("" + fs.readFileSync(__dirname + "/../docs.json"));

var ERRORS = {
    DOCS_FILE_EXISTS: "The docs.json file already exists!"
};

function init(dir) {
    
    var rootDir = dir || normalize(process.cwd() + "/");
    var infoPath = normalize(rootDir + "/docs.json");
    
    if (fs.existsSync(infoPath)) {
        throw new Error(ERRORS.DOCS_FILE_EXISTS);
    }
    
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 4));
}

init.ERRORS = ERRORS;

module.exports = init;
