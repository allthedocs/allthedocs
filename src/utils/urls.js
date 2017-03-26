//
// # Functions related to URLs
//

function isRelativeUrl(url) {
    return !(/:\/\//).test(url);
}

function sourceUrlToOutputUrl(url) {
    
    var fileName = url.split("/").pop();
    
    if (!fileName) {
        return url;
    }
    
    if (isMdFile(url)) {
        return url.replace(/\.md$/, ".html");
    }
    
    return url + ".html";
}

function isMdFile(fileName) {
    return (/\.md$/).test(fileName);
}

module.exports = {
    isMdFile: isMdFile,
    isRelativeUrl: isRelativeUrl,
    sourceUrlToOutputUrl: sourceUrlToOutputUrl
};
