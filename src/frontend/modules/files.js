//
// # [T3 Module] File Explorer
//

var fade = require("domfx/fade");
var slide = require("domfx/slide");

var TYPE_TOC = "tableOfContents";
var TYPE_CLOSE = "closeButton";

function create(context) {
    
    var element, content, isOpen;
    
    function init() {
        
        console.log("Initializing module 'files'...");
        
        isOpen = false;
        element = context.getElement();
        content = element.querySelector(".content");
        
        fade.out(element, 0);
        slide.out(content, 0);
    }
    
    function destroy() {
        element = null;
    }
    
    function toggle() {
        
        console.log("Toggling files...");
        
        if (isOpen) {
            isOpen = false;
            slide.toggle(content, 200);
            setTimeout(fade.toggle.bind(fade, element, 200), 20);
        }
        else {
            isOpen = true;
            fade.toggle(element, 200);
            setTimeout(slide.toggle.bind(slide, content, 200), 20);
        }
    }
    
    function handleClick(event, target, type) {
        if (type === TYPE_TOC || type === TYPE_CLOSE) {
            toggle();
        }
    }
    
    return {
        
        messages: ["toggleFiles"],
        
        onmessage: {
            toggleFiles: toggle
        },
        
        onclick: handleClick,
        
        init: init,
        destroy: destroy
    };
}

module.exports = create;
