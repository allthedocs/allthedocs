//
// # [function] getRelativePathToRoot
//
//     getRelativePathToRoot :: string -> string
//

var path = require("path");
var normalize = path.normalize;
var dirname = path.dirname;

function getRelativePathToRoot(filePath) {
    
    var relativePath = normalize(
        path.relative(normalize("/" + dirname(filePath)), normalize("/")) + "/"
    );
    
    return (relativePath === "/" ? "" : relativePath);
}

module.exports = getRelativePathToRoot;
