//
// # [function] buildNavigation
//

var fs = require("fs");
var assert = require("assert");
var format = require("vrep").format;
var normalize = require("path").normalize;

var urlHelper = require("./utils/urls");

var NAV_FILE = "navigation.html";
var NAV_ITEM_FILE = "navigation-item.html";
var NAV_LIST_FILE = "navigation-list.html";

function buildNavigation(data, templateDir) {
    
    var navTemplate, navItemTemplate, navListTemplate, items;
    
    var navFilePath = normalize(templateDir + "/" + NAV_FILE);
    var navItemFilePath = normalize(templateDir + "/" + NAV_ITEM_FILE);
    var navListFilePath = normalize(templateDir + "/" + NAV_LIST_FILE);
    
    [navFilePath, navItemFilePath, navListFilePath].forEach(function (path) {
        if (!fs.existsSync(path)) {
            throw new Error("Template file not found: " + path);
        }
    });
    
    navTemplate = "" + fs.readFileSync(navFilePath);
    navItemTemplate = "" + fs.readFileSync(navItemFilePath);
    navListTemplate = "" + fs.readFileSync(navListFilePath);
    
    items = Object.keys(data).map(function (key) {
        
        var item = data[key];
        var type = typeof item;
        
        assert(
            item && (type === "string" || type === "object"),
            "Navigation item must be an object or a non-empty string!"
        );
        
        if (typeof item === "object") {
            return buildNavList(item, key);
        }
        else {
            return format(navItemTemplate, {
                label: key,
                href: "{rootDir}" + prepareUrl(item)
            });
        }
    }).join("");
    
    return format(navTemplate, {
        items: items
    });
    
    function buildNavList(item, key) {
        
        var items = Object.keys(item).map(function (key) {
            
            var subItem = item[key];
            
            return format(navItemTemplate, {
                label: key,
                href: "{rootDir}" + prepareUrl(subItem)
            });
        }).join("");
        
        return format(navListTemplate, {
            label: key,
            items: items
        });
    }
}

function prepareUrl(url) {
    return urlHelper.isRelativeUrl(url) ? urlHelper.sourceUrlToOutputUrl(url) : url;
}

module.exports = buildNavigation;
