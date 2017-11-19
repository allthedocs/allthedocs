//
// # Functions related to URLs
//

function isRelativeUrl(url) {
    return !(/:\/\//).test(url);
}

function isLocalUrl(url) {
    return isRelativeUrl(url) && !((/\?/).test(url));
}

function sourceUrlToOutputUrl(url) {
    
    var parts = url.split("#");
    var path = parts[0];
    var hash = parts[1] || "";
    var appendix = hash ? "#" + hash : "";
    var fileName = path.split("/").pop();
    
    if (!fileName) {
        return url;
    }
    
    if (isMdFile(path)) {
        return path.replace(/\.md$/, ".html") + appendix;
    }
    
    return path + ".html" + appendix;
}

function isMdFile(fileName) {
    return (/\.md$/).test(fileName);
}

module.exports = {
    isMdFile: isMdFile,
    isRelativeUrl: isRelativeUrl,
    isLocalUrl: isLocalUrl,
    sourceUrlToOutputUrl: sourceUrlToOutputUrl
};
