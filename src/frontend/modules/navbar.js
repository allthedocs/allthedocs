//
// # [T3 Module] Navigation Bar
//

var TYPE_FILES_TOGGLER = "filesToggler";
var TYPE_TOC_TOGGLER = "tableOfContentsToggler";

var TOGGLER_MESSAGES = {};

TOGGLER_MESSAGES[TYPE_FILES_TOGGLER] = "toggleFiles";
TOGGLER_MESSAGES[TYPE_TOC_TOGGLER] = "toggleTableOfContents";

function create(context) {
    
    function init() {
        console.log("Initializing module 'navbar'...");
    }
    
    function destroy() {
        // ...
    }
    
    function handleClick(event, element, type) {
        
        console.log("Clicked on type:", type);
        
        if (TOGGLER_MESSAGES[type]) {
            context.broadcast(TOGGLER_MESSAGES[type]);
        }
    }
    
    return {
        
        onclick: handleClick,
        
        init: init,
        destroy: destroy
    };
}

module.exports = create;
